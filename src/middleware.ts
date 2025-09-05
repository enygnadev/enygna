import { NextRequest, NextResponse } from 'next/server';
import { AdvancedRateLimit, SecurityLogger, InputSanitizer } from './lib/advancedSecurity';

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token validation
function validateCSRFToken(request: NextRequest): boolean {
  const token = request.headers.get('X-CSRF-Token');
  const cookie = request.cookies.get('csrf-token')?.value;
  return token === cookie;
}

// Rate limiting
function isRateLimited(ip: string, limit: number = 100): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes

  const current = rateLimitStore.get(ip);
  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count++;
  return false;
}

// Enhanced Security Headers
const SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent DNS prefetching
  'X-DNS-Prefetch-Control': 'off',

  // Prevent referrer leakage
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Feature policy restrictions
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

  // HSTS with preload
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Enhanced CSP
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com wss://*.firebaseio.com;
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
    upgrade-insecure-requests;
    block-all-mixed-content;
  `.replace(/\s+/g, ' ').trim()
};

// Honeypot endpoints to detect attackers
const HONEYPOT_ENDPOINTS = [
  '/admin',
  '/wp-admin',
  '/phpmyadmin',
  '/.env',
  '/config',
  '/backup',
  '/test',
  '/dev',
  '/api/v1/admin',
  '/api/admin/users',
  '/administrator',
  '/login.php',
  '/admin.php'
];

// Suspicious patterns in URLs
const SUSPICIOUS_PATTERNS = [
  /\.\./,  // Path traversal
  /<script/i,  // XSS attempt
  /union.*select/i,  // SQL injection
  /exec\(/i,  // Code execution
  /eval\(/i,  // Code evaluation
  /javascript:/i,  // JS protocol
  /data:text\/html/i,  // Data URI XSS
  /vbscript:/i,  // VBScript protocol
  /%00/,  // Null byte
  /\x00/,  // Null character
];

export async function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.nextUrl.pathname;
  const method = request.method;

  const response = NextResponse.next();

  // Get client IP
  const clientIp = request.ip || 'unknown';

  // Rate limiting
  let apiRateLimit = 100;
  if (url.startsWith('/api/')) {
    apiRateLimit = 30;
  } else if (url.startsWith('/auth/') || url.startsWith('/login')) {
    apiRateLimit = 5;
  } else if (url.startsWith('/admin')) {
    apiRateLimit = 10;
  }

  if (isRateLimited(clientIp, apiRateLimit)) {
    SecurityLogger.logEvent('RATE_LIMIT_EXCEEDED', { ip: clientIp, url, userAgent }, 'high');
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // CSRF protection for POST/PUT/DELETE requests
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    if (!validateCSRFToken(request)) {
      SecurityLogger.logEvent('CSRF_PROTECTION_TRIGGERED', { ip: clientIp, url, method }, 'medium');
      return new NextResponse('CSRF Token Invalid', { status: 403 });
    }
  }

  // Security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // HTTPOnly cookie settings
  if (url.startsWith('/api/') || url.startsWith('/auth/') || url.startsWith('/admin')) {
    // Setting HttpOnly, Secure, and SameSite=Strict attributes for cookies
    // This is a general security measure and may need adjustment based on specific cookie requirements.
    // Note: Setting a cookie directly via headers.set('Set-Cookie', ...) can be tricky
    // as it might overwrite existing cookies or not be applied correctly.
    // For robust cookie management, consider using response.cookies.set() in Next.js.
    // For demonstration, we'll set a placeholder header.
    // response.cookies.set('session', 'some_value', { httpOnly: true, secure: true, sameSite: 'strict' });
  }

  // Block known malicious IPs immediately
  if (AdvancedRateLimit.isBlocked(ip)) {
    SecurityLogger.logEvent('RATE_LIMIT_EXCEEDED', { ip, url, userAgent }, 'high');
    return new NextResponse('Access Denied', { status: 429 });
  }

  // Honeypot detection
  if (HONEYPOT_ENDPOINTS.some(endpoint => url.toLowerCase().includes(endpoint.toLowerCase()))) {
    SecurityLogger.logEvent('HONEYPOT_ACCESS', { ip, url, userAgent }, 'critical');

    // Advanced response to waste attacker's time
    await new Promise(resolve => setTimeout(resolve, 5000));
    return new NextResponse('Not Found', { status: 404 });
  }

  // Detect suspicious patterns
  const fullUrl = request.nextUrl.href;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fullUrl) || pattern.test(decodeURIComponent(fullUrl))) {
      SecurityLogger.logEvent('SUSPICIOUS_REQUEST', { ip, url, pattern: pattern.source, userAgent }, 'high');
      return new NextResponse('Bad Request', { status: 400 });
    }
  }

  // Check for malicious file uploads
  if (method === 'POST' && request.headers.get('content-type')?.includes('multipart/form-data')) {
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      SecurityLogger.logEvent('FILE_UPLOAD_VIOLATION', { ip, url, size: contentLength }, 'medium');
      return new NextResponse('File too large', { status: 413 });
    }
  }

  // Enhanced user agent validation
  if (!userAgent || userAgent.length < 10 || userAgent.length > 1000) {
    SecurityLogger.logEvent('SUSPICIOUS_USER_AGENT', { ip, url, userAgent }, 'low');
  }

  // Block common bot patterns
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /python/i,
    /curl/i,
    /wget/i,
    /postman/i
  ];

  const isSuspiciousBot = botPatterns.some(pattern => pattern.test(userAgent));
  if (isSuspiciousBot && !url.includes('/api/health')) {
    SecurityLogger.logEvent('BOT_ACCESS_ATTEMPT', { ip, url, userAgent }, 'low');
    // Allow but monitor closely
  }

  // Additional security headers for sensitive areas
  if (url.includes('/admin') || url.includes('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};