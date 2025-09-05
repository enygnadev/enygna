
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateUserInput(input: any, allowedFields: string[]): SecurityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!input || typeof input !== 'object') {
    errors.push('Invalid input format');
    return { isValid: false, errors, warnings };
  }
  
  // Check for forbidden fields
  const inputKeys = Object.keys(input);
  const forbiddenFields = inputKeys.filter(key => !allowedFields.includes(key));
  
  if (forbiddenFields.length > 0) {
    errors.push(`Forbidden fields detected: ${forbiddenFields.join(', ')}`);
  }
  
  // Check for potential XSS
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && /<script|javascript:|on\w+=/i.test(value)) {
      errors.push(`Potential XSS detected in field: ${key}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function validateEmpresaAccess(userEmpresaId: string, targetEmpresaId: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return userEmpresaId === targetEmpresaId;
}
