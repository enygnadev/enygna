import { auth } from './firebase';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Rate limiting storage
const rateLimitStore = new Map<string, number[]>();

// Validação básica de entrada
export function validateUserInput(input: string, type: 'email' | 'text' | 'number'): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Verificações básicas
  if (!input || input.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Campo obrigatório');
    return result;
  }

  // Sanitização básica
  const sanitized = input.trim();

  // Verificar comprimento máximo
  if (sanitized.length > 1000) {
    result.isValid = false;
    result.errors.push('Entrada muito longa');
    return result;
  }

  // Verificar caracteres maliciosos
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi,
    /import\s*\(/gi,
    /eval\s*\(/gi
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(sanitized)) {
      result.isValid = false;
      result.errors.push('Entrada contém caracteres não permitidos');
      return result;
    }
  }

  // Validações específicas por tipo
  switch (type) {
    case 'email':
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(sanitized) || sanitized.length > 254) {
        result.isValid = false;
        result.errors.push('Formato de email inválido');
      }
      break;

    case 'number':
      if (isNaN(Number(sanitized)) || !isFinite(Number(sanitized))) {
        result.isValid = false;
        result.errors.push('Deve ser um número válido');
      }
      break;

    case 'text':
      // Verificar SQL injection patterns
      const sqlPatterns = [
        /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b)/gi,
        /(\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/gi,
        /(';|'--|\bor\b\s+'1'\s*=\s*'1')/gi
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(sanitized)) {
          result.warnings.push('Entrada pode conter padrões suspeitos');
          break;
        }
      }
      break;
  }

  return result;
}

// Rate limiting function
export function checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const attempts = rateLimitStore.get(key) || [];

  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return false; // Rate limited
  }

  // Record this attempt
  recentAttempts.push(now);
  rateLimitStore.set(key, recentAttempts);

  return true; // Not rate limited
}

// Sanitize HTML content
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Validate file uploads
export function validateFileUpload(file: File): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check file size (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    result.isValid = false;
    result.errors.push('Arquivo muito grande (máximo 50MB)');
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    result.isValid = false;
    result.errors.push('Tipo de arquivo não permitido');
  }

  // Check for double extensions
  if (file.name.split('.').length > 2) {
    result.warnings.push('Arquivo com múltiplas extensões detectado');
  }

  return result;
}

// Validate passwords
export function validatePassword(password: string): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (password.length < 8) {
    result.isValid = false;
    result.errors.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    result.isValid = false;
    result.errors.push('Senha deve conter pelo menos um número');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    result.warnings.push('Senha seria mais segura com caracteres especiais');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (weakPasswords.includes(password.toLowerCase())) {
    result.isValid = false;
    result.errors.push('Senha muito comum e insegura');
  }

  return result;
}

export function validateEmpresaAccess(userEmpresaId: string, targetEmpresaId: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return userEmpresaId === targetEmpresaId;
}