const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');

const execAsync = promisify(exec);

class SecurityChecker {
  constructor() {
    this.checks = [];
  }

  async runAllChecks() {
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

  async checkFirestoreRules() {
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

  async checkStorageRules() {
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

  async checkNextConfig() {
    try {
      const config = await fs.readFile('next.config.js', 'utf-8');

      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
        'Content-Security-Policy'
      ];

      let missingHeaders = [];
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

  async checkEnvironmentVars() {
    try {
      // Load .env.local for checking
      const envLocal = await fs.readFile('.env.local', 'utf-8').catch(() => '');
      const envExample = await fs.readFile('.env.local.example', 'utf-8');
      const requiredVars = envExample.match(/^[A-Z_]+=.*/gm) || [];

      let missingVars = [];
      requiredVars.forEach(line => {
        const varName = line.split('=')[0];
        if (!envLocal.includes(`${varName}=`) && !process.env[varName]) {
          missingVars.push(varName);
        }
      });

      // Add NODE_ENV check specifically (verificar no arquivo .env.local também)
      if (!process.env.NODE_ENV && !envLocal.includes('NODE_ENV=')) {
        missingVars.push('NODE_ENV');
      }

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

  async checkAdminSDKUsage() {
    try {
      // Use find to get all .ts and .tsx files, excluding node_modules and .next
      const { stdout } = await execAsync('find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec grep -H "firebase-admin" {} \; || true');

      const clientFiles = stdout.split('\n').filter(line => {
        if (!line) return false;
        const filePath = line.split(':')[0];
        // Exclude files in /api/ or files named route.ts
        return !filePath.includes('/api/') && !filePath.endsWith('route.ts');
      });

      // Filter out false positives from grep (e.g., comments, string literals)
      const adminSDKImports = clientFiles.filter(line => {
        const filePath = line.split(':')[0];
        const fileContent = line.split(':')[1];
        return (
          (fileContent.includes('import admin from "firebase-admin"') || 
           fileContent.includes('import * as admin from "firebase-admin"')) &&
          !fileContent.startsWith('//') && !fileContent.startsWith('*')
        );
      });


      if (adminSDKImports.length > 0) {
        this.addCheck('Admin SDK: Client-side', 'fail', 
          `Admin SDK usado no client: ${adminSDKImports.length} arquivos`);
      } else {
        this.addCheck('Admin SDK: Client-side', 'pass', 'Admin SDK apenas no servidor');
      }

    } catch (error) {
      this.addCheck('Admin SDK: Client-side', 'pass', 'Admin SDK não encontrado no client');
    }
  }

  async checkIndexes() {
    try {
      const indexes = await fs.readFile('firestore.indexes.json', 'utf-8');
      const indexData = JSON.parse(indexes);

      if (indexData.indexes && indexData.indexes.length > 0) {
        const empresaIndexes = indexData.indexes.filter(index => 
          index.fields && index.fields.some(field => 
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

  async checkSecurityHelpers() {
    try {
      // Verificar ambos os arquivos de segurança
      let securityContent = '';

      try {
        const security = await fs.readFile('src/lib/security.ts', 'utf-8');
        securityContent += security;
      } catch (e) {
        // Arquivo não existe, tudo bem
      }

      try {
        const securityHelpers = await fs.readFile('src/lib/securityHelpers.ts', 'utf-8');
        securityContent += securityHelpers;
      } catch (e) {
        // Arquivo não existe, tudo bem
      }

      if (!securityContent) {
        this.addCheck('Security: Helpers', 'fail', 'Nenhum arquivo de segurança encontrado');
        return;
      }

      const helpers = ['getUserClaims', 'hasRole', 'isSuperAdmin', 'isAdmin', 'belongsToCompany'];
      let missingHelpers = [];

      helpers.forEach(helper => {
        if (!securityContent.includes(`export async function ${helper}`) && 
            !securityContent.includes(`export function ${helper}`)) {
          missingHelpers.push(helper);
        }
      });

      if (missingHelpers.length === 0) {
        this.addCheck('Security: Helpers', 'pass', 'Todos os helpers implementados');
      } else {
        this.addCheck('Security: Helpers', 'warning', `Helpers faltando: ${missingHelpers.join(', ')}`);
      }

      // Verificar estrutura de claims
      const hasClaimsStructure = securityContent.includes('UserClaims') && 
                                securityContent.includes('role') && 
                                securityContent.includes('empresaId') &&
                                securityContent.includes('colaborador') &&
                                securityContent.includes('superadmin');

      if (hasClaimsStructure) {
        this.addCheck('Security: Claims Structure', 'pass', 'Estrutura de claims completa');
      } else {
        this.addCheck('Security: Claims Structure', 'warning', 'Estrutura de claims incompleta');
      }

    } catch (error) {
      this.addCheck('Security: Helpers', 'fail', 'Erro ao verificar helpers de segurança');
    }
  }

  addCheck(name, status, message) {
    this.checks.push({ name, status, message });
  }

  printResults() {
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

module.exports = SecurityChecker;