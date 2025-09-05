
import { NextRequest, NextResponse } from 'next/server';
import { AdvancedRateLimit, SecurityLogger, InputSanitizer } from './lib/advancedSecurity';

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

  // Rate limiting for different endpoints
  let rateLimit = { maxAttempts: 100, windowMs: 60000 }; // Default: 100 requests per minute

  if (url.includes('/api/')) {
    rateLimit = { maxAttempts: 30, windowMs: 60000 }; // API: 30 per minute
  }
  
  if (url.includes('/auth/') || url.includes('/login')) {
    rateLimit = { maxAttempts: 5, windowMs: 300000 }; // Auth: 5 per 5 minutes
  }

  if (url.includes('/admin')) {
    rateLimit = { maxAttempts: 10, windowMs: 300000 }; // Admin: 10 per 5 minutes
  }

  if (!AdvancedRateLimit.checkLimit(`${ip}:${url}`, rateLimit.maxAttempts, rateLimit.windowMs)) {
    SecurityLogger.logEvent('RATE_LIMIT_EXCEEDED', { ip, url, userAgent }, 'medium');
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil(rateLimit.windowMs / 1000).toString()
      }
    });
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

  // Create response with security headers
  const response = NextResponse.next();

  // Apply all security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Additional security headers for sensitive areas
  if (url.includes('/admin') || url.includes('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // CSRF protection
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (!origin && !referer) {
      SecurityLogger.logEvent('CSRF_PROTECTION_TRIGGERED', { ip, url, method }, 'medium');
      return new NextResponse('CSRF protection triggered', { status: 403 });
    }
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
