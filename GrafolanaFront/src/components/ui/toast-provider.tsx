'use client'

import React, { createContext, useContext, useState, ReactNode, useRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './toast';

interface ToastContextType {
  showToast: (message: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  setToastContainer: (element: HTMLElement | null) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  // Store the container element where toasts should be rendered
  const [toastContainer, setToastContainer] = useState<HTMLElement | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({
      message,
      type,
      visible: true,
    });
  };

  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      visible: false,
    }));
  };

  // Render the toast either in the specified container via portal, or directly as a child
  const renderToast = () => {
    if (!toast.visible) return null;
    
    const toastElement = (
      <Toast
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    );

    // If a custom container is specified, use a portal to render the toast inside it
    if (toastContainer) {
      return createPortal(toastElement, toastContainer);
    }

    // Otherwise, render the toast as a direct child
    return toastElement;
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, setToastContainer }}>
      {children}
      {renderToast()}
    </ToastContext.Provider>
  );
}