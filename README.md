
# ENY-GNA (Global Network Architecture) Lab 🚀

> **Sistema Empresarial Completo de Gestão e Controle**
> 
> Desenvolvido por **ENY-GNA Lab** - Arquitetura de Rede Global

---

## 🌟 Visão Geral

O **ENY-GNA Lab** é uma plataforma empresarial completa e robusta, desenvolvida com tecnologias de ponta para oferecer soluções integradas de gestão empresarial. Nossa arquitetura moderna garante escalabilidade, segurança e performance para empresas de todos os tamanhos.

## 🎯 Sistemas Disponíveis

### 🕒 **Sistema de Ponto Inteligente**
- Controle de ponto com GPS e reconhecimento facial
- Geofencing avançado para controle de localização
- Relatórios detalhados e analytics em tempo real
- Cálculo automático de horas e remuneração
- Dashboard do colaborador com resumo de ganhos
- Exportação de folha de pagamento

### 🎫 **Help Desk com IA**
- Sistema de chamados/tickets integrado com IA
- Gerenciamento automático de tickets
- Suporte multi-nível (Colaborador/Admin/Super Admin)
- Central de inteligência com machine learning
- Chat assistente com GPT e Gemini AI

### 💼 **Sistema de Vendas (CRM)**
- CRM avançado e gestão comercial
- Pipeline de vendas automatizado
- Relatórios de performance comercial
- Integração com sistemas financeiros

### 📄 **Gerador de Documentos**
- Criação automática de documentos e relatórios
- Templates personalizáveis
- Assinatura eletrônica integrada
- Exportação em PDF com jsPDF

### 🚗 **Gerenciamento de Frota**
- Sistema neural de controle de frotas com IA
- Rastreamento GPS em tempo real
- Monitoramento de veículos
- Relatórios de desempenho

### 💰 **Sistema Financeiro**
- Gestão financeira e contábil completa
- Controle de fluxo de caixa
- OCR para processamento de notas fiscais
- Classificação automática de transações
- Relatórios fiscais automatizados
- Integração bancária via API

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 15.4.6 + TypeScript + Tailwind CSS
- **Backend:** Firebase (Firestore, Auth, Functions)
- **Autenticação:** Multi-nível com claims customizados
- **IA/ML:** OpenAI GPT + Google Gemini AI
- **Mapas:** Leaflet + React Leaflet
- **PDFs:** jsPDF + jsPDF AutoTable
- **Animações:** Framer Motion
- **Segurança:** Criptografia avançada + Auditoria completa
- **Analytics:** Sistema próprio de monitoramento
- **PWA:** Progressive Web App com offline support

## 🏗️ Arquitetura do Sistema

### 📁 Estrutura de Pastas
```
enygna/
├── app/                    # Next.js App Router
│   ├── admin/             # Painel administrativo
│   ├── chamados/          # Sistema de tickets/help desk
│   ├── colaborador/       # Dashboard do colaborador
│   ├── documentos/        # Gerador de documentos
│   ├── empresa/           # Dashboard empresarial
│   ├── financeiro/        # Sistema financeiro
│   ├── frota/             # Gerenciamento de frota
│   ├── planos/            # Gestão de planos
│   └── api/               # API Routes
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   ├── lib/              # Utilitários e serviços
│   ├── hooks/            # Hooks customizados
│   └── types/            # Definições TypeScript
├── public/               # Arquivos estáticos + PWA
└── scripts/              # Scripts de automação
```

### 🔐 Sistema de Autenticação
- **Níveis de Acesso:**
  - Colaborador: Acesso básico aos sistemas
  - Admin: Gestão de empresa e colaboradores
  - Super Admin: Controle total do sistema
- **Recursos de Segurança:**
  - Claims customizados Firebase
  - Auditoria completa de ações
  - Criptografia end-to-end
  - LGPD/GDPR compliance

### 🤖 Inteligência Artificial
- **OpenAI GPT Integration:** Assistente inteligente para suporte
- **Google Gemini AI:** Análise avançada de documentos
- **OCR Service:** Processamento automático de documentos
- **Agent System:** Sistema de agentes para correções automáticas

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js 22.17.0+
- npm/yarn
- Conta Firebase
- Chaves API (OpenAI, Gemini)

### Instalação
```bash
# Clone o repositório
git clone https://github.com/enygnadev/enygna.git

# Entre no diretório
cd enygna

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas chaves

# Execute em modo desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

### Variáveis de Ambiente
```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
# ... outras configs Firebase

# APIs de IA
OPENAI_API_KEY=sua_openai_key
GEMINI_API_KEY=sua_gemini_key

# APIs de Dados
NEXT_PUBLIC_CNPJA_API_TOKEN=seu_token_cnpj
NEXT_PUBLIC_APICPF_TOKEN=seu_token_cpf
```

## 🚀 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento (porta 5000)
npm run build        # Build de produção
npm start            # Servidor de produção
npm run lint         # Análise de código
npm run typecheck    # Verificação TypeScript
npm run fix:red      # Correção automática de erros TS
```

## 📊 Funcionalidades Avançadas

### 🌍 **Geolocalização GPS**
- Controle de ponto por localização
- Mapeamento de frotas
- Geofencing para áreas de trabalho

### 📱 **PWA (Progressive Web App)**
- Instalação nativa em dispositivos
- Funcionamento offline
- Notificações push
- Service Workers

### 📈 **Analytics e Monitoramento**
- Sistema de monitoramento em tempo real
- Health checks automatizados
- Métricas de performance
- Logs detalhados

### 🔄 **Cache Inteligente**
- Sistema de cache multinível
- Otimização de performance
- Cache de dados offline

## 🎨 Sistema de Temas

- **Tema Claro/Escuro:** Alternância automática
- **Cores Customizáveis:** Paleta de cores adaptável
- **Responsivo:** Design mobile-first
- **Acessibilidade:** Conformidade WCAG

## 📋 Planos e Preços

### 🆓 **Teste Gratuito** - 30 dias
- Acesso completo a todos os sistemas
- Até 5 colaboradores
- 1 empresa
- Suporte básico

### 💼 **Profissional** - R$ 29,90/mês
- Até 100 colaboradores
- 3 empresas
- Todos os recursos avançados
- Suporte prioritário
- Integração com IA

### 🏢 **Enterprise** - R$ 99,90/mês
- Colaboradores ilimitados
- Empresas ilimitadas
- IA e Machine Learning
- API customizada
- Suporte 24/7
- SLA 99.9%

## 🔧 Desenvolvimento

### Contribuindo
1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

### Estrutura de Commits
```
tipo(escopo): descrição

feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
```

## 📚 Documentação Técnica

### APIs Implementadas
- `/api/admin/*` - Gestão administrativa
- `/api/ai/assist` - Assistente IA
- `/api/claims` - Gestão de permissões
- `/api/financeiro/*` - Sistema financeiro
- `/api/notifications/*` - Sistema de notificações
- `/api/users` - Gestão de usuários

### Componentes Principais
- `ProtectedRoute` - Proteção de rotas
- `ThemeSelector` - Seletor de temas
- `Tutorial` - Sistema de onboarding
- `PunchButton` - Registro de ponto
- `LocationMap` - Mapas interativos

## 🌐 Deploy e Produção

### Deploy no Replit
1. Conecte seu GitHub ao Replit
2. Configure as variáveis de ambiente
3. Execute `npm run build`
4. Deploy automático via Replit

### Configuração de Produção
- Porta: 5000 (otimizada para Replit)
- Host: 0.0.0.0 (acessível externamente)
- SSL/HTTPS automático
- CDN integrado

## 📞 Suporte e Contato

- **Email:** guga1trance@gmail.com
- **GitHub:** [github.com/enygnadev](https://github.com/enygnadev)
- **Issues:** [Reportar Bug](https://github.com/enygnadev/enygna/issues)
- **Website:** [ENY-GNA Lab](https://enygna.replit.app)

## 🏆 Status do Projeto

- ✅ Sistema de Autenticação Multi-nível
- ✅ Dashboard Colaborador com Ponto GPS
- ✅ Sistema de Chamados com IA
- ✅ Gerador de Documentos
- ✅ Sistema Financeiro com OCR
- ✅ Gerenciamento de Frota
- ✅ PWA com Offline Support
- ✅ Sistema de Temas Avançado
- ✅ Integração IA (OpenAI + Gemini)
- 🔄 Sistema de Vendas (CRM) - Em desenvolvimento
- 🔄 Recursos Humanos - Em desenvolvimento

## 📄 Licença

© 2024 ENY-GNA (Global Network Architecture) Lab. Todos os direitos reservados.

Este projeto é proprietário e confidencial. O uso, reprodução ou distribuição sem autorização é estritamente proibida.

---

**Desenvolvido com ❤️ por ENY-GNA Lab**
*Inovação em Arquitetura de Rede Global*

### 🎯 Próximas Implementações
- [ ] Sistema de Recursos Humanos completo
- [ ] Analytics avançado com Machine Learning
- [ ] Integração com ERPs externos
- [ ] App móvel nativo
- [ ] Blockchain para auditoria
- [ ] IoT para controle industrial
