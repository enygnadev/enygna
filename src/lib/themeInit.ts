
// Inicialização do sistema de temas
// Este arquivo garante que o tema seja aplicado imediatamente no carregamento

if (typeof window !== 'undefined') {
  // Aplicar tema salvo ou usar tema escuro como padrão
  const savedTheme = localStorage.getItem('theme') || 'dark';
  
  // Garantir que o tema padrão seja escuro se não houver tema salvo
  if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'dark');
  }
  
  // Aplicar classe do tema
  document.documentElement.classList.add(`theme-${savedTheme}`);
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Prevenir FOUC (Flash of Unstyled Content)
  document.documentElement.style.visibility = 'visible';
}
