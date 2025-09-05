import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/ratelimit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Honeypot - Endpoint falso para admin antigo
// Invasores frequentemente procuram por endpoints antigos/backup

export async function GET(request: NextRequest) {
  await logHoneypotAccess(request, 'GET');
  
  // Retornar HTML falso de login admin
  const fakeHTML = `
    <!DOCTYPE html>
    <html>
    <head><title>Admin Login</title></head>
    <body>
      <h1>System Maintenance</h1>
      <p>This page has been moved. Please contact your system administrator.</p>
    </body>
    </html>
  `;
  
  return new NextResponse(fakeHTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function POST(request: NextRequest) {
  await logHoneypotAccess(request, 'POST');
  
  // Delay para simular processamento (frustra bots)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return NextResponse.json(
    { error: 'Invalid credentials' },
    { status: 401 }
  );
}

async function logHoneypotAccess(request: NextRequest, method: string) {
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Tentar extrair dados do POST (se houver)
    let attemptedCredentials = null;
    if (method === 'POST') {
      try {
        const body = await request.text();
        attemptedCredentials = body.substring(0, 200); // Limitar para não armazenar muito
      } catch {}
    }
    
    await addDoc(collection(db, 'Auditoria', 'Honeypot', 'AdminTrap'), {
      timestamp: serverTimestamp(),
      ip,
      method,
      path: request.url,
      userAgent,
      attemptedCredentials,
      alert: true,
      severity: 'critical', // Admin honeypot é mais crítico
    });
    
    console.error(`🚨 CRITICAL: Admin honeypot accessed from ${ip}`);
    
  } catch (error) {
    console.error('Admin honeypot logging failed:', error);
  }
}