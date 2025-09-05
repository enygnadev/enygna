
#!/bin/bash

echo "🚀 Iniciando processo de deploy com verificações de segurança..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verificações de segurança
log_info "Executando verificações de segurança..."
npm run security:check || {
    log_error "Verificações de segurança falharam!"
    exit 1
}

# 2. Audit de dependências
log_info "Verificando vulnerabilidades nas dependências..."
npm audit --audit-level moderate || {
    log_warning "Vulnerabilidades encontradas nas dependências. Revise antes de continuar."
}

# 3. Verificação de TypeScript
log_info "Verificando tipos TypeScript..."
npx tsc --noEmit || {
    log_error "Erros de TypeScript encontrados!"
    exit 1
}

# 4. Testes de segurança
log_info "Executando testes de segurança..."
npm run test:security || {
    log_warning "Alguns testes de segurança falharam."
}

# 5. Build da aplicação
log_info "Construindo aplicação..."
npm run build || {
    log_error "Build falhou!"
    exit 1
}

# 6. Verificar arquivos críticos
log_info "Verificando arquivos críticos de segurança..."
CRITICAL_FILES=(
    "firestore.rules"
    "storage.rules"
    "next.config.js"
    ".env.local"
    "src/middleware.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Arquivo crítico não encontrado: $file"
        exit 1
    fi
done

# 7. Deploy Firebase Rules
log_info "Fazendo deploy das regras do Firebase..."
firebase deploy --only firestore:rules,storage:rules || {
    log_error "Deploy das regras falhou!"
    exit 1
}

# 8. Deploy da aplicação
log_info "Deploy da aplicação para Replit..."
# O deploy no Replit acontece automaticamente, mas podemos verificar a saúde do serviço
curl -f http://0.0.0.0:5000/api/health/security || {
    log_warning "Health check da aplicação falhou"
}

log_info "✅ Deploy concluído com sucesso!"

# 9. Verificações pós-deploy
log_info "Executando verificações pós-deploy..."
sleep 5

# Verificar se a aplicação está respondendo
log_info "Verificando se a aplicação está online..."
curl -f http://0.0.0.0:5000/ || {
    log_warning "Aplicação pode não estar respondendo corretamente"
}

# Verificar headers de segurança
log_info "Verificando headers de segurança..."
curl -I http://0.0.0.0:5000/ | grep -E "(X-Frame-Options|Strict-Transport-Security|Content-Security-Policy)" || {
    log_warning "Headers de segurança podem estar faltando"
}

log_info "🎉 Deploy e verificações concluídos!"
