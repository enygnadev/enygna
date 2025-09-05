import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import admin, { createSessionCookie, verifySessionCookie } from '@/lib/firebaseAdmin';
import { rateLimit } from '@/lib/ratelimit';
import { generateCSRFToken, validateCSRFToken, csrfConfig } from '@/lib/csrf';

// Cookie de sessão seguro
const SESSION_COOKIE_NAME = '__Host-nextSession';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 dias
};

// POST - Criar sessão (login)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 tentativas por minuto por IP
    const rateLimitResult = await rateLimit('session:create', request, {
      limit: 5,
      window: 60,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Validar CSRF token
    const csrfToken = request.headers.get(csrfConfig.headerName);
    const cookieStore = await cookies();
    const storedCsrfToken = cookieStore.get(csrfConfig.cookieName)?.value;

    if (!validateCSRFToken(csrfToken, storedCsrfToken || null)) {
      // Em produção, rejeitar. Em dev, apenas avisar
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
      console.warn('CSRF validation failed - allowing in development');
    }

    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    try {
      // Criar cookie de sessão
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 dias
      const sessionCookie = await createSessionCookie(idToken, expiresIn);

      // Definir cookie de sessão
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, SESSION_COOKIE_OPTIONS);

      // Gerar novo token CSRF para próximas requisições
      const newCsrfToken = generateCSRFToken();
      cookieStore.set(csrfConfig.cookieName, newCsrfToken, csrfConfig.cookieOptions);

      return NextResponse.json({
        success: true,
        message: 'Session created successfully',
        csrfToken: newCsrfToken,
      });

    } catch (error: any) {
      console.error('Failed to create session cookie:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Verificar sessão atual
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const decodedClaims = await verifySessionCookie(sessionCookie);

    if (!decodedClaims) {
      // Cookie inválido ou expirado
      cookieStore.delete(SESSION_COOKIE_NAME);
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Retornar informações da sessão (sem expor dados sensíveis)
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        emailVerified: decodedClaims.email_verified,
        role: decodedClaims.role || 'colaborador',
        empresaId: decodedClaims.empresaId,
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Encerrar sessão (logout)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Limpar cookie de sessão
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });

    // Limpar cookie CSRF
    cookieStore.set(csrfConfig.cookieName, '', {
      ...csrfConfig.cookieOptions,
      maxAge: 0,
    });

    // Opcionalmente, revogar tokens no Firebase
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      try {
        const decodedClaims = await verifySessionCookie(sessionCookie);
        if (decodedClaims) {
          // Revogar refresh tokens do usuário
          await admin.auth().revokeRefreshTokens(decodedClaims.uid);
        }
      } catch (error) {
        // Ignorar erros na revogação
        console.error('Failed to revoke tokens:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS - Para CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-csrf-token',
    },
  });
}