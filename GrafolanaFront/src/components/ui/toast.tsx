import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onDismiss: () => void;
  autoHideDuration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'error', 
  onDismiss, 
  autoHideDuration = 5000 // Default 5 seconds
}) => {
  // Auto-dismiss the toast after the specified duration
  useEffect(() => {
    if (!message) return;
    
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDuration);
    
    return () => {
      clearTimeout(timer);
    };
  }, [message, onDismiss, autoHideDuration]);

  if (!message) return null;

  // Different background colors depending on the message type
  const bgColor = {
    error: 'bg-red-600',
    success: 'bg-green-600',
    info: 'bg-blue-600'
  }[type];

  return (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-md shadow-lg ${bgColor} text-white font-medium`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center">
        {type === 'error' && (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {type === 'success' && (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {type === 'info' && (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span>{message}</span>
        <button 
          className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          onClick={onDismiss}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}