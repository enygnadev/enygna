
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

class SecurityChecker {
  private checks: SecurityCheck[] = [];

  async runAllChecks(): Promise<void> {
    console.log('🔍 Iniciando verificação de segurança...\n');

    await this.checkFirestoreRules();
    await this.checkStorageRules();
    await this.checkNextConfig();
    await this.checkEnvironmentVars();
    await this.checkAdminSDKUsage();
    await this.checkIndexes();
    await this.checkSecurityHelpers();

    this.printResults();
  }

  private async checkFirestoreRules(): Promise<void> {
    try {
      const rules = await fs.readFile('firestore.rules', 'utf-8');
      
      // Verificar isolamento por empresa
      if (rules.includes('sameCompany(empresaId)') || rules.includes('isCompanyOwnerOrAuthorized')) {
        this.addCheck('Firestore: Isolamento por empresa', 'pass', 'Isolamento implementado corretamente');
      } else {
        this.addCheck('Firestore: Isolamento por empresa', 'fail', 'Falta isolamento por empresa');
      }

      // Verificar regras wildcards perigosas
      if (rules.includes('/{path=**}/{subcollection}/{document}') && 
          !rules.includes('allow read, write: if isSuperAdmin();')) {
        this.addCheck('Firestore: Wildcards seguros', 'fail', 'Wildcard perigoso detectado');
      } else {
        this.addCheck('Firestore: Wildcards seguros', 'pass', 'Wildcards seguros');
      }

      // Verificar email_verified no ponto
      if (rules.includes('email_verified == true')) {
        this.addCheck('Firestore: Email verificado', 'pass', 'Exigência de email verificado implementada');
      } else {
        this.addCheck('Firestore: Email verificado', 'warning', 'Email verificado pode não estar sendo exigido');
      }

    } catch (error) {
      this.addCheck('Firestore Rules', 'fail', 'Erro ao ler firestore.rules');
    }
  }

  private async checkStorageRules(): Promise<void> {
    try {
      const rules = await fs.readFile('storage.rules', 'utf-8');
      
      if (rules.includes('sameCompany(companyId)')) {
        this.addCheck('Storage: Isolamento por empresa', 'pass', 'Isolamento implementado');
      } else {
        this.addCheck('Storage: Isolamento por empresa', 'fail', 'Falta isolamento no Storage');
      }

      if (rules.includes('validFileSize()') && rules.includes('validFileType()')) {
        this.addCheck('Storage: Validações de arquivo', 'pass', 'Validações implementadas');
      } else {
        this.addCheck('Storage: Validações de arquivo', 'warning', 'Faltam validações de arquivo');
      }

    } catch (error) {
      this.addCheck('Storage Rules', 'fail', 'Erro ao ler storage.rules');
    }
  }

  private async checkNextConfig(): Promise<void> {
    try {
      const config = await fs.readFile('next.config.js', 'utf-8');
      
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
        'Content-Security-Policy'
      ];

      let missingHeaders: string[] = [];
      securityHeaders.forEach(header => {
        if (!config.includes(header)) {
          missingHeaders.push(header);
        }
      });

      if (missingHeaders.length === 0) {
        this.addCheck('Next.js: Headers de segurança', 'pass', 'Todos os headers implementados');
      } else {
        this.addCheck('Next.js: Headers de segurança', 'warning', 
          `Headers faltando: ${missingHeaders.join(', ')}`);
      }

      if (config.includes('serverExternalPackages')) {
        this.addCheck('Next.js: Server External Packages', 'pass', 'Admin SDK isolado');
      } else {
        this.addCheck('Next.js: Server External Packages', 'warning', 'Admin SDK pode estar no bundle client');
      }

    } catch (error) {
      this.addCheck('Next.js Config', 'fail', 'Erro ao ler next.config.js');
    }
  }

  private async checkEnvironmentVars(): Promise<void> {
    try {
      const envExample = await fs.readFile('.env.local.example', 'utf-8');
      const requiredVars = envExample.match(/^[A-Z_]+=.*/gm) || [];
      
      let missingVars: string[] = [];
      requiredVars.forEach(line => {
        const varName = line.split('=')[0];
        if (!process.env[varName]) {
          missingVars.push(varName);
        }
      });

      if (missingVars.length === 0) {
        this.addCheck('Environment: Variáveis', 'pass', 'Todas as variáveis configuradas');
      } else {
        this.addCheck('Environment: Variáveis', 'warning', 
          `Variáveis faltando: ${missingVars.slice(0, 3).join(', ')}${missingVars.length > 3 ? '...' : ''}`);
      }

    } catch (error) {
      this.addCheck('Environment Variables', 'warning', 'Não foi possível verificar .env');
    }
  }

  private async checkAdminSDKUsage(): Promise<void> {
    try {
      const { stdout } = await execAsync('grep -r "firebase-admin" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next .');
      
      const clientFiles = stdout.split('\n').filter(line => 
        line.includes('.tsx') || 
        (line.includes('.ts') && !line.includes('/api/') && !line.includes('route.ts'))
      );

      if (clientFiles.length > 0) {
        this.addCheck('Admin SDK: Client-side', 'fail', 
          `Admin SDK usado no client: ${clientFiles.length} arquivos`);
      } else {
        this.addCheck('Admin SDK: Client-side', 'pass', 'Admin SDK apenas no servidor');
      }

    } catch (error) {
      this.addCheck('Admin SDK: Client-side', 'pass', 'Admin SDK não encontrado no client');
    }
  }

  private async checkIndexes(): Promise<void> {
    try {
      const indexes = await fs.readFile('firestore.indexes.json', 'utf-8');
      const indexData = JSON.parse(indexes);
      
      if (indexData.indexes && indexData.indexes.length > 0) {
        const empresaIndexes = indexData.indexes.filter((index: any) => 
          index.fields && index.fields.some((field: any) => 
            field.fieldPath === 'empresaId' || field.fieldPath === 'companyId'
          )
        );

        if (empresaIndexes.length >= 5) {
          this.addCheck('Firestore: Índices', 'pass', `${empresaIndexes.length} índices por empresa`);
        } else {
          this.addCheck('Firestore: Índices', 'warning', 'Poucos índices por empresa');
        }
      } else {
        this.addCheck('Firestore: Índices', 'warning', 'Nenhum índice configurado');
      }

    } catch (error) {
      this.addCheck('Firestore: Índices', 'fail', 'Erro ao ler firestore.indexes.json');
    }
  }

  private async checkSecurityHelpers(): Promise<void> {
    try {
      const security = await fs.readFile('src/lib/security.ts', 'utf-8');
      
      const helpers = ['withEmpresa', 'secureQuery', 'hasAccess', 'getClaims'];
      let missingHelpers: string[] = [];

      helpers.forEach(helper => {
        if (!security.includes(`export async function ${helper}`) && 
            !security.includes(`export function ${helper}`)) {
          missingHelpers.push(helper);
        }
      });

      if (missingHelpers.length === 0) {
        this.addCheck('Security: Helpers', 'pass', 'Todos os helpers implementados');
      } else {
        this.addCheck('Security: Helpers', 'warning', 
          `Helpers faltando: ${missingHelpers.join(', ')}`);
      }

      // Verificar configuração de claims
      if (security.includes('role:') && security.includes('empresaId:') && security.includes('sistemasAtivos:')) {
        this.addCheck('Security: Claims Structure', 'pass', 'Estrutura de claims correta');
      } else {
        this.addCheck('Security: Claims Structure', 'warning', 'Estrutura de claims incompleta');
      }

      // Verificar middleware de segurança
      const middleware = await fs.readFile('src/middleware.ts', 'utf-8');
      if (middleware.includes('HTTPOnly') && middleware.includes('CSRF') && middleware.includes('rate')) {
        this.addCheck('Middleware: Security Features', 'pass', 'Recursos de segurança implementados');
      } else {
        this.addCheck('Middleware: Security Features', 'warning', 'Recursos de segurança podem estar faltando');
      }

    } catch (error) {
      this.addCheck('Security: Helpers', 'fail', 'Erro ao verificar security.ts');
    }
  }

  private async checkCookiesSecurity(): Promise<void> {
    try {
      const middleware = await fs.readFile('src/middleware.ts', 'utf-8');
      
      const securityFeatures = [
        'HttpOnly',
        'Secure',
        'SameSite',
        'CSRF'
      ];

      let missingSecurity: string[] = [];
      securityFeatures.forEach(feature => {
        if (!middleware.includes(feature)) {
          missingSecurity.push(feature);
        }
      });

      if (missingSecurity.length === 0) {
        this.addCheck('Cookies: Security', 'pass', 'Cookies seguros configurados');
      } else {
        this.addCheck('Cookies: Security', 'warning', 
          `Recursos faltando: ${missingSecurity.join(', ')}`);
      }

    } catch (error) {
      this.addCheck('Cookies: Security', 'fail', 'Erro ao verificar middleware');
    }
  }

  private addCheck(name: string, status: 'pass' | 'fail' | 'warning', message: string): void {
    this.checks.push({ name, status, message });
  }

  private printResults(): void {
    console.log('\n📊 Resultados da Verificação de Segurança:\n');
    
    const passed = this.checks.filter(c => c.status === 'pass').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;
    const warnings = this.checks.filter(c => c.status === 'warning').length;

    this.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : 
                   check.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.message}`);
    });

    console.log(`\n📈 Resumo: ${passed} ✅ | ${warnings} ⚠️ | ${failed} ❌`);
    
    if (failed === 0) {
      console.log('\n🎉 Aplicação pronta para produção!');
    } else {
      console.log('\n🔧 Corrija os itens marcados com ❌ antes de ir para produção.');
    }
  }
}

// Executar verificação
if (require.main === module) {
  new SecurityChecker().runAllChecks().catch(console.error);
}

export default SecurityChecker;
