interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  itemCount: number;
}

class AdvancedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    itemCount: 0
  };
  private maxSize = 100 * 1024 * 1024; // 100MB
  private maxItems = 10000;
  private defaultTTL = 5 * 60 * 1000; // 5 minutos

  // Cache básico
  set<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccess: now,
      tags
    };

    // Verificar se precisa fazer cleanup
    if (this.cache.size >= this.maxItems) {
      this.cleanup();
    }

    this.cache.set(key, entry);
    this.updateStats();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();

    // Verificar TTL
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccess = now;
    this.stats.hits++;

    return entry.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  // Cache avançado com tags
  invalidateByTag(tag: string): number {
    let invalidated = 0;
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    this.updateStats();
    return invalidated;
  }

  // Cache com padrões
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.updateStats();
    return invalidated;
  }

  // Cache com callback
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl, tags);
    return data;
  }

  // Cache de múltiplas chaves
  mget<T>(keys: string[]): Array<T | null> {
    return keys.map(key => this.get<T>(key));
  }

  mset<T>(entries: Array<{ key: string; data: T; ttl?: number; tags?: string[] }>): void {
    entries.forEach(({ key, data, ttl, tags }) => {
      this.set(key, data, ttl, tags);
    });
  }

  // Cleanup e manutenção
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remover entradas expiradas
    const expired = entries.filter(([, entry]) =>
      now - entry.timestamp > entry.ttl
    );

    expired.forEach(([key]) => {
      this.cache.delete(key);
      this.stats.evictions++;
    });

    // Se ainda estiver muito cheio, remover LRU
    if (this.cache.size >= this.maxItems) {
      const remainingEntries = Array.from(this.cache.entries());
      const lru = remainingEntries
        .filter(([key]) => this.cache.has(key)) // Ainda existe
        .sort(([, a], [, b]) => a.lastAccess - b.lastAccess)
        .slice(0, Math.floor(this.maxItems * 0.1)); // Remove 10%

      lru.forEach(([key]) => {
        this.cache.delete(key);
        this.stats.evictions++;
      });
    }

    this.updateStats();
  }

  // Backup e restore
  backup(): string {
    const backup = {
      cache: Array.from(this.cache.entries()),
      stats: this.stats,
      timestamp: Date.now()
    };
    return JSON.stringify(backup);
  }

  restore(backupData: string): boolean {
    try {
      const backup = JSON.parse(backupData);
      this.cache = new Map(backup.cache);
      this.stats = backup.stats;
      return true;
    } catch {
      return false;
    }
  }

  // Serialização para localStorage
  persist(): void {
    try {
      const data = this.backup();
      localStorage.setItem('cache_backup', data);
    } catch (error) {
      console.warn('Erro ao persistir cache:', error);
    }
  }

  load(): boolean {
    try {
      const data = localStorage.getItem('cache_backup');
      if (data) {
        return this.restore(data);
      }
    } catch (error) {
      console.warn('Erro ao carregar cache:', error);
    }
    return false;
  }

  // Estatísticas e monitoramento
  getStats(): CacheStats & { hitRate: number; memoryUsage: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    const memoryUsage = this.formatBytes(this.estimateSize());

    return {
      ...this.stats,
      hitRate,
      memoryUsage
    };
  }

  // Configuração dinâmica
  configure(options: {
    maxSize?: number;
    maxItems?: number;
    defaultTTL?: number;
  }): void {
    if (options.maxSize) this.maxSize = options.maxSize;
    if (options.maxItems) this.maxItems = options.maxItems;
    if (options.defaultTTL) this.defaultTTL = options.defaultTTL;
  }

  // Cache warming
  async warmup(warmupData: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<void> {
    const promises = warmupData.map(async ({ key, fetcher, ttl, tags }) => {
      try {
        const data = await fetcher();
        this.set(key, data, ttl, tags);
      } catch (error) {
        console.warn(`Erro no warmup da chave ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Métodos privados
  private updateStats(): void {
    this.stats.itemCount = this.cache.size;
    this.stats.totalSize = this.estimateSize();
  }

  private estimateSize(): number {
    let size = 0;
    for (const [key, entry] of Array.from(this.cache.entries())) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry).length * 2;
    }
    return size;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // Limpeza automática
  startAutoCleanup(intervalMs: number = 5 * 60 * 1000): () => void {
    const interval = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    return () => clearInterval(interval);
  }

  // API REST-like para cache distribuído (mock)
  async syncToServer(): Promise<boolean> {
    try {
      const data = this.backup();
      // Mock de sincronização
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('Cache sincronizado com servidor (mock)');
      return true;
    } catch {
      return false;
    }
  }

  async loadFromServer(): Promise<boolean> {
    try {
      // Mock de carregamento
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('Cache carregado do servidor (mock)');
      return true;
    } catch {
      return false;
    }
  }

  // Métricas avançadas
  getTopKeys(limit: number = 10): Array<{ key: string; accessCount: number; lastAccess: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccess: entry.lastAccess
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  getExpiringSoon(withinMs: number = 60000): string[] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([, entry]) => {
        const timeToExpire = entry.ttl - (now - entry.timestamp);
        return timeToExpire > 0 && timeToExpire <= withinMs;
      })
      .map(([key]) => key);
  }
}

// Instância global
export const cacheManager = new AdvancedCacheManager();

// Auto-inicialização
if (typeof window !== 'undefined') {
  // Carregar cache do localStorage na inicialização
  cacheManager.load();

  // Persistir cache antes de sair
  window.addEventListener('beforeunload', () => {
    cacheManager.persist();
  });

  // Limpeza automática
  cacheManager.startAutoCleanup();
}

// Hooks para React
export function useCache() {
  return {
    get: cacheManager.get.bind(cacheManager),
    set: cacheManager.set.bind(cacheManager),
    getOrSet: cacheManager.getOrSet.bind(cacheManager),
    invalidateByTag: cacheManager.invalidateByTag.bind(cacheManager),
    getStats: cacheManager.getStats.bind(cacheManager)
  };
}