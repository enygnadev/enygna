
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const bootstrapPagePath = path.join(__dirname, '..', 'app', 'bootstrap-admin', 'page.tsx');
const bootstrapDirPath = path.join(__dirname, '..', 'app', 'bootstrap-admin');

function removeBootstrapPage() {
  try {
    // Verificar se a página existe
    if (fs.existsSync(bootstrapPagePath)) {
      // Remover o arquivo
      fs.unlinkSync(bootstrapPagePath);
      console.log('✅ Página de bootstrap removida:', bootstrapPagePath);
      
      // Remover o diretório se estiver vazio
      if (fs.existsSync(bootstrapDirPath)) {
        const files = fs.readdirSync(bootstrapDirPath);
        if (files.length === 0) {
          fs.rmdirSync(bootstrapDirPath);
          console.log('✅ Diretório de bootstrap removido:', bootstrapDirPath);
        }
      }
    } else {
      console.log('ℹ️ Página de bootstrap já foi removida ou não existe.');
    }

    console.log('\n🔒 Página de bootstrap removida com sucesso!');
    console.log('🚀 Seu sistema está agora seguro.');
    
  } catch (error) {
    console.error('❌ Erro ao remover página de bootstrap:', error.message);
    process.exit(1);
  }
}

// Executar a remoção
removeBootstrapPage();
