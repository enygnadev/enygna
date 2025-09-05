import { NextRequest, NextResponse } from 'next/server';

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/planos',
  '/sistemas',
  '/contato',
  '/sobre',
  '/privacy',
  '/status',
  '/meu-plano',
];

// Rotas que começam com estes prefixos são públicas
const PUBLIC_PREFIXES = [
  '/privacy/',
  '/_next/',
  '/api/public/',
  '/api/health/',
];

// Rotas /auth são públicas mas carregam conteúdo privado dinamicamente
const AUTH_ROUTES = [
  '/chamados/auth',
  '/crm/auth',
  '/documentos/auth',
  '/financeiro/auth',
  '/frota/auth',
  '/ponto/auth',
  '/admin/auth',
];

// Rotas que precisam de roles específicos
const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['adminmaster', 'superadmin', 'admin'],
  '/financeiro/auth/admin': ['adminmaster', 'superadmin', 'admin', 'gestor'],
  '/frota/auth/admin': ['adminmaster', 'superadmin', 'admin'],
  '/api/admin': ['adminmaster', 'superadmin', 'admin'],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Permitir recursos estáticos e arquivos
  if (pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Verificar se é rota pública por prefixo
  const isPublicPrefix = PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
  if (isPublicPrefix) {
    return NextResponse.next();
  }
  
  // Verificar se é rota pública exata
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Verificar se é rota /auth (públicas mas com conteúdo protegido)
  const isAuthRoute = AUTH_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  if (isAuthRoute) {
    return NextResponse.next();
  }
  
  // Para rotas protegidas, verificar cookie de sessão
  const sessionCookie = request.cookies.get('__Host-nextSession')?.value;
  
  if (!sessionCookie) {
    // Redirecionar para login se não houver sessão
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Sessão existe, permitir acesso
  // Validação real da sessão acontece no componente/API
  return NextResponse.next();
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};