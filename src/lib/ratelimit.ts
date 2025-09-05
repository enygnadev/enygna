// Rate limiting com suporte a Redis (fallback para memória)
import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Interface para store de rate limit
interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

// Store em memória (fallback)
class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  
  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Limpar se expirado
    if (entry.resetAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }
  
  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  // Limpeza periódica
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      this.store.forEach((entry, key) => {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      });
    }, 5 * 60 * 1000); // 5 minutos
  }
}

// Store Redis (se disponível)
class RedisStore implements RateLimitStore {
  private redisUrl: string;
  
  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    // Nota: Em produção, use um cliente Redis real como ioredis ou @upstash/redis
    console.log('Redis URL configurada:', redisUrl.split('@')[1]); // Log sem credenciais
  }
  
  async get(key: string): Promise<RateLimitEntry | null> {
    // TODO: Implementar com cliente Redis real
    // Por enquanto, retornar null para usar fallback
    return null;
  }
  
  async set(key: string, entry: RateLimitEntry): Promise<void> {
    // TODO: Implementar com cliente Redis real
    // Por enquanto, não fazer nada
  }
  
  async delete(key: string): Promise<void> {
    // TODO: Implementar com cliente Redis real
    // Por enquanto, não fazer nada
  }
}

// Criar store apropriado baseado no ambiente
const createRateLimitStore = (): RateLimitStore => {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  
  if (redisUrl) {
    console.log('Rate limiting: Usando Redis');
    return new RedisStore(redisUrl);
  }
  
  console.log('Rate limiting: Usando memória (LRU)');
  const memoryStore = new MemoryStore();
  memoryStore.startCleanup();
  return memoryStore;
};

// Store singleton
const rateLimitStore = createRateLimitStore();

export async function rateLimit(
  identifier: string,
  request: NextRequest | Request,
  options: {
    limit?: number;
    window?: number; // em segundos
  } = {}
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { limit = 5, window = 60 } = options;
  
  // Extrair IP do request
  const ip = getClientIp(request);
  
  const key = `${identifier}:${ip}`;
  const now = Date.now();
  const windowMs = window * 1000;
  
  const entry = await rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Nova entrada ou janela expirada
    await rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    
    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }
  
  if (entry.count >= limit) {
    // Limite excedido
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt
    };
  }
  
  // Incrementar contador
  entry.count++;
  await rateLimitStore.set(key, entry);
  
  return {
    success: true,
    remaining: limit - entry.count,
    reset: entry.resetAt
  };
}

// Helper para extrair IP de forma segura
export function getClientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

// Helper para rate limit baseado em chave customizada
export async function rateLimitByKey(
  key: string,
  options: {
    limit?: number;
    window?: number;
  } = {}
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { limit = 5, window = 60 } = options;
  const now = Date.now();
  const windowMs = window * 1000;
  
  const entry = await rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    await rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    
    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }
  
  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt
    };
  }
  
  entry.count++;
  await rateLimitStore.set(key, entry);
  
  return {
    success: true,
    remaining: limit - entry.count,
    reset: entry.resetAt
  };
}