
'use client';

import React from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'security' | 'business';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Auto-close após 5s
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'security': return '🔒';
      case 'business': return '💼';
      default: return 'ℹ️';
    }
  };

  const getColor = () => {
    switch (notification.type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'security': return '#dc2626';
      case 'business': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        background: 'white',
        borderLeft: `4px solid ${getColor()}`,
        borderRadius: 8,
        padding: 16,
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        maxWidth: 400,
        zIndex: 1000,
        animation: 'slideIn 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{getIcon()}</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: '600' }}>
              {notification.title}
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              {notification.message}
            </p>
            {notification.actionUrl && (
              <button
                onClick={() => window.location.href = notification.actionUrl!}
                style={{
                  marginTop: 8,
                  padding: '4px 8px',
                  fontSize: 12,
                  background: getColor(),
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {notification.actionLabel || 'Ver mais'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: '#9ca3af'
            }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
