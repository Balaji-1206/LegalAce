import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showActionToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showActionToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<{
    id: number;
    message: string;
    type: ToastType;
    actionLabel?: string;
    onAction?: () => void;
    dismissing: boolean;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  const toastIdRef = useRef<number>(0);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveToast(prev => (prev ? { ...prev, dismissing: true } : null));
    setTimeout(() => {
      setActiveToast(null);
    }, 250);
  }, []);

  const showActionToast = useCallback(({ message, type = 'success', duration = 2800, actionLabel, onAction }: ToastOptions) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    const id = ++toastIdRef.current;
    setActiveToast({ id, message, type, actionLabel, onAction, dismissing: false });

    timerRef.current = window.setTimeout(() => {
      dismissToast();
    }, duration);
  }, [dismissToast]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 2800) => {
    showActionToast({ message, type, duration });
  }, [showActionToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return '✓';
      case 'info': return 'ℹ';
      case 'warning': return '⚠';
      case 'error': return '✕';
      default: return '✓';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showActionToast }}>
      {children}

      {activeToast && (
        <div className="toast-floating-container" onClick={dismissToast}>
          <div className={`toast-pill-capsule ${activeToast.type}${activeToast.dismissing ? ' dismissing' : ''}`}>
            <div className="toast-icon-bubble">
              {getIcon(activeToast.type)}
            </div>
            <div className="toast-message-text">
              {activeToast.message}
            </div>
            {activeToast.actionLabel && (
              <button
                className="toast-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  activeToast.onAction?.();
                  dismissToast();
                }}
              >
                {activeToast.actionLabel}
              </button>
            )}
            <button className="toast-close-btn" onClick={(e) => { e.stopPropagation(); dismissToast(); }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
