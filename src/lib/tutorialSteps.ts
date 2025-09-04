
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
}

export const homeTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Portal Multissistema! 🚀',
    content: 'Este é o seu portal de entrada para todos os nossos sistemas empresariais. Vamos fazer um tour rápido para você conhecer todas as funcionalidades?',
    showSkip: true
  },
  {
    id: 'theme',
    title: 'Personalize seu Tema 🎨',
    content: 'Você pode alterar o tema da aplicação clicando no seletor de tema no canto superior direito. Escolha entre modo claro, escuro ou automático.',
    target: '.theme-selector-container',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'user-status',
    title: 'Status do Usuário 👤',
    content: 'Aqui você pode ver seu status de conexão, informações do usuário logado e acessar opções de conta.',
    target: '.user-status',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'systems',
    title: 'Acesse os Sistemas 📱',
    content: 'Clique em "Acessar Plataforma" para visualizar todos os sistemas disponíveis para sua conta.',
    target: '.primary-cta',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'complete',
    title: 'Tutorial Concluído! ✅',
    content: 'Agora você está pronto para explorar todos os nossos sistemas. Boa navegação e produtividade!',
    showSkip: true
  }
];

export const sistemasTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-sistemas',
    title: 'Central de Sistemas 🏢',
    content: 'Bem-vindo à central de sistemas! Aqui você encontra todos os sistemas disponíveis para sua empresa.',
    showSkip: true
  },
  {
    id: 'active-systems',
    title: 'Seus Sistemas Ativos 🎯',
    content: 'Esta seção mostra todos os sistemas que você tem permissão para acessar. Os badges coloridos indicam cada sistema disponível.',
    target: '.sistemas-ativos',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'system-cards',
    title: 'Cartões dos Sistemas 📋',
    content: 'Cada cartão representa um sistema. Clique no cartão para acessar o sistema desejado. Sistemas bloqueados são indicados claramente.',
    target: '.system-card',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'system-status',
    title: 'Status dos Sistemas 🔐',
    content: 'Verde = Acesso liberado, Amarelo = Em desenvolvimento, Vermelho = Sem permissão. Entre em contato com o admin para solicitar acesso.',
    target: '.system-status',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'quick-access',
    title: 'Acesso Rápido ⚡',
    content: 'Use os atalhos no header para navegação rápida: voltar ao início, tutorial, sair da conta.',
    target: '.quick-access',
    placement: 'bottom',
    showSkip: true
  }
];

export const pontoAuthTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-ponto-auth',
    title: 'Autenticação do Sistema de Ponto 🕒',
    content: 'Bem-vindo ao sistema de ponto eletrônico! Aqui você fará login para acessar o controle de ponto.',
    showSkip: true
  },
  {
    id: 'login-options',
    title: 'Opções de Login 🔑',
    content: 'Escolha como você quer acessar: como Empresa (para gestores) ou como Colaborador (para funcionários).',
    target: '.login-options',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'security-info',
    title: 'Segurança e GPS 🛡️',
    content: 'O sistema utiliza GPS para verificação de localização e garante a segurança dos dados com criptografia avançada.',
    target: '.security-info',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'features-overview',
    title: 'Recursos Disponíveis 📊',
    content: 'Controle de ponto, relatórios, exportações, geolocalização e muito mais estão disponíveis após o login.',
    target: '.features-overview',
    placement: 'top',
    showSkip: true
  }
];

export const pontoEmpresaTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-empresa',
    title: 'Dashboard Empresarial Modernizado 🏢',
    content: 'Bem-vindo ao novo dashboard empresarial! Aqui você pode gerenciar seus colaboradores e controlar o ponto eletrônico com tecnologia avançada.',
    showSkip: true
  },
  {
    id: 'sidebar-navigation',
    title: 'Navegação Lateral 📂',
    content: 'Use a barra lateral para selecionar colaboradores e acessar informações rápidas. É responsiva e pode ser recolhida em telas menores.',
    target: '.sidebar',
    placement: 'right',
    showSkip: true
  },
  {
    id: 'select-collaborator',
    title: 'Selecione um Colaborador 👥',
    content: 'Use o seletor na barra lateral para escolher qual colaborador deseja visualizar. As informações serão atualizadas automaticamente.',
    target: '.user-selector',
    placement: 'right',
    showSkip: true
  },
  {
    id: 'tabs-navigation',
    title: 'Navegação por Abas 🗂️',
    content: 'Use as abas para navegar entre diferentes seções: Visão Geral, Sessões, Colaboradores, Analytics, Geolocalização e Folha de Pagamento.',
    target: '.tab-navigation',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'metrics-overview',
    title: 'Métricas em Tempo Real 📈',
    content: 'Visualize métricas importantes como horas trabalhadas, ganhos, status das sessões e estatísticas dos colaboradores em tempo real.',
    target: '.metrics-grid',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'charts-analytics',
    title: 'Gráficos e Analytics 📊',
    content: 'Visualize dados em gráficos interativos com D3.js, acompanhe tendências e analise o desempenho da equipe.',
    target: '.charts-section',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'actions-panel',
    title: 'Painel de Ações ⚡',
    content: 'Execute ações rápidas como aprovar sessões pendentes, exportar relatórios e adicionar novos colaboradores.',
    target: '.actions-panel',
    placement: 'top',
    showSkip: true
  }
];

export const pontoColaboradorTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-colaborador',
    title: 'Dashboard do Colaborador 👋',
    content: 'Bem-vindo ao seu painel pessoal! Aqui você pode registrar ponto, acompanhar ganhos e gerenciar seu perfil.',
    showSkip: true
  },
  {
    id: 'live-metrics',
    title: 'Métricas ao Vivo ⏱️',
    content: 'Acompanhe em tempo real suas horas trabalhadas hoje, ganhos e status do GPS. As informações são atualizadas automaticamente.',
    target: '.live-metrics',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'punch-button',
    title: 'Registro de Ponto 🎯',
    content: 'Use o botão de ponto para registrar entrada e saída do trabalho. O sistema captura sua localização automaticamente.',
    target: '.punch-skin',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'gps-test',
    title: 'Teste de GPS 🗺️',
    content: 'Sempre teste o GPS antes de registrar o ponto. Isso garante que sua localização seja capturada corretamente.',
    target: '.gps-test',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'tab-navigation',
    title: 'Navegação por Abas 📑',
    content: 'Use as abas para acessar: Ponto & Ganhos, Remuneração, Regras de Trabalho e Perfil Pessoal.',
    target: '.tab-navigation',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'earnings-summary',
    title: 'Resumo de Ganhos 💰',
    content: 'Acompanhe suas horas trabalhadas e ganhos do dia, semana e mês. Exporte relatórios quando necessário.',
    target: '#export',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'profile-settings',
    title: 'Configurações de Perfil ⚙️',
    content: 'Configure seu perfil, remuneração e regras de trabalho nas abas. Não esqueça de salvar as alterações.',
    target: '.profile-section',
    placement: 'top',
    showSkip: true
  }
];

export const chamadosTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-chamados',
    title: 'Sistema de Chamados TI 🎫',
    content: 'Bem-vindo ao sistema de chamados! Aqui você pode criar tickets de suporte, acompanhar soluções e gerenciar demandas de TI.',
    showSkip: true
  },
  {
    id: 'create-ticket',
    title: 'Criar Novo Chamado ➕',
    content: 'Clique em "Novo Chamado" para criar um ticket de suporte. Forneça o máximo de detalhes possível para uma solução mais rápida.',
    target: '.create-ticket-btn',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'ticket-categories',
    title: 'Categorias de Chamados 📂',
    content: 'Selecione a categoria correta: Hardware, Software, Rede, Acesso, ou Outros. Isso ajuda na priorização e direcionamento.',
    target: '.ticket-categories',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'priority-levels',
    title: 'Níveis de Prioridade 🚨',
    content: 'Defina a prioridade: Baixa, Normal, Alta ou Urgente. Chamados urgentes são tratados imediatamente.',
    target: '.priority-selector',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'view-tickets',
    title: 'Visualizar Chamados 👀',
    content: 'Aqui você pode ver todos os seus chamados, acompanhar status e verificar atualizações. Use os filtros para encontrar tickets específicos.',
    target: '.tickets-list',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'ticket-status',
    title: 'Status dos Tickets 📊',
    content: 'Acompanhe o progresso: Aberto, Em Andamento, Aguardando, Resolvido ou Fechado. Receba notificações de mudanças.',
    target: '.status-indicators',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'communication',
    title: 'Comunicação 💬',
    content: 'Use os comentários para se comunicar com a equipe de TI. Adicione informações extras ou atualizações conforme necessário.',
    target: '.communication-panel',
    placement: 'top',
    showSkip: true
  }
];

export const documentosTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-documentos',
    title: 'Gerador de Documentos 📄',
    content: 'Bem-vindo ao sistema de documentos! Crie contratos, relatórios, propostas e outros documentos profissionais automaticamente.',
    showSkip: true
  },
  {
    id: 'template-selection',
    title: 'Seleção de Templates 📋',
    content: 'Escolha entre diversos templates predefinidos: contratos, propostas, relatórios, certificados e documentos personalizados.',
    target: '.template-gallery',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'document-editor',
    title: 'Editor de Documentos ✏️',
    content: 'Use o editor avançado para personalizar documentos. Adicione campos dinâmicos, imagens, tabelas e formatação profissional.',
    target: '.document-editor',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'dynamic-fields',
    title: 'Campos Dinâmicos 🔄',
    content: 'Insira campos que são preenchidos automaticamente com dados da empresa, clientes ou colaboradores.',
    target: '.dynamic-fields',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'document-preview',
    title: 'Visualização e Exportação 👁️',
    content: 'Visualize o documento antes de finalizar. Exporte em PDF, Word ou imprima diretamente.',
    target: '.preview-panel',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'document-library',
    title: 'Biblioteca de Documentos 📚',
    content: 'Todos os documentos criados ficam salvos na biblioteca. Organize, pesquise e reutilize documentos facilmente.',
    target: '.document-library',
    placement: 'top',
    showSkip: true
  }
];

export const frotaTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-frota',
    title: 'Gerenciamento de Frota 🚗',
    content: 'Bem-vindo ao sistema neural de controle de frotas! Monitore veículos em tempo real com IA e GPS avançado.',
    showSkip: true
  },
  {
    id: 'vehicle-map',
    title: 'Mapa de Veículos 🗺️',
    content: 'Visualize todos os veículos da frota em tempo real no mapa. Clique nos marcadores para ver detalhes específicos.',
    target: '.vehicle-map',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'vehicle-list',
    title: 'Lista de Veículos 🚙',
    content: 'Gerencie todos os veículos: status, localização, combustível, manutenção e histórico de viagens.',
    target: '.vehicle-list',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'tracking-features',
    title: 'Recursos de Rastreamento 📡',
    content: 'Monitore velocidade, rotas, paradas, consumo de combustível e alertas de segurança em tempo real.',
    target: '.tracking-panel',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'alerts-notifications',
    title: 'Alertas e Notificações 🚨',
    content: 'Receba notificações automáticas para manutenção, velocidade excessiva, desvios de rota e emergências.',
    target: '.alerts-panel',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'reports-analytics',
    title: 'Relatórios e Analytics 📊',
    content: 'Analise eficiência da frota, custos operacionais, padrões de uso e otimize a gestão com dados inteligentes.',
    target: '.analytics-section',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'maintenance-schedule',
    title: 'Cronograma de Manutenção 🔧',
    content: 'Agende e acompanhe manutenções preventivas e corretivas. Evite problemas e mantenha a frota operacional.',
    target: '.maintenance-panel',
    placement: 'top',
    showSkip: true
  }
];

export const financeiroTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-financeiro',
    title: 'Sistema Financeiro Avançado 💰',
    content: 'Bem-vindo ao sistema financeiro com OCR e automação fiscal! Gerencie contabilidade, impostos e finanças de forma inteligente.',
    showSkip: true
  },
  {
    id: 'dashboard-overview',
    title: 'Visão Geral Financeira 📈',
    content: 'Acompanhe receitas, despesas, fluxo de caixa e indicadores financeiros em tempo real com gráficos interativos.',
    target: '.financial-dashboard',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'ocr-processing',
    title: 'Processamento OCR 📄',
    content: 'Envie fotos de notas fiscais e recibos. O OCR extrai dados automaticamente e categoriza transações.',
    target: '.ocr-upload',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'tax-automation',
    title: 'Automação Fiscal 🏛️',
    content: 'Calcule impostos automaticamente, gere declarações e mantenha conformidade fiscal sem esforço manual.',
    target: '.tax-panel',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'expense-management',
    title: 'Gestão de Despesas 💳',
    content: 'Categorize despesas, aprove reembolsos, controle orçamentos e monitore gastos por departamento.',
    target: '.expense-tracker',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'invoicing-system',
    title: 'Sistema de Faturamento 📋',
    content: 'Crie faturas profissionais, acompanhe pagamentos, envie lembretes automáticos e gerencie recebíveis.',
    target: '.invoicing-panel',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'financial-reports',
    title: 'Relatórios Financeiros 📊',
    content: 'Gere relatórios detalhados: DRE, balanço patrimonial, fluxo de caixa e análises personalizadas.',
    target: '.reports-section',
    placement: 'top',
    showSkip: true
  }
];

export const crmTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-crm',
    title: 'Sistema CRM Avançado 💼',
    content: 'Bem-vindo ao CRM e gestão comercial! Gerencie leads, vendas, clientes e oportunidades de negócio.',
    showSkip: true
  },
  {
    id: 'leads-management',
    title: 'Gestão de Leads 🎯',
    content: 'Capture, qualifique e converta leads em clientes. Use automação de marketing para nutrir prospects.',
    target: '.leads-panel',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'sales-pipeline',
    title: 'Pipeline de Vendas 📊',
    content: 'Visualize o funil de vendas, acompanhe oportunidades e monitore o progresso de cada negociação.',
    target: '.pipeline-view',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'customer-management',
    title: 'Gestão de Clientes 👥',
    content: 'Mantenha histórico completo de clientes, interações, compras e preferências para atendimento personalizado.',
    target: '.customer-database',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'task-automation',
    title: 'Automação de Tarefas ⚡',
    content: 'Configure workflows automáticos para follow-ups, e-mails de boas-vindas e lembretes de atividades.',
    target: '.automation-panel',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'sales-reports',
    title: 'Relatórios de Vendas 📈',
    content: 'Analise performance de vendas, comissões, metas e ROI com relatórios detalhados e painéis visuais.',
    target: '.sales-analytics',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'communication-hub',
    title: 'Central de Comunicação 📞',
    content: 'Integre e-mails, chamadas, WhatsApp e outros canais em uma única interface para comunicação eficiente.',
    target: '.communication-center',
    placement: 'top',
    showSkip: true
  }
];

export const adminTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-admin',
    title: 'Painel Master Admin 👑',
    content: 'Bem-vindo ao centro de controle absoluto! Gerencie todo o sistema, empresas, usuários e configurações avançadas.',
    showSkip: true
  },
  {
    id: 'metrics-dashboard',
    title: 'Métricas em Tempo Real 📊',
    content: 'Monitore performance do sistema, receita, crescimento, usuários ativos e todas as métricas críticas instantaneamente.',
    target: '.dashboard-metrics',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'navigation-tabs',
    title: 'Navegação Master 🚀',
    content: 'Use as abas para acessar: Dashboard, Empresas, Funcionários, Analytics, Notificações, Relatórios, Configurações e Logs.',
    target: '.navigation-tabs',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'companies-management',
    title: 'Gerenciamento Total de Empresas 🏢',
    content: 'Visualize, edite, ative/desative empresas, gerencie planos, sistemas e controle total das organizações.',
    target: '.companies-section',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'employees-control',
    title: 'Controle de Funcionários 👥',
    content: 'Monitore performance, altere permissões, visualize métricas detalhadas e gerencie todos os usuários do sistema.',
    target: '.employees-section',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'system-settings',
    title: 'Configurações do Sistema ⚙️',
    content: 'Configure parâmetros globais, integrações, APIs, backups automáticos e outras configurações críticas.',
    target: '.system-settings',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'audit-logs',
    title: 'Logs de Auditoria 📋',
    content: 'Monitore todas as ações do sistema, acessos, alterações e eventos para segurança e compliance.',
    target: '.audit-section',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'notifications-center',
    title: 'Central de Notificações 🔔',
    content: 'Gerencie alertas do sistema, notificações para usuários e configurações de comunicação automática.',
    target: '.notifications-section',
    placement: 'top',
    showSkip: true
  }
];

export const fechamentoTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-fechamento',
    title: 'Fechamento de Período 📅',
    content: 'Bem-vindo ao sistema de fechamento! Processe folhas de pagamento, relatórios mensais e fechamentos contábeis.',
    showSkip: true
  },
  {
    id: 'period-selection',
    title: 'Seleção de Período 📆',
    content: 'Escolha o período para fechamento: mensal, quinzenal ou personalizado. Verifique se todos os lançamentos estão corretos.',
    target: '.period-selector',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'payroll-processing',
    title: 'Processamento da Folha 💰',
    content: 'Calcule salários, horas extras, descontos, impostos e benefícios automaticamente com base nas regras configuradas.',
    target: '.payroll-processor',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'validation-checks',
    title: 'Validações e Conferências ✅',
    content: 'O sistema executa validações automáticas para detectar inconsistências antes do fechamento final.',
    target: '.validation-panel',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'reports-generation',
    title: 'Geração de Relatórios 📊',
    content: 'Gere relatórios de fechamento, demonstrativos de pagamento, relatórios fiscais e documentos obrigatórios.',
    target: '.reports-generator',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'approval-workflow',
    title: 'Fluxo de Aprovação 🔍',
    content: 'Envie para aprovação dos gestores antes do fechamento definitivo. Mantenha trilha de auditoria completa.',
    target: '.approval-workflow',
    placement: 'top',
    showSkip: true
  }
];

export const dashboardTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-dashboard',
    title: 'Dashboard Principal 🏠',
    content: 'Bem-vindo ao seu dashboard! Aqui você tem uma visão geral de todos os sistemas e métricas importantes.',
    showSkip: true
  },
  {
    id: 'quick-metrics',
    title: 'Métricas Rápidas ⚡',
    content: 'Visualize indicadores-chave em tempo real: vendas, produtividade, financeiro e operacional.',
    target: '.quick-metrics',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'system-shortcuts',
    title: 'Atalhos dos Sistemas 🚀',
    content: 'Acesse rapidamente seus sistemas mais utilizados através dos atalhos no dashboard principal.',
    target: '.system-shortcuts',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'notifications-widget',
    title: 'Widget de Notificações 🔔',
    content: 'Acompanhe notificações importantes, lembretes, aprovações pendentes e alertas do sistema.',
    target: '.notifications-widget',
    placement: 'top',
    showSkip: true
  },
  {
    id: 'recent-activity',
    title: 'Atividade Recente 📋',
    content: 'Veja suas ações recentes, histórico de acessos e atividades relevantes dos últimos dias.',
    target: '.recent-activity',
    placement: 'top',
    showSkip: true
  }
];

// Tutorial steps para outras páginas específicas
export const planosТutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-planos',
    title: 'Planos e Assinaturas 💎',
    content: 'Conheça nossos planos disponíveis e escolha o que melhor atende às necessidades da sua empresa.',
    showSkip: true
  },
  {
    id: 'plan-comparison',
    title: 'Comparação de Planos 📊',
    content: 'Compare recursos, limites e preços de cada plano para tomar a melhor decisão para seu negócio.',
    target: '.plan-comparison',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'upgrade-process',
    title: 'Processo de Upgrade ⬆️',
    content: 'Faça upgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente.',
    target: '.upgrade-button',
    placement: 'top',
    showSkip: true
  }
];

export const contatoTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-contato',
    title: 'Entre em Contato 📞',
    content: 'Precisa de ajuda? Entre em contato conosco através dos canais disponíveis.',
    showSkip: true
  },
  {
    id: 'contact-options',
    title: 'Opções de Contato 📧',
    content: 'WhatsApp para suporte rápido, e-mail para questões detalhadas, ou telefone para atendimento direto.',
    target: '.contact-options',
    placement: 'bottom',
    showSkip: true
  },
  {
    id: 'support-hours',
    title: 'Horários de Atendimento ⏰',
    content: 'Nosso suporte funciona de segunda a sexta, das 8h às 18h. WhatsApp disponível 24/7 para emergências.',
    target: '.support-hours',
    placement: 'top',
    showSkip: true
  }
];
