import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Health check de segurança - runtime nodejs
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const timestamp = new Date().toISOString();
    
    // Verificações de segurança
    const securityChecks = {
      timestamp,
      checks: {
        // Verificar variáveis de ambiente críticas
        env: {
          firebase_configured: !!(
            process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
          ),
          has_private_keys: !!(
            process.env.FIREBASE_PRIVATE_KEY ||
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY
          ),
          node_env: process.env.NODE_ENV,
          node_version: process.version,
        },
        
        // Verificar cookies de segurança
        cookies: {
          has_session: request.cookies.has('__Host-nextSession'),
          has_csrf: request.cookies.has('__Host-csrf'),
          secure_cookies_supported: request.url.startsWith('https'),
        },
        
        // Verificar headers de segurança
        headers: {
          has_csp: headersList.has('content-security-policy'),
          has_hsts: headersList.has('strict-transport-security'),
          has_xfo: headersList.has('x-frame-options'),
          user_agent: headersList.get('user-agent')?.substring(0, 100),
        },
        
        // Status do sistema
        system: {
          memory_usage: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
        }
      }
    };
    
    // Registrar check no Firestore (auditoria)
    try {
      await addDoc(collection(db, 'Auditoria', 'HB', 'checks'), {
        ...securityChecks,
        serverTimestamp: serverTimestamp(),
        ip: headersList.get('x-forwarded-for')?.split(',')[0] || 
            headersList.get('x-real-ip') || 
            'unknown',
      });
    } catch (dbError) {
      console.error('Failed to log health check:', dbError);
      // Continuar mesmo se falhar o log
    }
    
    // Resposta simplificada (não expor detalhes em produção)
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        status: 'healthy',
        timestamp,
        version: '1.0.0'
      });
    }
    
    // Em desenvolvimento, retornar detalhes
    return NextResponse.json({
      status: 'healthy',
      ...securityChecks
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    // Retornar erro genérico
    return NextResponse.json(
      { 
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check para monitoramento (método HEAD)
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Health-Status': 'ok',
      'X-Health-Timestamp': new Date().toISOString(),
    },
  });
}