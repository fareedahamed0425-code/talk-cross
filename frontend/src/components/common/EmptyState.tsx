import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 20px',
        height: '100%',
        color: 'var(--text-secondary)',
      }}
    >
      {icon && (
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--primary)',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontFamily: 'var(--font-brand)',
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '13.5px',
          color: 'var(--text-muted)',
          maxWidth: '280px',
          lineHeight: 1.45,
          marginBottom: actionText ? '20px' : '0',
        }}
      >
        {description}
      </p>
      {actionText && onAction && (
        <button className="btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};
