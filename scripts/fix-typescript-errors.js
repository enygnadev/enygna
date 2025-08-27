
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fixes para aplicar automaticamente
const fixes = [
  {
    file: 'src/lib/lgpd.ts',
    fixes: [
      {
        search: /export function useLGPDConsent\(\) {/g,
        replace: 'export function useLGPDConsent() {\n  const { useState } = React;'
      },
      {
        search: /const \[consents, setConsents\] = useState<LGPDConsent\[\]>\(\[\]\);/g,
        replace: 'const [consents, setConsents] = useState<LGPDConsent[]>([]);'
      },
      {
        search: /export function LGPDConsentBanner\({ userId }: { userId: string }\) {/g,
        replace: 'export function LGPDConsentBanner({ userId }: { userId: string }) {\n  const { useState, useEffect } = React;'
      }
    ]
  },
  {
    file: 'src/lib/production.ts',
    fixes: [
      {
        search: /export function useProductionMonitoring\(\) {/g,
        replace: 'export function useProductionMonitoring() {\n  const { useEffect } = React;'
      }
    ]
  }
];

function applyFixes() {
  console.log('🔧 Aplicando correções TypeScript...');
  
  fixes.forEach(({ file, fixes: fileFixes }) => {
    const filePath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    fileFixes.forEach(({ search, replace }) => {
      if (content.match(search)) {
        content = content.replace(search, replace);
        changed = true;
      }
    });
    
    if (changed) {
      // Criar backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, fs.readFileSync(filePath));
      
      // Aplicar correções
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${file} - Correções aplicadas (backup: ${path.basename(backupPath)})`);
    } else {
      console.log(`ℹ️  ${file} - Nenhuma correção necessária`);
    }
  });
  
  console.log('🎉 Correções concluídas!');
}

if (require.main === module) {
  applyFixes();
}

module.exports = { applyFixes };
