import React from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useSocket();

  if (!toast) return null;

  const icon = {
    success: <CheckCircle size={18} color="#10b981" />,
    warning: <AlertTriangle size={18} color="#f59e0b" />,
    info: <Info size={18} color="#06b6d4" />,
  }[toast.type || 'info'];

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#161e2e',
        color: '#f8fafc',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        maxWidth: '380px',
        animation: 'toastSlideIn 0.25s ease',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ fontSize: '13.5px', lineHeight: 1.4, flex: 1 }}>{toast.message}</div>
      <button
        onClick={clearToast}
        style={{
          color: '#94a3b8',
          padding: '2px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        <X size={15} />
      </button>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
