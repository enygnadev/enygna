import { db } from './firebase';
import { collection, doc, setDoc, getDoc, deleteDoc, serverTimestamp, where, query, getDocs } from 'firebase/firestore';

interface CacheEntry<T = any> {
  key: string;
  data: T;
  expiresAt: Date;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0
  };
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private defaultTTL = 5 * 60 * 1000; // 5 minutos
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupProcess();
  }

  // Iniciar processo de limpeza automática
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Limpar a cada minuto
  }

  // Parar processo de limpeza
  stopCleanupProcess(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Gerar chave de cache
  private generateKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  // Calcular tamanho de dados
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Aproximação em bytes
  }

  // Verificar se entrada expirou
  private isExpired(entry: CacheEntry): boolean {
    return new Date() > entry.expiresAt;
  }

  // Armazenar no cache de memória
  async setMemory<T>(
    namespace: string, 
    key: string, 
    data: T, 
    ttl: number = this.defaultTTL,
    tags: string[] = []
  ): Promise<void> {
    const cacheKey = this.generateKey(namespace, key);
    const size = this.calculateSize(data);
    
    // Verificar limite de memória
    if (this.stats.totalSize + size > this.maxMemorySize) {
      await this.evictOldEntries(size);
    }

    const entry: CacheEntry<T> = {
      key: cacheKey,
      data,
      expiresAt: new Date(Date.now() + ttl),
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      tags,
      size
    };

    // Remover entrada antiga se existir
    if (this.memoryCache.has(cacheKey)) {
      const oldEntry = this.memoryCache.get(cacheKey)!;
      this.stats.totalSize -= oldEntry.size;
    } else {
      this.stats.entryCount++;
    }

    this.memoryCache.set(cacheKey, entry);
    this.stats.totalSize += size;
  }

  // Recuperar do cache de memória
  async getMemory<T>(namespace: string, key: string): Promise<T | null> {
    const cacheKey = this.generateKey(namespace, key);
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.memoryCache.delete(cacheKey);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.lastAccessed = new Date();
    entry.accessCount++;
    this.stats.hits++;

    return entry.data as T;
  }

  // Armazenar no cache do Firestore (persistente)
  async setPersistent<T>(
    namespace: string, 
    key: string, 
    data: T, 
    ttl: number = this.defaultTTL,
    tags: string[] = []
  ): Promise<void> {
    try {
      const cacheKey = this.generateKey(namespace, key);
      const cacheDoc = doc(db, 'cache', cacheKey);
      
      await setDoc(cacheDoc, {
        key: cacheKey,
        data: JSON.stringify(data),
        expiresAt: new Date(Date.now() + ttl),
        createdAt: serverTimestamp(),
        lastAccessed: serverTimestamp(),
        accessCount: 0,
        tags,
        size: this.calculateSize(data)
      });

      // Também armazenar em memória para acesso rápido
      await this.setMemory(namespace, key, data, ttl, tags);
    } catch (error) {
      console.error('Erro ao armazenar cache persistente:', error);
    }
  }

  // Recuperar do cache do Firestore
  async getPersistent<T>(namespace: string, key: string): Promise<T | null> {
    try {
      const cacheKey = this.generateKey(namespace, key);
      
      // Tentar memória primeiro
      const memoryResult = await this.getMemory<T>(namespace, key);
      if (memoryResult !== null) {
        return memoryResult;
      }

      // Buscar no Firestore
      const cacheDoc = doc(db, 'cache', cacheKey);
      const snapshot = await getDoc(cacheDoc);

      if (!snapshot.exists()) {
        this.stats.misses++;
        return null;
      }

      const entry = snapshot.data();
      
      // Verificar expiração
      if (new Date() > entry.expiresAt.toDate()) {
        await deleteDoc(cacheDoc);
        this.stats.evictions++;
        this.stats.misses++;
        return null;
      }

      // Atualizar estatísticas de acesso
      await setDoc(cacheDoc, {
        lastAccessed: serverTimestamp(),
        accessCount: (entry.accessCount as number) + 1
      }, { merge: true });

      this.stats.hits++;
      
      const data = JSON.parse(entry.data as string) as T;
      
      // Armazenar em memória para próximos acessos
      await this.setMemory(namespace, key, data, 
        entry.expiresAt.toDate().getTime() - Date.now(), entry.tags);

      return data;
    } catch (error) {
      console.error('Erro ao recuperar cache persistente:', error);
      this.stats.misses++;
      return null;
    }
  }

  // Invalidar cache por chave
  async invalidate(namespace: string, key: string): Promise<void> {
    const cacheKey = this.generateKey(namespace, key);
    
    // Remover da memória
    if (this.memoryCache.has(cacheKey)) {
      const entry = this.memoryCache.get(cacheKey)!;
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.memoryCache.delete(cacheKey);
    }

    // Remover do Firestore
    try {
      const cacheDoc = doc(db, 'cache', cacheKey);
      await deleteDoc(cacheDoc);
    } catch (error) {
      console.error('Erro ao invalidar cache:', error);
    }
  }

  // Invalidar cache por tags
  async invalidateByTags(tags: string[]): Promise<void> {
    // Invalidar memória
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
        this.memoryCache.delete(key);
      }
    }

    // Invalidar Firestore
    try {
      for (const tag of tags) {
        const q = query(collection(db, 'cache'), where('tags', 'array-contains', tag));
        const snapshot = await getDocs(q);
        
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(docSnapshot.ref);
        }
      }
    } catch (error) {
      console.error('Erro ao invalidar cache por tags:', error);
    }
  }

  // Limpar entradas expiradas
  private async cleanup(): Promise<void> {
    // Limpar memória
    for (const [key, entry] of Array.from(this.memoryCache.entries())) {
      if (this.isExpired(entry)) {
        this.stats.totalSize -= entry.size;
        this.stats.entryCount--;
        this.stats.evictions++;
        this.memoryCache.delete(key);
      }
    }

    // Limpar Firestore (executar menos frequentemente)
    if (Math.random() < 0.1) { // 10% de chance a cada limpeza
      try {
        const q = query(collection(db, 'cache'), where('expiresAt', '<', new Date()));
        const snapshot = await getDocs(q);
        
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(docSnapshot.ref);
          this.stats.evictions++;
        }
      } catch (error) {
        console.error('Erro ao limpar cache persistente:', error);
      }
    }
  }

  // Remover entradas antigas para liberar espaço
  private async evictOldEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Priorizar por menos acessos e mais antigos
        const scoreA = a.entry.accessCount / (Date.now() - a.entry.lastAccessed.getTime());
        const scoreB = b.entry.accessCount / (Date.now() - b.entry.lastAccessed.getTime());
        return scoreA - scoreB;
      });

    let freedSpace = 0;
    for (const { key, entry } of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.memoryCache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.stats.evictions++;
      freedSpace += entry.size;
    }
  }

  // Obter estatísticas do cache
  getStats(): CacheStats & {
    hitRate: number;
    memoryUsage: number;
    avgEntrySize: number;
  } {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      memoryUsage: (this.stats.totalSize / this.maxMemorySize) * 100,
      avgEntrySize: this.stats.entryCount > 0 ? this.stats.totalSize / this.stats.entryCount : 0
    };
  }

  // Limpar todo o cache
  async clear(): Promise<void> {
    // Limpar memória
    this.memoryCache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0
    };

    // Limpar Firestore
    try {
      const q = query(collection(db, 'cache'));
      const snapshot = await getDocs(q);
      
      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(docSnapshot.ref);
      }
    } catch (error) {
      console.error('Erro ao limpar cache persistente:', error);
    }
  }

  // Pré-carregar dados no cache
  async preload<T>(
    namespace: string, 
    key: string, 
    dataLoader: () => Promise<T>,
    ttl: number = this.defaultTTL,
    tags: string[] = []
  ): Promise<T> {
    // Verificar se já está em cache
    const cached = await this.getMemory<T>(namespace, key);
    if (cached !== null) {
      return cached;
    }

    // Carregar dados
    const data = await dataLoader();
    
    // Armazenar no cache
    await this.setMemory(namespace, key, data, ttl, tags);
    
    return data;
  }

  // Wrapper para cache automático de funções
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: {
      namespace: string;
      keyGenerator?: (...args: Parameters<T>) => string;
      ttl?: number;
      tags?: string[];
    }
  ): T {
    const { namespace, keyGenerator = (...args) => JSON.stringify(args), ttl, tags } = options;

    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      
      // Tentar buscar no cache
      const cached = await this.getMemory(namespace, key);
      if (cached !== null) {
        return cached;
      }

      // Executar função original
      const result = await fn(...args);
      
      // Armazenar resultado no cache
      await this.setMemory(namespace, key, result, ttl, tags);
      
      return result;
    }) as T;
  }
}

// Instância global do serviço de cache
export const cacheService = new CacheService();

// Hook React para cache
export function useCache() {
  return {
    get: <T>(namespace: string, key: string) => cacheService.getMemory<T>(namespace, key),
    set: <T>(namespace: string, key: string, data: T, ttl?: number, tags?: string[]) => 
      cacheService.setMemory(namespace, key, data, ttl, tags),
    invalidate: (namespace: string, key: string) => cacheService.invalidate(namespace, key),
    invalidateByTags: (tags: string[]) => cacheService.invalidateByTags(tags),
    preload: <T>(namespace: string, key: string, loader: () => Promise<T>, ttl?: number, tags?: string[]) =>
      cacheService.preload(namespace, key, loader, ttl, tags),
    stats: () => cacheService.getStats()
  };
}

// Decorador para cache automático
export function cached(options: {
  namespace: string;
  ttl?: number;
  tags?: string[];
  keyGenerator?: (...args: any[]) => string;
}) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    if (descriptor.value) {
      descriptor.value = cacheService.memoize(descriptor.value, options) as T;
    }
    return descriptor;
  };
}

// Middleware para cache de API
export function cacheMiddleware(options: {
  namespace: string;
  ttl?: number;
  tags?: string[];
}): (req: any, res: any, next: any) => void {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send;
    const cacheKey = req.url;

    // Tentar buscar no cache
    cacheService.getMemory(options.namespace, cacheKey).then(cached => {
      if (cached) {
        return res.json(cached);
      }

      // Interceptar resposta para armazenar no cache
      res.send = function(data: any) {
        if (res.statusCode === 200) {
          cacheService.setMemory(options.namespace, cacheKey, 
            typeof data === 'string' ? JSON.parse(data) : data, 
            options.ttl, options.tags);
        }
        return originalSend.call(this, data);
      };

      next();
    }).catch(() => next());
  };
}