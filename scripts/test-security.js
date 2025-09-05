
const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

class SecurityTester {
  constructor() {
    this.results = [];
    this.baseUrl = 'http://0.0.0.0:5000';
  }

  log(test, status, message) {
    const result = { test, status, message, timestamp: new Date() };
    this.results.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${message}`);
  }

  async testHoneypotEndpoints() {
    const honeypots = ['/api/__debug', '/api/admin/__old'];
    
    for (const endpoint of honeypots) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (response.status === 404 || response.status === 403) {
          this.log('Honeypot', 'PASS', `${endpoint} adequadamente protegido`);
        } else {
          this.log('Honeypot', 'FAIL', `${endpoint} pode estar exposto (status: ${response.status})`);
        }
      } catch (error) {
        this.log('Honeypot', 'WARN', `Erro ao testar ${endpoint}: ${error.message}`);
      }
    }
  }

  async testSecurityHeaders() {
    try {
      const response = await fetch(this.baseUrl);
      const headers = response.headers;
      
      const requiredHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
        'content-security-policy'
      ];

      for (const header of requiredHeaders) {
        if (headers.has(header)) {
          this.log('Headers', 'PASS', `${header} presente`);
        } else {
          this.log('Headers', 'FAIL', `${header} ausente`);
        }
      }
    } catch (error) {
      this.log('Headers', 'FAIL', `Erro ao verificar headers: ${error.message}`);
    }
  }

  testFirestoreRules() {
    try {
      const rules = fs.readFileSync('firestore.rules', 'utf-8');
      
      const criticalChecks = [
        { pattern: /isSuperAdmin\(\)/, name: 'Verificação SuperAdmin' },
        { pattern: /sameCompany\(empresaId\)/, name: 'Isolamento por empresa' },
        { pattern: /email_verified == true/, name: 'Email verificado' },
        { pattern: /request\.auth != null/, name: 'Autenticação obrigatória' }
      ];

      for (const check of criticalChecks) {
        if (check.pattern.test(rules)) {
          this.log('Firestore Rules', 'PASS', check.name);
        } else {
          this.log('Firestore Rules', 'WARN', `${check.name} pode estar ausente`);
        }
      }
    } catch (error) {
      this.log('Firestore Rules', 'FAIL', `Erro ao verificar regras: ${error.message}`);
    }
  }

  testEnvironmentVariables() {
    const requiredEnvs = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL'
    ];

    for (const env of requiredEnvs) {
      if (process.env[env]) {
        this.log('Environment', 'PASS', `${env} configurado`);
      } else {
        this.log('Environment', 'WARN', `${env} não configurado`);
      }
    }
  }

  async testRateLimiting() {
    try {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(fetch(`${this.baseUrl}/api/health`));
      }

      const responses = await Promise.all(promises);
      const blocked = responses.filter(r => r.status === 429).length;

      if (blocked > 0) {
        this.log('Rate Limiting', 'PASS', `Rate limiting ativo (${blocked} bloqueadas)`);
      } else {
        this.log('Rate Limiting', 'WARN', 'Rate limiting pode não estar ativo');
      }
    } catch (error) {
      this.log('Rate Limiting', 'WARN', `Erro ao testar rate limiting: ${error.message}`);
    }
  }

  async testAuthentication() {
    try {
      // Testar endpoint protegido sem autenticação
      const response = await fetch(`${this.baseUrl}/api/admin/users`);
      
      if (response.status === 401 || response.status === 403) {
        this.log('Authentication', 'PASS', 'Endpoints protegidos adequadamente');
      } else {
        this.log('Authentication', 'FAIL', `Endpoint admin acessível sem auth (status: ${response.status})`);
      }
    } catch (error) {
      this.log('Authentication', 'WARN', `Erro ao testar autenticação: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🔒 Iniciando Testes de Segurança...\n');

    await this.testSecurityHeaders();
    await this.testHoneypotEndpoints();
    this.testFirestoreRules();
    this.testEnvironmentVariables();
    await this.testRateLimiting();
    await this.testAuthentication();

    this.generateReport();
  }

  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log('\n📊 Relatório de Testes de Segurança:');
    console.log(`✅ Aprovados: ${passed}`);
    console.log(`⚠️ Avisos: ${warnings}`);
    console.log(`❌ Falhas: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 Todos os testes críticos de segurança passaram!');
      process.exit(0);
    } else {
      console.log('\n🔧 Corrija as falhas antes de fazer o deploy.');
      process.exit(1);
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  new SecurityTester().runAllTests();
}

module.exports = SecurityTester;
