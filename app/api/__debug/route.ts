import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/ratelimit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Honeypot - Endpoint falso para detectar tentativas de invasão
// Qualquer acesso aqui é suspeito

export async function GET(request: NextRequest) {
  await logHoneypotAccess(request, 'GET');
  
  // Retornar resposta falsa mas crível
  return NextResponse.json(
    { 
      debug: false,
      environment: 'production',
      version: '1.0.0'
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  await logHoneypotAccess(request, 'POST');
  
  return NextResponse.json(
    { error: 'Not found' },
    { status: 404 }
  );
}

// Registrar acesso suspeito
async function logHoneypotAccess(request: NextRequest, method: string) {
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    
    // Registrar no Firestore
    await addDoc(collection(db, 'Auditoria', 'Honeypot', 'Hits'), {
      timestamp: serverTimestamp(),
      ip,
      method,
      path: request.url,
      userAgent,
      referer,
      origin,
      headers: Object.fromEntries(request.headers.entries()),
      alert: true, // Marcar para alertas
      severity: 'high',
    });
    
    // Em produção, você pode:
    // 1. Enviar alerta por email/SMS
    // 2. Adicionar IP à blocklist temporária
    // 3. Aumentar rate limiting para este IP
    
    console.warn(`⚠️ HONEYPOT HIT: ${method} from ${ip}`);
    
  } catch (error) {
    // Não falhar silenciosamente, mas não expor erro
    console.error('Honeypot logging failed:', error);
  }
}