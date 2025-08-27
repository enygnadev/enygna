
export type ThemeMode = 'light' | 'dark' | 'black';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    card: string;
  };
}

export const themes: Record<ThemeMode, Theme> = {
  light: {
    name: 'Tema Claro',
    colors: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      secondary: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      accent: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
      surface: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      card: 'linear-gradient(135deg, #ffffff, #f8fafc)',
    },
  },
  dark: {
    name: 'Tema Escuro',
    colors: {
      primary: '#60a5fa',
      secondary: '#818cf8',
      accent: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #60a5fa, #818cf8)',
      secondary: 'linear-gradient(135deg, #818cf8, #a78bfa)',
      accent: 'linear-gradient(135deg, #a78bfa, #c084fc)',
      surface: 'linear-gradient(135deg, #1e293b, #334155)',
      card: 'linear-gradient(135deg, #1e293b, #0f172a)',
    },
  },
  black: {
    name: 'Tema Preto',
    colors: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#8b5cf6',
      background: '#000000',
      surface: '#111111',
      text: '#ffffff',
      textSecondary: '#888888',
      border: '#333333',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      secondary: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      accent: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
      surface: 'linear-gradient(135deg, #111111, #222222)',
      card: 'linear-gradient(135deg, #111111, #000000)',
    },
  },
};

class ThemeManager {
  private currentTheme: ThemeMode = 'dark';
  private subscribers: ((theme: ThemeMode) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTheme();
    }
  }

  private initializeTheme() {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && themes[savedTheme]) {
      this.setTheme(savedTheme);
    } else {
      // Sempre usar tema escuro como padrão inicial
      this.setTheme('dark');
    }
  }

  setTheme(theme: ThemeMode) {
    this.currentTheme = theme;
    
    if (typeof window !== 'undefined') {
      // Remove previous theme classes
      document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-black');
      
      // Add new theme class
      document.documentElement.classList.add(`theme-${theme}`);
      
      // Set data attribute
      document.documentElement.setAttribute('data-theme', theme);
      
      // Save to localStorage
      localStorage.setItem('theme', theme);
      
      // Apply CSS variables
      this.applyCSSVariables(themes[theme]);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => callback(theme));
  }

  private applyCSSVariables(theme: Theme) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply gradient variables
    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value);
    });
  }

  getCurrentTheme(): ThemeMode {
    return this.currentTheme;
  }

  subscribe(callback: (theme: ThemeMode) => void) {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
}

export const themeManager = new ThemeManager();
