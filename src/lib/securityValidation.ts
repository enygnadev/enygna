
import { auth } from './firebase';
import { SecurityLogger, InputSanitizer } from './advancedSecurity';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: string;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// Advanced threat detection patterns
const THREAT_PATTERNS = {
  critical: [
    /\x00/, // Null bytes
    /<script[^>]*>.*?<\/script>/gis, // Script tags
    /javascript:/gi, // JavaScript protocol
    /data:text\/html/gi, // HTML data URIs
    /vbscript:/gi, // VBScript protocol
    /on\w+\s*=/gi, // Event handlers
  ],
  high: [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/gi, // SQL injection
    /(\bEXEC\b|\bEXECUTE\b|\bSP_\w+)/gi, // SQL execution
    /<iframe[^>]*>/gi, // Iframes
    /<object[^>]*>/gi, // Objects
    /<embed[^>]*>/gi, // Embeds
    /expression\s*\(/gi, // CSS expressions
  ],
  medium: [
    /(\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/gi, // SQL logic
    /<link[^>]*>/gi, // Link tags
    /<meta[^>]*>/gi, // Meta tags
    /import\s*\(/gi, // Dynamic imports
    /eval\s*\(/gi, // Eval functions
  ],
  low: [
    /\.\./g, // Path traversal
    /%2e%2e/gi, // Encoded path traversal
    /%00/g, // Encoded null
    /<!--.*?-->/gs, // HTML comments
  ]
};

// Rate limiting with exponential backoff
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  backoffUntil: number;
}

// Enhanced input validation with threat detection
export function validateUserInput(
  input: string, 
  type: 'email' | 'text' | 'number' | 'url' | 'filename' | 'sql' | 'html',
  options: ValidationOptions = {}
): SecurityValidationResult {
  
  const result: SecurityValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    threatLevel: 'none'
  };

  // Basic validation
  if (!input || typeof input !== 'string') {
    result.isValid = false;
    result.errors.push('Campo obrigatório');
    return result;
  }

  const maxLength = options.maxLength || 1000;
  if (input.length > maxLength) {
    result.isValid = false;
    result.errors.push(`Entrada muito longa (máximo ${maxLength} caracteres)`);
    return result;
  }

  // Threat level assessment
  result.threatLevel = assessThreatLevel(input);
  
  if (result.threatLevel === 'critical') {
    result.isValid = false;
    result.errors.push('Entrada contém padrões maliciosos críticos');
    SecurityLogger.logEvent('CRITICAL_INPUT_THREAT', { input: input.substring(0, 100), type }, 'critical');
    return result;
  }

  if (result.threatLevel === 'high') {
    result.isValid = false;
    result.errors.push('Entrada contém padrões de ataque conhecidos');
    SecurityLogger.logEvent('HIGH_INPUT_THREAT', { input: input.substring(0, 100), type }, 'high');
    return result;
  }

  // Sanitize input
  result.sanitizedValue = InputSanitizer.sanitizeInput(input, type as any);

  // Type-specific validation
  switch (type) {
    case 'email':
      validateEmail(input, result);
      break;
    case 'url':
      validateURL(input, result);
      break;
    case 'filename':
      validateFilename(input, result);
      break;
    case 'number':
      validateNumber(input, result);
      break;
    case 'sql':
      validateSQLInput(input, result);
      break;
    case 'html':
      validateHTMLInput(input, result);
      break;
    default:
      validateTextInput(input, result);
  }

  // Additional security checks
  performAdvancedSecurityChecks(input, result);

  return result;
}

function assessThreatLevel(input: string): SecurityValidationResult['threatLevel'] {
  for (const [level, patterns] of Object.entries(THREAT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return level as SecurityValidationResult['threatLevel'];
      }
    }
  }
  return 'none';
}

function validateEmail(input: string, result: SecurityValidationResult): void {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(input) || input.length > 254) {
    result.isValid = false;
    result.errors.push('Formato de email inválido');
  }

  // Check for email injection
  if (input.includes('\n') || input.includes('\r') || input.includes('%0a') || input.includes('%0d')) {
    result.isValid = false;
    result.errors.push('Email contém caracteres de injeção');
    result.threatLevel = 'high';
  }

  // Check for disposable email domains
  const disposableDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
  const domain = input.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    result.warnings.push('Email temporário detectado');
  }
}

function validateURL(input: string, result: SecurityValidationResult): void {
  try {
    const url = new URL(input);
    
    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      result.isValid = false;
      result.errors.push('Apenas URLs HTTPS são permitidas');
    }

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
    if (dangerousProtocols.some(protocol => input.toLowerCase().includes(protocol))) {
      result.isValid = false;
      result.errors.push('Protocolo de URL não permitido');
      result.threatLevel = 'critical';
    }

    // Check for suspicious domains
    const suspiciousDomains = ['bit.ly', 'tinyurl.com', 't.co'];
    if (suspiciousDomains.includes(url.hostname)) {
      result.warnings.push('URL encurtada detectada');
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push('URL inválida');
  }
}

function validateFilename(input: string, result: SecurityValidationResult): void {
  // Block dangerous extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.pl', '.py', '.rb', '.sh'
  ];

  const lowerInput = input.toLowerCase();
  for (const ext of dangerousExtensions) {
    if (lowerInput.includes(ext)) {
      result.isValid = false;
      result.errors.push('Extensão de arquivo perigosa');
      result.threatLevel = 'high';
      break;
    }
  }

  // Check for path traversal
  if (input.includes('..') || input.includes('/') || input.includes('\\')) {
    result.isValid = false;
    result.errors.push('Nome de arquivo contém caracteres de travessia de diretório');
    result.threatLevel = 'high';
  }

  // Check for null bytes
  if (input.includes('\x00') || input.includes('%00')) {
    result.isValid = false;
    result.errors.push('Nome de arquivo contém bytes nulos');
    result.threatLevel = 'critical';
  }
}

function validateNumber(input: string, result: SecurityValidationResult): void {
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    result.isValid = false;
    result.errors.push('Deve ser um número válido');
  }

  // Check for potential overflow
  if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
    result.isValid = false;
    result.errors.push('Número fora do intervalo seguro');
  }
}

function validateSQLInput(input: string, result: SecurityValidationResult): void {
  // Comprehensive SQL injection detection
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bSELECT\b.*\bFROM\b)/gi,
    /(\bINSERT\b.*\bINTO\b)/gi,
    /(\bUPDATE\b.*\bSET\b)/gi,
    /(\bDELETE\b.*\bFROM\b)/gi,
    /(\bDROP\b.*\bTABLE\b)/gi,
    /(\bALTER\b.*\bTABLE\b)/gi,
    /(\bCREATE\b.*\bTABLE\b)/gi,
    /(';.*--)/gi,
    /(\bOR\b.*'1'.*=.*'1')/gi,
    /(\bAND\b.*'1'.*=.*'1')/gi,
    /(\bEXEC\b|\bEXECUTE\b)/gi,
    /(\bSP_\w+)/gi
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      result.isValid = false;
      result.errors.push('Padrão de injeção SQL detectado');
      result.threatLevel = 'critical';
      SecurityLogger.logEvent('SQL_INJECTION_ATTEMPT', { input: input.substring(0, 100) }, 'critical');
      break;
    }
  }
}

function validateHTMLInput(input: string, result: SecurityValidationResult): void {
  // Strict HTML validation
  const dangerousHTML = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<style[^>]*>.*?<\/style>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /expression\s*\(/gi
  ];

  for (const pattern of dangerousHTML) {
    if (pattern.test(input)) {
      result.isValid = false;
      result.errors.push('HTML perigoso detectado');
      result.threatLevel = 'critical';
      SecurityLogger.logEvent('XSS_ATTEMPT', { input: input.substring(0, 100) }, 'critical');
      break;
    }
  }
}

function validateTextInput(input: string, result: SecurityValidationResult): void {
  // General text validation
  if (result.threatLevel === 'medium') {
    result.warnings.push('Entrada contém padrões suspeitos');
  }

  // Check for encoding attacks
  const encodingPatterns = [
    /%3c%73%63%72%69%70%74/gi, // <script
    /%3e/gi, // >
    /%22/gi, // "
    /%27/gi, // '
    /&lt;script/gi,
    /&gt;/gi
  ];

  for (const pattern of encodingPatterns) {
    if (pattern.test(input)) {
      result.warnings.push('Codificação suspeita detectada');
      break;
    }
  }
}

function performAdvancedSecurityChecks(input: string, result: SecurityValidationResult): void {
  // Check for Unicode normalization attacks
  if (input !== input.normalize('NFC')) {
    result.warnings.push('Possível ataque de normalização Unicode');
  }

  // Check for zero-width characters
  if (/[\u200B-\u200D\uFEFF]/.test(input)) {
    result.warnings.push('Caracteres de largura zero detectados');
  }

  // Check for RTLO attacks
  if (/\u202E/.test(input)) {
    result.isValid = false;
    result.errors.push('Ataque RTLO detectado');
    result.threatLevel = 'high';
  }

  // Check for excessive repetition (potential DoS)
  const repetitionPattern = /(.)\1{50,}/;
  if (repetitionPattern.test(input)) {
    result.warnings.push('Repetição excessiva detectada');
  }
}

// Enhanced rate limiting with exponential backoff
export function checkRateLimit(
  key: string, 
  maxAttempts: number = 5, 
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
      backoffUntil: 0
    });
    return true;
  }

  // Check if still in backoff period
  if (now < entry.backoffUntil) {
    return false;
  }

  // Reset if outside window
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
      backoffUntil: 0
    });
    return true;
  }

  // Increment attempts
  entry.attempts++;
  entry.lastAttempt = now;

  if (entry.attempts > maxAttempts) {
    // Exponential backoff: 2^attempts seconds
    const backoffMs = Math.min(Math.pow(2, entry.attempts - maxAttempts) * 1000, 3600000); // Max 1 hour
    entry.backoffUntil = now + backoffMs;
    
    SecurityLogger.logEvent('RATE_LIMIT_EXCEEDED', { 
      key, 
      attempts: entry.attempts, 
      backoffMs 
    }, 'medium');
    
    return false;
  }

  return true;
}

// Enhanced password validation
export function validatePassword(password: string): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    threatLevel: 'none'
  };

  if (password.length < 12) {
    result.isValid = false;
    result.errors.push('Senha deve ter pelo menos 12 caracteres');
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
    result.isValid = false;
    result.errors.push('Senha deve conter pelo menos um caractere especial');
  }

  // Check for common patterns
  const commonPatterns = [
    /(.)\1{3,}/, // Repeated characters
    /123456|654321|abcdef|qwerty/i, // Sequential characters
    /password|admin|login|user/i // Common words
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      result.warnings.push('Senha contém padrões comuns');
      break;
    }
  }

  // Entropy calculation
  const entropy = calculatePasswordEntropy(password);
  if (entropy < 60) {
    result.warnings.push('Senha com baixa entropia (fraca)');
  }

  return result;
}

function calculatePasswordEntropy(password: string): number {
  const charSets = [
    /[a-z]/.test(password) ? 26 : 0, // lowercase
    /[A-Z]/.test(password) ? 26 : 0, // uppercase  
    /[0-9]/.test(password) ? 10 : 0, // numbers
    /[^A-Za-z0-9]/.test(password) ? 32 : 0 // symbols
  ];

  const charSetSize = charSets.reduce((sum, size) => sum + size, 0);
  return password.length * Math.log2(charSetSize);
}

export function validateEmpresaAccess(userEmpresaId: string, targetEmpresaId: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  
  // Additional security check
  if (!userEmpresaId || !targetEmpresaId) {
    SecurityLogger.logEvent('INVALID_EMPRESA_ACCESS', { userEmpresaId, targetEmpresaId }, 'medium');
    return false;
  }
  
  return userEmpresaId === targetEmpresaId;
}

// File validation with enhanced security
export function validateFileUpload(file: File): SecurityValidationResult {
  const result = InputSanitizer.validateFileUpload(file);
  
  return {
    isValid: result.isValid,
    errors: result.errors,
    warnings: [],
    threatLevel: result.isValid ? 'none' : 'medium'
  };
}

interface ValidationOptions {
  maxLength?: number;
  allowHTML?: boolean;
  strictMode?: boolean;
}
