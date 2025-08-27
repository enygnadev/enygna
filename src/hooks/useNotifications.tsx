
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
    primary?: boolean;
  }[];
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: NotificationData[];
  addNotification: (notification: Omit<NotificationData, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const newNotification: NotificationData = {
      id,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Max 5 notifications

    // Auto remove if not persistent
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ type: 'error', title, message, duration: duration || 8000 });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll,
      showSuccess,
      showError,
      showWarning,
      showInfo
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <>
      <style jsx>{`
        .notification-container {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 400px;
        }

        .notification {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          animation: slideIn 0.3s ease-out;
          border-left-width: 4px;
        }

        .notification.success {
          border-left-color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--color-surface) 100%);
        }

        .notification.error {
          border-left-color: #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, var(--color-surface) 100%);
        }

        .notification.warning {
          border-left-color: #f59e0b;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, var(--color-surface) 100%);
        }

        .notification.info {
          border-left-color: #3b82f6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, var(--color-surface) 100%);
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .notification-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text);
          margin: 0;
        }

        .notification-message {
          font-size: 0.85rem;
          color: var(--color-textSecondary);
          line-height: 1.4;
          margin: 0 0 1rem 0;
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
        }

        .notification-action {
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          border-radius: var(--radius);
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-action:hover {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .notification-action.primary {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }

        .close-button {
          background: none;
          border: none;
          color: var(--color-textSecondary);
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: var(--color-border);
          color: var(--color-text);
        }

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

        @media (max-width: 768px) {
          .notification-container {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }
      `}</style>

      <div className="notification-container">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <div className="notification-header">
              <h4 className="notification-title">{notification.title}</h4>
              <button
                className="close-button"
                onClick={() => removeNotification(notification.id)}
                aria-label="Fechar notificação"
              >
                ×
              </button>
            </div>
            
            <p className="notification-message">{notification.message}</p>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="notification-actions">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    className={`notification-action ${action.primary ? 'primary' : ''}`}
                    onClick={() => {
                      action.action();
                      removeNotification(notification.id);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationProvider;
