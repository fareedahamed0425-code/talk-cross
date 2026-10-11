import React from 'react';

interface MessageStatusTicksProps {
  sending?: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  size?: number;
  className?: string;
  variant?: 'bubble' | 'sidebar';
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
  sending = false,
  isDelivered = false,
  isRead = false,
  size = 16,
  className = '',
  variant = 'bubble',
}) => {
  // 1. Clock icon when sender is offline / waiting for network / message pending
  if (sending) {
    return (
      <span
        className={`status-ticks-wrap is-pending variant-${variant} ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title="Waiting for connection..."
      >
        <svg
          viewBox="0 0 16 16"
          width={size}
          height={size}
          className="status-clock-icon"
          fill="none"
        >
          <circle
            cx="8"
            cy="8"
            r="6.2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <polyline
            points="8 4.2 8 8 10.6 9.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  // 2. Double Blue Ticks (Read / Seen)
  if (isRead) {
    const svgHeight = Math.round((size * 14) / 19);
    return (
      <span
        className={`status-ticks-wrap is-read variant-${variant} ${className}`}
        style={{ width: `${size}px`, height: `${svgHeight}px` }}
        title="Read"
      >
        <svg
          viewBox="0 0 19 14"
          width={size}
          height={svgHeight}
          className="status-ticks-svg animate-blue-ticks"
          fill="none"
        >
          <path
            d="M1 7.5L5 11.5L13 2.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="tick-path tick-path-1"
          />
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
  }

  // 3. Double Grey Ticks (Delivered - recipient is online)
  if (isDelivered) {
    const svgHeight = Math.round((size * 14) / 19);
    return (
      <span
        className={`status-ticks-wrap is-delivered variant-${variant} ${className}`}
        style={{ width: `${size}px`, height: `${svgHeight}px` }}
        title="Delivered"
      >
        <svg
          viewBox="0 0 19 14"
          width={size}
          height={svgHeight}
          className="status-ticks-svg animate-tick-appear"
          fill="none"
        >
          <path
            d="M1 7.5L5 11.5L13 2.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="tick-path tick-path-1"
          />
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
  }

  // 4. Single Tick (Sent to server, recipient is offline)
  const singleSvgHeight = Math.round((size * 14) / 15);
  return (
    <span
      className={`status-ticks-wrap is-sent variant-${variant} ${className}`}
      style={{ width: `${size}px`, height: `${singleSvgHeight}px` }}
      title="Sent"
    >
      <svg
        viewBox="0 0 15 14"
        width={size}
        height={singleSvgHeight}
        className="status-ticks-svg animate-tick-appear"
        fill="none"
      >
        <path
          d="M2 7.5L6 11.5L14 2.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="tick-path tick-path-1"
        />
      </svg>
    </span>
  );
};

export default MessageStatusTicks;
