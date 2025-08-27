
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { parse } from 'papaparse';

interface ScheduleEntry {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  department?: string;
  position?: string;
}

interface Props {
  companyId: string;
  onImportComplete?: (results: { success: number; errors: string[] }) => void;
}

export default function ScheduleImporter({ companyId, onImportComplete }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ScheduleEntry[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setErrors(['Por favor, selecione um arquivo CSV.']);
      return;
    }

    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const scheduleData = validateAndParseCSV(results.data);
          setPreview(scheduleData);
          setShowPreview(true);
          setErrors([]);
        } catch (error) {
          setErrors([error instanceof Error ? error.message : 'Erro ao processar arquivo']);
        }
      },
      error: (error) => {
        setErrors([`Erro ao ler arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
      }
    });
  };

  const validateAndParseCSV = (data: any[]): ScheduleEntry[] => {
    const requiredFields = ['email', 'nome', 'data', 'entrada', 'saida'];
    const scheduleEntries: ScheduleEntry[] = [];
    const validationErrors: string[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque começamos do 0 e tem header
      
      // Verificar campos obrigatórios
      const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
      if (missingFields.length > 0) {
        validationErrors.push(`Linha ${rowNumber}: Campos obrigatórios faltando: ${missingFields.join(', ')}`);
        return;
      }

      // Validar formato da data
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(row.data)) {
        validationErrors.push(`Linha ${rowNumber}: Data deve estar no formato DD/MM/AAAA`);
        return;
      }

      // Validar formato dos horários
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(row.entrada) || !timeRegex.test(row.saida)) {
        validationErrors.push(`Linha ${rowNumber}: Horários devem estar no formato HH:MM`);
        return;
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        validationErrors.push(`Linha ${rowNumber}: Email inválido`);
        return;
      }

      // Converter data para formato ISO
      const [day, month, year] = row.data.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      scheduleEntries.push({
        employeeId: '', // Será preenchido na importação
        employeeEmail: row.email.trim().toLowerCase(),
        employeeName: row.nome.trim(),
        date: isoDate,
        startTime: row.entrada.trim(),
        endTime: row.saida.trim(),
        breakDuration: row.intervalo ? parseInt(row.intervalo) : undefined,
        department: row.departamento?.trim(),
        position: row.cargo?.trim(),
      });
    });

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('\n'));
    }

    return scheduleEntries;
  };

  const importSchedule = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    const batch = writeBatch(db);
    const importErrors: string[] = [];
    let successCount = 0;

    try {
      // Buscar IDs dos colaboradores por email
      const employeeMap = new Map<string, string>();
      
      for (const entry of preview) {
        if (!employeeMap.has(entry.employeeEmail)) {
          // Aqui você buscaria o UID do usuário pelo email
          // Por simplicidade, vamos usar o email como ID temporário
          employeeMap.set(entry.employeeEmail, entry.employeeEmail);
        }
      }

      // Importar cada entrada da escala
      for (const entry of preview) {
        try {
          const employeeId = employeeMap.get(entry.employeeEmail);
          if (!employeeId) {
            importErrors.push(`Colaborador não encontrado: ${entry.employeeEmail}`);
            continue;
          }

          const scheduleId = `${employeeId}_${entry.date}`;
          const scheduleRef = doc(db, 'companies', companyId, 'schedules', scheduleId);

          batch.set(scheduleRef, {
            employeeId,
            employeeEmail: entry.employeeEmail,
            employeeName: entry.employeeName,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            breakDuration: entry.breakDuration || 0,
            department: entry.department || '',
            position: entry.position || '',
            companyId,
            createdAt: new Date().toISOString(),
            importedAt: new Date().toISOString(),
            status: 'active'
          });

          successCount++;
        } catch (error) {
          importErrors.push(`Erro na linha ${entry.employeeName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      await batch.commit();

      onImportComplete?.({
        success: successCount,
        errors: importErrors
      });

      setShowPreview(false);
      setPreview([]);
      
    } catch (error) {
      importErrors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      onImportComplete?.({
        success: successCount,
        errors: importErrors
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['email', 'nome', 'data', 'entrada', 'saida', 'intervalo', 'departamento', 'cargo'],
      ['joao@empresa.com', 'João Silva', '01/12/2024', '08:00', '17:00', '60', 'TI', 'Desenvolvedor'],
      ['maria@empresa.com', 'Maria Santos', '01/12/2024', '09:00', '18:00', '60', 'RH', 'Analista'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modelo_escala.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.1)', 
      backdropFilter: 'blur(20px)', 
      padding: '2rem', 
      borderRadius: '20px', 
      border: '1px solid rgba(255,255,255,0.2)',
      color: 'white' 
    }}>
      <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📅 Importar Escala via CSV
      </h3>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={downloadTemplate}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(59, 130, 246, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📥 Baixar Modelo CSV
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{
            padding: '0.5rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            width: '100%'
          }}
        />
      </div>

      {errors.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#fca5a5' }}>❌ Erros encontrados:</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {errors.map((error, index) => (
              <li key={index} style={{ color: '#fca5a5', fontSize: '14px' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {showPreview && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#6ee7b7' }}>
            ✅ Prévia da Importação ({preview.length} registros)
          </h4>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    Nome
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    Email
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    Data
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    Horário
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((entry, index) => (
                  <tr key={index}>
                    <td style={{ padding: '0.5rem' }}>{entry.employeeName}</td>
                    <td style={{ padding: '0.5rem' }}>{entry.employeeEmail}</td>
                    <td style={{ padding: '0.5rem' }}>{entry.date}</td>
                    <td style={{ padding: '0.5rem' }}>{entry.startTime} - {entry.endTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p style={{ textAlign: 'center', margin: '0.5rem 0', fontSize: '12px', opacity: 0.7 }}>
                ... e mais {preview.length - 10} registros
              </p>
            )}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={importSchedule}
              disabled={importing}
              style={{
                padding: '0.5rem 1rem',
                background: importing ? '#6b7280' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: importing ? 'not-allowed' : 'pointer'
              }}
            >
              {importing ? '⏳ Importando...' : '✅ Confirmar Importação'}
            </button>
            
            <button
              onClick={() => {
                setShowPreview(false);
                setPreview([]);
              }}
              disabled={importing}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        <p><strong>Formato do CSV:</strong></p>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>Campos obrigatórios: email, nome, data, entrada, saida</li>
          <li>Data no formato: DD/MM/AAAA</li>
          <li>Horários no formato: HH:MM</li>
          <li>Intervalo em minutos (opcional)</li>
        </ul>
      </div>
    </div>
  );
}
