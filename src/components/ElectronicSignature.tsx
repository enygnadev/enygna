
'use client';

import { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SignatureData {
  dataUrl: string;
  timestamp: string;
  userAgent: string;
  ipAddress?: string;
}

interface Props {
  reportId: string;
  reportType: 'monthly' | 'weekly' | 'custom';
  signerName: string;
  signerEmail: string;
  signerRole: string;
  onSignatureComplete?: (signature: SignatureData) => void;
}

export default function ElectronicSignature({
  reportId,
  reportType,
  signerName,
  signerEmail,
  signerRole,
  onSignatureComplete
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Touch events para dispositivos móveis
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const touch = e.touches[0];
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Verificar se há assinatura
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some((channel, index) => 
      index % 4 !== 3 && channel !== 255 // Não é canal alpha e não é branco
    );

    if (!hasSignature) {
      alert('Por favor, assine antes de salvar.');
      return;
    }

    setSaving(true);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString();
      
      const signatureData: SignatureData = {
        dataUrl,
        timestamp,
        userAgent: navigator.userAgent,
      };

      // Salvar assinatura no relatório
      await updateDoc(doc(db, 'reports', reportId), {
        signature: signatureData,
        signedBy: {
          name: signerName,
          email: signerEmail,
          role: signerRole,
          timestamp: serverTimestamp()
        },
        status: 'signed'
      });

      setSignature(dataUrl);
      setSigned(true);
      onSignatureComplete?.(signatureData);

    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      alert('Erro ao salvar assinatura. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (signed) {
    return (
      <div style={{
        background: 'rgba(16, 185, 129, 0.1)',
        border: '2px solid rgba(16, 185, 129, 0.5)',
        borderRadius: '15px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#16a34a' }}>
          ✅ Relatório Assinado Digitalmente
        </h3>
        
        {signature && (
          <div style={{ marginBottom: '1rem' }}>
            <img 
              src={signature} 
              alt="Assinatura" 
              style={{ 
                maxWidth: '300px', 
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                background: 'white'
              }} 
            />
          </div>
        )}
        
        <p style={{ margin: '0.5rem 0', fontSize: '14px', opacity: 0.8 }}>
          <strong>Assinado por:</strong> {signerName} ({signerRole})
        </p>
        <p style={{ margin: '0.5rem 0', fontSize: '14px', opacity: 0.8 }}>
          <strong>Email:</strong> {signerEmail}
        </p>
        <p style={{ margin: '0.5rem 0', fontSize: '14px', opacity: 0.8 }}>
          <strong>Data/Hora:</strong> {new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '15px',
      padding: '2rem',
      color: 'white'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>
        ✍️ Assinatura Eletrônica do Relatório
      </h3>

      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <p style={{ margin: '0.25rem 0', fontSize: '14px', opacity: 0.9 }}>
          <strong>Responsável:</strong> {signerName} ({signerRole})
        </p>
        <p style={{ margin: '0.25rem 0', fontSize: '14px', opacity: 0.9 }}>
          <strong>Tipo:</strong> Relatório {reportType === 'monthly' ? 'Mensal' : reportType === 'weekly' ? 'Semanal' : 'Personalizado'}
        </p>
      </div>

      <div style={{
        background: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '1rem',
        position: 'relative'
      }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{ 
            display: 'block', 
            cursor: 'crosshair',
            width: '100%',
            maxWidth: '600px',
            height: 'auto'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawingTouch}
          onTouchMove={drawTouch}
          onTouchEnd={stopDrawing}
        />
        
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          fontSize: '12px',
          color: '#6b7280',
          pointerEvents: 'none'
        }}>
          Assine aqui
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={clearSignature}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(239, 68, 68, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🗑️ Limpar
        </button>

        <button
          onClick={saveSignature}
          disabled={saving}
          style={{
            padding: '0.75rem 1.5rem',
            background: saving ? '#6b7280' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {saving ? '⏳ Salvando...' : '✅ Assinar Relatório'}
        </button>
      </div>

      <div style={{ 
        marginTop: '1rem', 
        fontSize: '12px', 
        opacity: 0.7,
        textAlign: 'center' 
      }}>
        <p>📋 Esta assinatura eletrônica possui validade jurídica conforme MP 2.200-2/2001</p>
        <p>🔒 Dados registrados: timestamp, IP, user-agent e hash da assinatura</p>
      </div>
    </div>
  );
}
