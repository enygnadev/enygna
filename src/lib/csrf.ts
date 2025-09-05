import crypto from 'crypto';

// Gerar token CSRF
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validar token CSRF
export function validateCSRFToken(token: string | null, storedToken: string | null): boolean {
  if (!token || !storedToken) {
    return false;
  }
  
  // Comparação segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(storedToken)
  );
}

// Helper para criar e validar CSRF em cookies
export const csrfConfig = {
  cookieName: '__Host-csrf',
  headerName: 'x-csrf-token',
  
  // Opções do cookie CSRF
  cookieOptions: {
    httpOnly: true,
    secure: true, // Sempre HTTPS em produção
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 24 * 60 * 60, // 24 horas
  }
};