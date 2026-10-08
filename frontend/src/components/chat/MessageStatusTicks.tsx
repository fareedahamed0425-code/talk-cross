import React from 'react';

interface MessageStatusTicksProps {
  sending?: boolean;
  isRead?: boolean;
  size?: number;
  className?: string;
  variant?: 'bubble' | 'sidebar';
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
  sending = false,
  isRead = false,
  size = 16,
  className = '',
  variant = 'bubble',
}) => {
  if (sending) {
    return (
      <span
        className={`status-ticks-wrap is-sending ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title="Sending..."
      >
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          className="status-sending-spinner"
          fill="none"
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeOpacity="0.25"
          />
          <path
            d="M8 2 A6 6 0 0 1 14 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  // Calculate proportional height based on 19:14 aspect ratio of the double check
  const svgHeight = Math.round((size * 14) / 19);

  return (
    <span
      className={`status-ticks-wrap ${isRead ? 'is-read' : 'is-delivered'} variant-${variant} ${className}`}
      style={{ width: `${size}px`, height: `${svgHeight}px` }}
      title={isRead ? 'Read' : 'Delivered'}
    >
      <svg
        viewBox="0 0 19 14"
        width={size}
        height={svgHeight}
        className={`status-ticks-svg ${isRead ? 'animate-blue-ticks' : 'animate-tick-appear'}`}
        fill="none"
      >
        {/* Left checkmark */}
        <path
          d="M1 7.5L5 11.5L13 2.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tick-path tick-path-1"
        />
        {/* Right checkmark */}
        <path
          d="M6 7.5L10 11.5L18 2.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tick-path tick-path-2"
        />
      </svg>
    </span>
  );
};

export default MessageStatusTicks;
