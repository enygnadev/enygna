
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSessionProfile } from '@/src/lib/auth';

interface AdminLoginButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function AdminLoginButton({ 
  variant = 'primary', 
  size = 'medium',
  showText = true,
  className = '',
  style = {}
}: AdminLoginButtonProps) {
  const router = useRouter();
  const { profile, loading } = useSessionProfile();

  const handleAdminLogin = () => {
    // Se já está logado como superadmin, vai direto para o admin
    if (profile?.role === 'superadmin') {
      router.push('/admin');
    } else {
      // Caso contrário, vai para a página de login de sistemas
      router.push('/sistemas');
    }
  };

  const getButtonStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      border: 'none',
      borderRadius: size === 'small' ? '8px' : size === 'large' ? '16px' : '12px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      ...style
    };

    const sizeStyles = {
      small: { padding: '0.5rem 1rem', fontSize: '0.9rem' },
      medium: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
      large: { padding: '1rem 2rem', fontSize: '1.1rem' }
    };

    const variantStyles = {
      primary: {
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
        border: '2px solid transparent'
      },
      secondary: {
        background: 'rgba(220, 38, 38, 0.1)',
        color: '#dc2626',
        border: '2px solid rgba(220, 38, 38, 0.3)',
        backdropFilter: 'blur(10px)'
      },
      ghost: {
        background: 'transparent',
        color: '#dc2626',
        border: '1px solid rgba(220, 38, 38, 0.5)'
      }
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant]
    };
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.background = 'linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(220, 38, 38, 0.4)';
    } else if (variant === 'secondary') {
      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    } else {
      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
    }
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)';
      e.currentTarget.style.transform = 'translateY(0px)';
      e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 38, 38, 0.3)';
    } else if (variant === 'secondary') {
      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
      e.currentTarget.style.transform = 'translateY(0px)';
    } else {
      e.currentTarget.style.background = 'transparent';
    }
  };

  if (loading) {
    return (
      <button 
        style={getButtonStyles()} 
        className={className}
        disabled
      >
        <span style={{ fontSize: size === 'small' ? '1rem' : '1.2rem' }}>⏳</span>
        {showText && <span>Carregando...</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdminLogin}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      style={getButtonStyles()}
      className={className}
      title={profile?.role === 'superadmin' ? 'Acessar Painel Admin' : 'Fazer Login como Admin'}
    >
      <span style={{ fontSize: size === 'small' ? '1.2rem' : '1.5rem' }}>
        {profile?.role === 'superadmin' ? '👑' : '🔐'}
      </span>
      {showText && (
        <span>
          {profile?.role === 'superadmin' ? 'Painel Admin' : 'Login Admin'}
        </span>
      )}
    </button>
  );
}
