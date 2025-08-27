
'use client';

import { useState, useEffect } from 'react';

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
  };
}

const themes: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      primary: '#3b82f6',
      background: '#1a1a1a',
      surface: '#2a2a2a'
    }
  },
  {
    id: 'light',
    name: 'Light', 
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      surface: '#f5f5f5'
    }
  }
];

interface ThemeSelectorProps {
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

function ThemeSelector({ size = 'medium', showLabels = true }: ThemeSelectorProps = {}) {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        setCurrentTheme(saved);
      }
    }
  }, []);

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {showLabels && <span style={{ fontSize: '14px', color: '#888' }}>Tema:</span>}
      {themes.map(theme => (
        <button
          key={theme.id}
          onClick={() => changeTheme(theme.id)}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: currentTheme === theme.id ? '2px solid #3b82f6' : '1px solid #333',
            background: currentTheme === theme.id ? theme.colors.primary : theme.colors.surface,
            color: currentTheme === theme.id ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}

export default ThemeSelector;
export { ThemeSelector };
