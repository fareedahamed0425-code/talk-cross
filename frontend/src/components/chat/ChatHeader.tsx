import React from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { Conversation } from '../../types/index.js';
import { formatLastSeen, getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { ArrowLeft, PanelLeftOpen } from 'lucide-react';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  typingText?: string | null;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  typingText,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { isOnline } = useSocket();
  const user = conversation.other_user;
  const online = isOnline(user.id) || user.online_status;

  return (
    <header className="chat-header">
      <div className="chat-header-user">
        {/* Mobile Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="icon-btn"
            style={{ marginRight: '-4px' }}
            title="Back to Chats"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Sidebar Expand Toggle Button when collapsed on Desktop */}
        {isSidebarCollapsed && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="icon-btn"
            style={{ marginRight: '-2px' }}
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={19} />
          </button>
        )}

        {/* User Avatar */}
        <div className="conv-avatar-wrap">
          {user.profile_image ? (
            <img src={user.profile_image} alt={user.display_name} className="avatar-img" />
          ) : (
            <div
              className="avatar-img"
              style={{ backgroundColor: getAvatarFallbackColor(user.display_name) }}
            >
              {getInitials(user.display_name)}
            </div>
          )}
          {online && <div className="online-dot" />}
        </div>

        {/* Name and Status */}
        <div>
          <div className="chat-header-name">{user.display_name}</div>
          <div className={`chat-header-status ${online ? 'online' : ''}`}>
            {typingText ? (
              <span style={{ color: 'var(--burgundy-300)', fontStyle: 'italic' }}>
                {typingText}
              </span>
            ) : online ? (
              <span>● Online</span>
            ) : (
              <span>{formatLastSeen(user.last_seen, false)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Icons */}
      <div className="chat-header-actions">
        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-panel-secondary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          @{user.username}
        </div>
      </div>
    </header>
  );
};
