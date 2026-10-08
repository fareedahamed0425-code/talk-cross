import React from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { Conversation } from '../../types/index.js';
import { formatLastSeen, getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { ArrowLeft, PanelLeftOpen, ShieldCheck } from 'lucide-react';

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
        {/* Mobile / Compact Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="icon-btn chat-back-btn"
            title="Back to Conversations"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
        )}

        {/* Desktop Sidebar Expand Button when collapsed */}
        {isSidebarCollapsed && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="icon-btn desktop-only"
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={19} />
          </button>
        )}

        {/* User Avatar */}
        <div className="conv-avatar-wrap">
          {user.profile_image ? (
            <img src={user.profile_image} alt={user.display_name} className="avatar-img chat-header-avatar" />
          ) : (
            <div
              className="avatar-img chat-header-avatar"
              style={{ backgroundColor: getAvatarFallbackColor(user.display_name) }}
            >
              {getInitials(user.display_name)}
            </div>
          )}
          {online && <div className="online-dot" />}
        </div>

        {/* Name and Status */}
        <div className="chat-header-meta">
          <div className="chat-header-name-row">
            <span className="chat-header-name">{user.display_name}</span>
            <span className="chat-header-mobile-username">@{user.username}</span>
          </div>
          <div className={`chat-header-status ${online ? 'online' : ''}`}>
            {typingText ? (
              <span className="typing-status-text">{typingText}</span>
            ) : online ? (
              <span>● Online</span>
            ) : (
              <span>{formatLastSeen(user.last_seen, false)}</span>
            )}
            <span className="chat-header-e2ee-tag" title="End-to-End Encrypted">
              • 🔒
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Header Badges (Hidden on mobile to eliminate clutter) */}
      <div className="chat-header-actions desktop-only-flex">
        <div className="chat-header-e2ee-badge" title="Messages are protected with End-to-End Encryption (AES-256-GCM).">
          <ShieldCheck size={14} color="#10b981" />
          <span>End-to-end encrypted</span>
        </div>

        <div className="chat-header-username-badge">
          @{user.username}
        </div>
      </div>
    </header>
  );
};
