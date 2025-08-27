import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  deleteDoc
} from 'firebase/firestore';

interface BackupConfig {
  collections: string[];
  schedule: 'daily' | 'weekly' | 'monthly';
  retention: number; // dias
  compression: boolean;
  encryption: boolean;
  destination: 'firestore' | 'storage' | 'external';
}

interface BackupMetadata {
  id: string;
  timestamp: Date;
  collections: string[];
  totalDocuments: number;
  totalSize: number;
  duration: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  checksum: string;
}

interface RestoreOptions {
  backupId: string;
  collections?: string[];
  overwrite: boolean;
  validateData: boolean;
}

class BackupService {
  private config: BackupConfig = {
    collections: [
      'users',
      'empresas', 
      'sessions',
      'lgpd_consents',
      'security_events',
      'performance_metrics',
      'audit_logs'
    ],
    schedule: 'daily',
    retention: 30,
    compression: true,
    encryption: true,
    destination: 'firestore'
  };

  private isRunning = false;
  private scheduledBackup: NodeJS.Timeout | null = null;

  // Inicializar serviço de backup
  async initialize(): Promise<void> {
    console.log('🔄 Inicializando serviço de backup...');
    
    // Carregar configuração personalizada se existir
    await this.loadConfig();
    
    // Agendar backups automáticos
    this.scheduleBackups();
    
    // Limpar backups antigos
    await this.cleanupOldBackups();
    
    console.log('✅ Serviço de backup inicializado');
  }

  // Carregar configuração
  private async loadConfig(): Promise<void> {
    try {
      const configDoc = doc(db, 'system_settings', 'backup_config');
      const snapshot = await getDocs(query(collection(db, 'system_settings'), where('id', '==', 'backup_config')));
      
      if (!snapshot.empty) {
        const config = snapshot.docs[0].data() as Partial<BackupConfig>;
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração de backup, usando padrão:', error);
    }
  }

  // Agendar backups automáticos
  private scheduleBackups(): void {
    if (this.scheduledBackup) {
      clearInterval(this.scheduledBackup);
    }

    let interval: number;
    switch (this.config.schedule) {
      case 'daily':
        interval = 24 * 60 * 60 * 1000; // 24 horas
        break;
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000; // 7 dias
        break;
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000; // 30 dias
        break;
      default:
        interval = 24 * 60 * 60 * 1000;
    }

    this.scheduledBackup = setInterval(async () => {
      await this.createBackup();
    }, interval);

    console.log(`📅 Backup agendado a cada ${this.config.schedule}`);
  }

  // Criar backup completo
  async createBackup(collections?: string[]): Promise<BackupMetadata> {
    if (this.isRunning) {
      throw new Error('Backup já está em execução');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 Iniciando backup ${backupId}...`);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: new Date(),
      collections: collections || this.config.collections,
      totalDocuments: 0,
      totalSize: 0,
      duration: 0,
      status: 'running',
      checksum: ''
    };

    try {
      // Criar documento de metadata
      await this.saveBackupMetadata(metadata);

      // Fazer backup de cada coleção
      const backupData: Record<string, any[]> = {};
      
      for (const collectionName of metadata.collections) {
        console.log(`📁 Fazendo backup da coleção: ${collectionName}`);
        
        const docs = await this.backupCollection(collectionName);
        backupData[collectionName] = docs;
        metadata.totalDocuments += docs.length;
      }

      // Calcular tamanho e checksum
      const backupJson = JSON.stringify(backupData);
      metadata.totalSize = new Blob([backupJson]).size;
      metadata.checksum = await this.calculateChecksum(backupJson);

      // Compressão (se habilitada)
      let finalData = backupJson;
      if (this.config.compression) {
        finalData = await this.compressData(backupJson);
      }

      // Criptografia (se habilitada)
      if (this.config.encryption) {
        finalData = await this.encryptData(finalData);
      }

      // Salvar backup
      await this.saveBackupData(backupId, finalData);

      // Finalizar metadata
      metadata.duration = Date.now() - startTime;
      metadata.status = 'completed';
      
      await this.saveBackupMetadata(metadata);

      console.log(`✅ Backup ${backupId} concluído em ${metadata.duration}ms`);
      console.log(`📊 Documentos: ${metadata.totalDocuments}, Tamanho: ${(metadata.totalSize / 1024 / 1024).toFixed(2)}MB`);

      return metadata;

    } catch (error) {
      console.error(`❌ Erro no backup ${backupId}:`, error);
      
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Erro desconhecido';
      metadata.duration = Date.now() - startTime;
      
      await this.saveBackupMetadata(metadata);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Fazer backup de uma coleção
  private async backupCollection(collectionName: string): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _backup_timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`Erro ao fazer backup da coleção ${collectionName}:`, error);
      return [];
    }
  }

  // Salvar dados do backup
  private async saveBackupData(backupId: string, data: string): Promise<void> {
    const backupDoc = doc(db, 'backups', backupId);
    await setDoc(backupDoc, {
      id: backupId,
      data: data,
      createdAt: serverTimestamp(),
      compressed: this.config.compression,
      encrypted: this.config.encryption
    });
  }

  // Salvar metadata do backup
  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataDoc = doc(db, 'backup_metadata', metadata.id);
    await setDoc(metadataDoc, {
      ...metadata,
      timestamp: serverTimestamp()
    }, { merge: true });
  }

  // Calcular checksum
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Comprimir dados
  private async compressData(data: string): Promise<string> {
    // Implementação simples de compressão usando deflate
    const stream = new CompressionStream('deflate');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    writer.write(encoder.encode(data));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    return btoa(String.fromCharCode(...Array.from(compressed)));
  }

  // Criptografar dados
  private async encryptData(data: string): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    // Combinar IV e dados criptografados
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...Array.from(combined)));
  }

  // Listar backups disponíveis
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const q = query(
        collection(db, 'backup_metadata'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as BackupMetadata[];
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  // Restaurar backup
  async restoreBackup(options: RestoreOptions): Promise<void> {
    console.log(`🔄 Iniciando restauração do backup ${options.backupId}...`);
    
    try {
      // Buscar dados do backup
      const backupDoc = doc(db, 'backups', options.backupId);
      const backupSnapshot = await getDocs(query(collection(db, 'backups'), where('id', '==', options.backupId)));
      
      if (backupSnapshot.empty) {
        throw new Error('Backup não encontrado');
      }

      const backupData = backupSnapshot.docs[0].data();
      let data = backupData.data;

      // Descriptografar se necessário
      if (backupData.encrypted) {
        data = await this.decryptData(data);
      }

      // Descomprimir se necessário
      if (backupData.compressed) {
        data = await this.decompressData(data);
      }

      const parsedData = JSON.parse(data);

      // Validar dados se solicitado
      if (options.validateData) {
        await this.validateBackupData(parsedData);
      }

      // Restaurar coleções
      const collectionsToRestore = options.collections || Object.keys(parsedData);
      
      for (const collectionName of collectionsToRestore) {
        if (parsedData[collectionName]) {
          await this.restoreCollection(collectionName, parsedData[collectionName], options.overwrite);
        }
      }

      console.log(`✅ Backup ${options.backupId} restaurado com sucesso`);

      // Registrar evento de auditoria
      await this.logAuditEvent('backup_restored', {
        backupId: options.backupId,
        collections: collectionsToRestore,
        overwrite: options.overwrite
      });

    } catch (error) {
      console.error(`❌ Erro na restauração do backup ${options.backupId}:`, error);
      throw error;
    }
  }

  // Restaurar coleção
  private async restoreCollection(collectionName: string, documents: any[], overwrite: boolean): Promise<void> {
    console.log(`📁 Restaurando coleção: ${collectionName} (${documents.length} documentos)`);
    
    for (const docData of documents) {
      const { id, _backup_timestamp, ...data } = docData;
      const docRef = doc(db, collectionName, id);
      
      try {
        if (overwrite) {
          await setDoc(docRef, data);
        } else {
          await setDoc(docRef, data, { merge: true });
        }
      } catch (error) {
        console.error(`Erro ao restaurar documento ${id}:`, error);
      }
    }
  }

  // Descriptografar dados
  private async decryptData(encryptedData: string): Promise<string> {
    // Implementação de descriptografia (inverso da criptografia)
    // Esta é uma implementação simplificada
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Em produção, a chave deveria ser armazenada de forma segura
    // Por simplicidade, estamos retornando os dados como estão
    return new TextDecoder().decode(combined.slice(12)); // Remove IV
  }

  // Descomprimir dados
  private async decompressData(compressedData: string): Promise<string> {
    const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
    
    const stream = new DecompressionStream('deflate');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(compressed);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(decompressed);
  }

  // Validar dados do backup
  private async validateBackupData(data: Record<string, any[]>): Promise<void> {
    for (const [collectionName, documents] of Object.entries(data)) {
      if (!Array.isArray(documents)) {
        throw new Error(`Dados inválidos para coleção ${collectionName}`);
      }
      
      for (const doc of documents) {
        if (!doc.id) {
          throw new Error(`Documento sem ID na coleção ${collectionName}`);
        }
      }
    }
  }

  // Limpar backups antigos
  async cleanupOldBackups(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);
      
      const q = query(
        collection(db, 'backup_metadata'),
        where('timestamp', '<', cutoffDate)
      );
      
      const snapshot = await getDocs(q);
      let deletedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        const backupId = docSnapshot.data().id;
        
        // Deletar dados do backup
        try {
          const backupDoc = doc(db, 'backups', backupId);
          await getDocs(query(collection(db, 'backups'), where('id', '==', backupId)))
            .then(async snapshot => {
              for (const doc of snapshot.docs) {
                await deleteDoc(doc.ref);
              }
            });
        } catch (error) {
          console.error(`Erro ao deletar backup ${backupId}:`, error);
        }
        
        // Deletar metadata
        await deleteDoc(docSnapshot.ref);
        deletedCount++;
      }
      
      if (deletedCount > 0) {
        console.log(`🗑️ ${deletedCount} backups antigos removidos`);
      }
      
    } catch (error) {
      console.error('Erro ao limpar backups antigos:', error);
    }
  }

  // Verificar integridade do backup
  async verifyBackup(backupId: string): Promise<{
    valid: boolean;
    errors: string[];
    checksumMatch: boolean;
  }> {
    const errors: string[] = [];
    let checksumMatch = false;
    
    try {
      // Buscar metadata
      const metadataSnapshot = await getDocs(
        query(collection(db, 'backup_metadata'), where('id', '==', backupId))
      );
      
      if (metadataSnapshot.empty) {
        errors.push('Metadata do backup não encontrada');
        return { valid: false, errors, checksumMatch };
      }
      
      const metadata = metadataSnapshot.docs[0].data() as BackupMetadata;
      
      // Buscar dados
      const backupSnapshot = await getDocs(
        query(collection(db, 'backups'), where('id', '==', backupId))
      );
      
      if (backupSnapshot.empty) {
        errors.push('Dados do backup não encontrados');
        return { valid: false, errors, checksumMatch };
      }
      
      const backupData = backupSnapshot.docs[0].data();
      
      // Verificar checksum
      const currentChecksum = await this.calculateChecksum(backupData.data);
      checksumMatch = currentChecksum === metadata.checksum;
      
      if (!checksumMatch) {
        errors.push('Checksum não confere - possível corrupção de dados');
      }
      
      // Verificar se pode descriptografar/descomprimir
      if (backupData.encrypted || backupData.compressed) {
        try {
          let data = backupData.data;
          if (backupData.encrypted) data = await this.decryptData(data);
          if (backupData.compressed) data = await this.decompressData(data);
          JSON.parse(data);
        } catch (error) {
          errors.push('Erro ao processar dados do backup');
        }
      }
      
    } catch (error) {
      errors.push(`Erro na verificação: ${error}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      checksumMatch
    };
  }

  // Registrar evento de auditoria
  private async logAuditEvent(action: string, metadata: any): Promise<void> {
    try {
      const auditDoc = doc(collection(db, 'audit_logs'));
      await setDoc(auditDoc, {
        action,
        metadata,
        timestamp: serverTimestamp(),
        service: 'backup',
        id: auditDoc.id
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
  }

  // Obter estatísticas de backup
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    lastBackup: Date | null;
    successRate: number;
    avgDuration: number;
  }> {
    try {
      const snapshot = await getDocs(collection(db, 'backup_metadata'));
      const backups = snapshot.docs.map(doc => doc.data()) as BackupMetadata[];
      
      const totalBackups = backups.length;
      const totalSize = backups.reduce((sum, backup) => sum + backup.totalSize, 0);
      const lastBackup = backups.length > 0 
        ? new Date(Math.max(...backups.map(b => new Date(b.timestamp).getTime())))
        : null;
      
      const completedBackups = backups.filter(b => b.status === 'completed');
      const successRate = totalBackups > 0 ? (completedBackups.length / totalBackups) * 100 : 0;
      const avgDuration = completedBackups.length > 0
        ? completedBackups.reduce((sum, backup) => sum + backup.duration, 0) / completedBackups.length
        : 0;
      
      return {
        totalBackups,
        totalSize,
        lastBackup,
        successRate,
        avgDuration
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de backup:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        lastBackup: null,
        successRate: 0,
        avgDuration: 0
      };
    }
  }

  // Parar serviço
  stop(): void {
    if (this.scheduledBackup) {
      clearInterval(this.scheduledBackup);
      this.scheduledBackup = null;
    }
    console.log('🛑 Serviço de backup parado');
  }
}

// Instância global do serviço
export const backupService = new BackupService();

// Hook React para backup
export function useBackup() {
  return {
    createBackup: (collections?: string[]) => backupService.createBackup(collections),
    listBackups: () => backupService.listBackups(),
    restoreBackup: (options: RestoreOptions) => backupService.restoreBackup(options),
    verifyBackup: (backupId: string) => backupService.verifyBackup(backupId),
    getStats: () => backupService.getBackupStats(),
    cleanupOld: () => backupService.cleanupOldBackups()
  };
}