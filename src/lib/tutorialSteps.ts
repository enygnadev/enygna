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
    title: 'Bem-vindo ao Portal Multissistema!',
    content: 'Este é o seu portal de entrada para todos os nossos sistemas empresariais. Vamos fazer um tour rápido?',
    showSkip: true
  },
  {
    id: 'theme',
    title: 'Personalize seu Tema',
    content: 'Você pode alterar o tema da aplicação clicando no seletor de tema no canto superior direito.',
    target: '.theme-selector-container',
    placement: 'bottom'
  },
  {
    id: 'systems',
    title: 'Acesse os Sistemas',
    content: 'Clique no botão "Acessar Plataforma" para visualizar todos os sistemas disponíveis.',
    target: '.primary-cta',
    placement: 'top'
  },
  {
    id: 'complete',
    title: 'Tutorial Concluído!',
    content: 'Agora você está pronto para explorar todos os nossos sistemas. Boa navegação!',
    showSkip: false
  }
];

export const chamadosTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-chamados',
    title: 'Sistema de Chamados',
    content: 'Bem-vindo ao sistema de chamados! Aqui você pode criar e gerenciar tickets de suporte.',
    showSkip: true
  },
  {
    id: 'create-ticket',
    title: 'Criar Chamado',
    content: 'Clique em "Novo Chamado" para criar um ticket de suporte.',
    target: '.create-ticket-btn',
    placement: 'bottom'
  },
  {
    id: 'view-tickets',
    title: 'Visualizar Chamados',
    content: 'Aqui você pode ver todos os seus chamados e acompanhar o status.',
    target: '.tickets-list',
    placement: 'top'
  }
];

export const colaboradorTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome-colaborador',
    title: 'Dashboard do Colaborador',
    content: 'Bem-vindo ao seu painel pessoal! Aqui você pode registrar ponto e acompanhar seus ganhos.',
    showSkip: true
  },
  {
    id: 'punch-button',
    title: 'Registro de Ponto',
    content: 'Use o botão de ponto para registrar entrada e saída do trabalho.',
    target: '.punch-skin',
    placement: 'top'
  },
  {
    id: 'earnings-summary',
    title: 'Resumo de Ganhos',
    content: 'Acompanhe suas horas trabalhadas e ganhos do dia, semana e mês.',
    target: '#export',
    placement: 'top'
  },
  {
    id: 'profile-settings',
    title: 'Configurações',
    content: 'Configure seu perfil, remuneração e regras de trabalho nas abas disponíveis.',
    target: '.navigation-tabs',
    placement: 'bottom'
  }
];