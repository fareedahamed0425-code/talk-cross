import React from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { useChatPrivacy } from '../../utils/chatPrivacy.js';
import { Conversation } from '../../types/index.js';
import { formatLastSeen, getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { ArrowLeft, PanelLeftOpen, ShieldCheck, Users } from 'lucide-react';

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
  const privacy = useChatPrivacy();

  const isGroup = !!conversation.is_group;
  const user = conversation.other_user;
  const online = !isGroup && (isOnline(user.id) || user.online_status);

  const nameBlurred = privacy.isNameBlurred(conversation.id);
  const avatarBlurred = privacy.isAvatarBlurred(conversation.id);

  const displayName = isGroup ? (conversation.title || 'Group Chat') : user.display_name;

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

        {/* Avatar */}
        <div className={`conv-avatar-wrap ${avatarBlurred ? 'blurred-privacy-avatar' : ''}`}>
          {isGroup ? (
            conversation.group_image ? (
              <img src={conversation.group_image} alt={displayName} className="avatar-img chat-header-avatar" />
            ) : (
              <div
                className="avatar-img chat-header-avatar"
                style={{
                  backgroundColor: 'var(--burgundy-900)',
                  border: '1px solid var(--burgundy-700)',
                  color: '#ffffff',
                }}
              >
                <Users size={18} />
              </div>
            )
          ) : user.profile_image ? (
            <img src={user.profile_image} alt={displayName} className="avatar-img chat-header-avatar" />
          ) : (
            <div
              className="avatar-img chat-header-avatar"
              style={{ backgroundColor: getAvatarFallbackColor(displayName) }}
            >
              {getInitials(displayName)}
            </div>
          )}
          {online && <div className="online-dot" />}
        </div>

        {/* Name and Status */}
        <div className="chat-header-meta">
          <div className="chat-header-name-row">
            <span className={`chat-header-name ${nameBlurred ? 'blurred-privacy-text' : ''}`}>
              {displayName}
            </span>
            {!isGroup && <span className="chat-header-mobile-username">@{user.username}</span>}
          </div>
          <div className={`chat-header-status ${online ? 'online' : ''}`}>
            {typingText ? (
              <span className="typing-status-text">{typingText}</span>
            ) : isGroup ? (
              <span>{conversation.members_count || conversation.members?.length || 2} members</span>
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

      {/* Desktop Header Badges */}
      <div className="chat-header-actions desktop-only-flex">
        <div className="chat-header-e2ee-badge" title="Messages are protected with End-to-End Encryption (AES-256-GCM).">
          <ShieldCheck size={14} color="#10b981" />
          <span>End-to-end encrypted</span>
        </div>

        {!isGroup && (
          <div className="chat-header-username-badge">
            @{user.username}
          </div>
        )}
      </div>
    </header>
  );
};
