
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  registration: string;
  department: string;
  position: string;
  workDays: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  absences: number;
  delays: number;
  earlyDepartures: number;
  totalEarnings: number;
  overtimeEarnings: number;
  nightEarnings: number;
  holidayEarnings: number;
  deductions: number;
  netEarnings: number;
}

interface Props {
  companyId: string;
  month: string; // YYYY-MM
}

export default function PayrollExporter({ companyId, month }: Props) {
  const [exporting, setExporting] = useState(false);
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const generatePayrollData = async () => {
    setExporting(true);
    
    try {
      const monthStart = startOfMonth(parseISO(`${month}-01`));
      const monthEnd = endOfMonth(monthStart);
      
      // Buscar colaboradores da empresa
      const employeesSnap = await getDocs(
        query(collection(db, 'users'), where('companyId', '==', companyId))
      );

      const payrollEntries: PayrollEntry[] = [];

      for (const employeeDoc of employeesSnap.docs) {
        const employee = employeeDoc.data();
        const employeeId = employeeDoc.id;

        // Buscar sessões do mês
        const sessionsSnap = await getDocs(
          query(
            collection(db, 'users', employeeId, 'sessions'),
            where('start', '>=', monthStart.toISOString()),
            where('start', '<=', monthEnd.toISOString()),
            where('status', '==', 'approved'),
            orderBy('start', 'asc')
          )
        );

        const sessions = sessionsSnap.docs.map(doc => doc.data());
        
        // Calcular métricas
        const payrollEntry = calculatePayrollMetrics(employee, sessions, monthStart, monthEnd);
        payrollEntries.push(payrollEntry);
      }

      setPayrollData(payrollEntries);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Erro ao gerar dados da folha:', error);
      alert('Erro ao gerar dados da folha de pagamento.');
    } finally {
      setExporting(false);
    }
  };

  const calculatePayrollMetrics = (employee: any, sessions: any[], monthStart: Date, monthEnd: Date): PayrollEntry => {
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let nightHours = 0;
    let holidayHours = 0;
    let totalEarnings = 0;
    let workDays = 0;
    let absences = 0;
    let delays = 0;
    let earlyDepartures = 0;

    const hourlyRate = employee.effectiveHourlyRate || employee.hourlyRate || 0;
    const dailyHours = employee.dailyHours || 8;
    const nightRate = hourlyRate * 1.2; // 20% adicional noturno
    const overtimeRate = hourlyRate * 1.5; // 50% adicional extra
    const holidayRate = hourlyRate * 2; // 100% adicional feriado

    // Agrupar sessões por dia
    const sessionsByDay = new Map<string, any[]>();
    
    sessions.forEach(session => {
      const date = format(parseISO(session.start), 'yyyy-MM-dd');
      if (!sessionsByDay.has(date)) {
        sessionsByDay.set(date, []);
      }
      sessionsByDay.get(date)!.push(session);
    });

    // Calcular dias úteis do mês
    const businessDays = getBusinessDays(monthStart, monthEnd);
    
    // Analisar cada dia
    sessionsByDay.forEach((daySessions, date) => {
      workDays++;
      
      const dayTotalSeconds = daySessions.reduce((sum, session) => 
        sum + (session.durationSec || 0), 0
      );
      
      const dayHours = dayTotalSeconds / 3600;
      totalHours += dayHours;
      
      // Verificar se é feriado
      const isHoliday = checkIfHoliday(parseISO(date));
      
      if (isHoliday) {
        holidayHours += dayHours;
        totalEarnings += dayHours * holidayRate;
      } else {
        // Horas regulares vs extras
        if (dayHours <= dailyHours) {
          regularHours += dayHours;
          totalEarnings += dayHours * hourlyRate;
        } else {
          regularHours += dailyHours;
          const extraHours = dayHours - dailyHours;
          overtimeHours += extraHours;
          totalEarnings += (dailyHours * hourlyRate) + (extraHours * overtimeRate);
        }
      }

      // Verificar horário noturno (22h às 6h)
      daySessions.forEach(session => {
        const nightHoursInSession = calculateNightHours(session);
        if (nightHoursInSession > 0) {
          nightHours += nightHoursInSession;
          totalEarnings += nightHoursInSession * (nightRate - hourlyRate); // Adicional noturno
        }
      });

      // Verificar atrasos e saídas antecipadas
      const firstSession = daySessions[0];
      const lastSession = daySessions[daySessions.length - 1];
      
      if (isLateArrival(firstSession, employee.workSchedule)) {
        delays++;
      }
      
      if (isEarlyDeparture(lastSession, employee.workSchedule)) {
        earlyDepartures++;
      }
    });

    // Calcular ausências
    absences = businessDays - workDays;

    // Calcular deduções (faltas, atrasos, etc.)
    const deductions = calculateDeductions(absences, delays, earlyDepartures, hourlyRate, dailyHours);

    return {
      employeeId: employee.uid,
      employeeName: employee.displayName || employee.email,
      employeeEmail: employee.email,
      registration: employee.registration || employee.uid.substring(0, 8),
      department: employee.department || 'Não informado',
      position: employee.position || 'Não informado',
      workDays,
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      nightHours: Math.round(nightHours * 100) / 100,
      holidayHours: Math.round(holidayHours * 100) / 100,
      absences,
      delays,
      earlyDepartures,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      overtimeEarnings: Math.round(overtimeHours * overtimeRate * 100) / 100,
      nightEarnings: Math.round(nightHours * (nightRate - hourlyRate) * 100) / 100,
      holidayEarnings: Math.round(holidayHours * holidayRate * 100) / 100,
      deductions: Math.round(deductions * 100) / 100,
      netEarnings: Math.round((totalEarnings - deductions) * 100) / 100,
    };
  };

  const getBusinessDays = (start: Date, end: Date): number => {
    let days = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const checkIfHoliday = (date: Date): boolean => {
    // Implementar verificação de feriados
    // Por simplicidade, retornando false
    return false;
  };

  const calculateNightHours = (session: any): number => {
    // Implementar cálculo de horas noturnas
    // Por simplicidade, retornando 0
    return 0;
  };

  const isLateArrival = (session: any, workSchedule: any): boolean => {
    // Implementar verificação de atraso
    return false;
  };

  const isEarlyDeparture = (session: any, workSchedule: any): boolean => {
    // Implementar verificação de saída antecipada
    return false;
  };

  const calculateDeductions = (absences: number, delays: number, earlyDepartures: number, hourlyRate: number, dailyHours: number): number => {
    const absenceDeduction = absences * hourlyRate * dailyHours;
    const delayDeduction = delays * (hourlyRate * 0.5); // 30 min por atraso
    const earlyDepartureDeduction = earlyDepartures * (hourlyRate * 0.5);
    
    return absenceDeduction + delayDeduction + earlyDepartureDeduction;
  };

  const exportToCSV = (format: 'contmatic' | 'dominio' | 'folhamatic' | 'generic') => {
    if (payrollData.length === 0) return;

    let csvContent = '';
    
    switch (format) {
      case 'contmatic':
        csvContent = generateContmaticCSV();
        break;
      case 'dominio':
        csvContent = generateDominioCSV();
        break;
      case 'folhamatic':
        csvContent = generateFolhamaticCSV();
        break;
      default:
        csvContent = generateGenericCSV();
    }

    downloadCSV(csvContent, `folha_pagamento_${month}_${format}.csv`);
  };

  const generateContmaticCSV = (): string => {
    const header = [
      'Matricula', 'Nome', 'Dias_Trabalhados', 'Horas_Regulares', 'Horas_Extras_50',
      'Horas_Noturnas', 'Horas_Feriados', 'Faltas', 'Atrasos', 'Saidas_Antecipadas',
      'Valor_Bruto', 'Descontos', 'Valor_Liquido'
    ].join(';');

    const rows = payrollData.map(entry => [
      entry.registration,
      entry.employeeName,
      entry.workDays,
      entry.regularHours.toFixed(2).replace('.', ','),
      entry.overtimeHours.toFixed(2).replace('.', ','),
      entry.nightHours.toFixed(2).replace('.', ','),
      entry.holidayHours.toFixed(2).replace('.', ','),
      entry.absences,
      entry.delays,
      entry.earlyDepartures,
      entry.totalEarnings.toFixed(2).replace('.', ','),
      entry.deductions.toFixed(2).replace('.', ','),
      entry.netEarnings.toFixed(2).replace('.', ',')
    ].join(';')).join('\n');

    return `${header}\n${rows}`;
  };

  const generateDominioCSV = (): string => {
    const header = [
      'COD_FUNC', 'NOME_FUNC', 'DIAS_TRAB', 'HORAS_NORM', 'HORAS_EXT1',
      'HORAS_NOT', 'HORAS_FER', 'QTD_FALTAS', 'QTD_ATRASOS', 'VALOR_TOTAL'
    ].join('|');

    const rows = payrollData.map(entry => [
      entry.registration,
      entry.employeeName,
      entry.workDays.toString().padStart(2, '0'),
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      entry.nightHours.toFixed(2),
      entry.holidayHours.toFixed(2),
      entry.absences.toString().padStart(2, '0'),
      entry.delays.toString().padStart(2, '0'),
      entry.netEarnings.toFixed(2)
    ].join('|')).join('\n');

    return `${header}\n${rows}`;
  };

  const generateFolhamaticCSV = (): string => {
    // Formato específico do Folhamatic
    const rows = payrollData.map(entry => [
      '01', // Tipo de registro
      entry.registration.padStart(8, '0'),
      entry.employeeName.substring(0, 30).padEnd(30, ' '),
      entry.regularHours.toFixed(2).replace('.', '').padStart(6, '0'),
      entry.overtimeHours.toFixed(2).replace('.', '').padStart(6, '0'),
      entry.absences.toString().padStart(2, '0'),
      entry.delays.toString().padStart(3, '0'),
      entry.totalEarnings.toFixed(2).replace('.', '').padStart(10, '0')
    ].join('')).join('\n');

    return rows;
  };

  const generateGenericCSV = (): string => {
    const header = [
      'Matricula', 'Nome', 'Email', 'Departamento', 'Cargo', 'Dias_Trabalhados',
      'Total_Horas', 'Horas_Regulares', 'Horas_Extras', 'Horas_Noturnas', 'Horas_Feriados',
      'Ausencias', 'Atrasos', 'Saidas_Antecipadas', 'Ganhos_Totais', 'Ganhos_Extras',
      'Ganhos_Noturnos', 'Ganhos_Feriados', 'Descontos', 'Liquido'
    ].join(',');

    const rows = payrollData.map(entry => [
      entry.registration,
      `"${entry.employeeName}"`,
      entry.employeeEmail,
      `"${entry.department}"`,
      `"${entry.position}"`,
      entry.workDays,
      entry.totalHours.toFixed(2),
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      entry.nightHours.toFixed(2),
      entry.holidayHours.toFixed(2),
      entry.absences,
      entry.delays,
      entry.earlyDepartures,
      entry.totalEarnings.toFixed(2),
      entry.overtimeEarnings.toFixed(2),
      entry.nightEarnings.toFixed(2),
      entry.holidayEarnings.toFixed(2),
      entry.deductions.toFixed(2),
      entry.netEarnings.toFixed(2)
    ].join(',')).join('\n');

    return `${header}\n${rows}`;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
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
        💰 Exportação para Folha de Pagamento
      </h3>

      <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
        Mês de referência: <strong>{format(parseISO(`${month}-01`), 'MMMM/yyyy')}</strong>
      </p>

      {!showPreview ? (
        <button
          onClick={generatePayrollData}
          disabled={exporting}
          style={{
            padding: '1rem 2rem',
            background: exporting ? '#6b7280' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {exporting ? '⏳ Processando...' : '📊 Gerar Dados da Folha'}
        </button>
      ) : (
        <div>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6ee7b7' }}>
              ✅ Dados Processados ({payrollData.length} colaboradores)
            </h4>
            
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              <p>Total de horas: {payrollData.reduce((sum, entry) => sum + entry.totalHours, 0).toFixed(2)}h</p>
              <p>Total líquido: R$ {payrollData.reduce((sum, entry) => sum + entry.netEarnings, 0).toFixed(2)}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>📁 Formatos de Exportação:</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <button
                onClick={() => exportToCSV('contmatic')}
                style={{
                  padding: '1rem',
                  background: 'rgba(59, 130, 246, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                📊 Contmatic
              </button>
              
              <button
                onClick={() => exportToCSV('dominio')}
                style={{
                  padding: '1rem',
                  background: 'rgba(147, 51, 234, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🏢 Domínio
              </button>
              
              <button
                onClick={() => exportToCSV('folhamatic')}
                style={{
                  padding: '1rem',
                  background: 'rgba(245, 158, 11, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                📋 Folhamatic
              </button>
              
              <button
                onClick={() => exportToCSV('generic')}
                style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                📄 Genérico
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setShowPreview(false);
              setPayrollData([]);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Gerar Novamente
          </button>
        </div>
      )}
    </div>
  );
}
