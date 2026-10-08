import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { useChatPrivacy } from '../../utils/chatPrivacy.js';
import { formatConversationTime, getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { CreateGroupModal } from '../chat/CreateGroupModal.js';
import { EmptyState } from '../common/EmptyState.js';
import {
  MessageSquare,
  Search,
  ImageIcon,
  Smile,
  Users,
  Plus,
  Eye,
  EyeOff,
  Image as ImageIcon2,
  Bell,
  BellOff,
  MoreVertical,
} from 'lucide-react';

interface ConversationListProps {
  onOpenSearch: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  convId: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onOpenSearch }) => {
  const navigate = useNavigate();
  const { conversations, activeConversationId, selectConversation, isLoadingConversations } = useChat();
  const { isOnline, showToast } = useSocket();
  const privacy = useChatPrivacy();

  const [filterText, setFilterText] = useState<string>('');
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleClose);
      document.addEventListener('contextmenu', handleClose);
    }
    return () => {
      document.removeEventListener('click', handleClose);
      document.removeEventListener('contextmenu', handleClose);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 150);
    setContextMenu({ x, y, convId });
  };

  const handleToggleBlurName = (convId: string) => {
    const isNowBlurred = privacy.toggleBlurName(convId);
    showToast(isNowBlurred ? 'Name blurred for privacy' : 'Name unblurred', 'info');
    setContextMenu(null);
  };

  const handleToggleBlurAvatar = (convId: string) => {
    const isNowBlurred = privacy.toggleBlurAvatar(convId);
    showToast(isNowBlurred ? 'Avatar blurred for privacy' : 'Avatar unblurred', 'info');
    setContextMenu(null);
  };

  const handleToggleMute = (convId: string) => {
    const isNowMuted = privacy.toggleMuteChat(convId);
    showToast(isNowMuted ? 'Chat notifications muted' : 'Chat unmuted', 'info');
    setContextMenu(null);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    const name = c.is_group ? (c.title || 'Group') : c.other_user.display_name;
    const username = c.other_user.username;
    return (
      name.toLowerCase().includes(term) ||
      username.toLowerCase().includes(term) ||
      (c.last_message?.content && c.last_message.content.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Header Search & Create Group Bar */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="sidebar-search-box" style={{ flex: 1, padding: 0, border: 'none' }}>
          <Search size={15} className="sidebar-search-icon" style={{ left: '10px' }} />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search chats..."
            className="sidebar-search-input"
            style={{ padding: '8px 10px 8px 32px', fontSize: '13px' }}
          />
        </div>

        {/* New Group Button */}
        <button
          onClick={() => setShowGroupModal(true)}
          className="icon-btn"
          title="Create New Group"
          style={{
            backgroundColor: 'var(--bg-panel-secondary)',
            border: '1px solid var(--border-subtle)',
            width: '34px',
            height: '34px',
            color: 'var(--burgundy-400)',
            flexShrink: 0,
          }}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* List */}
      <div className="sidebar-content">
        {isLoadingConversations && conversations.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          filterText ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No chats match "{filterText}"
            </div>
          ) : (
            <EmptyState
              icon={<MessageSquare size={26} />}
              title="No conversations yet"
              description="Find friends by @username or create a group to start messaging."
              actionText="Find People"
              onAction={onOpenSearch}
            />
          )
        ) : (
          filteredConversations.map((conv) => {
            const isGroup = !!conv.is_group;
            const user = conv.other_user;
            const online = !isGroup && (isOnline(user.id) || user.online_status);
            const isActive = conv.id === activeConversationId;
            const lastMsg = conv.last_message;

            const nameBlurred = privacy.isNameBlurred(conv.id);
            const avatarBlurred = privacy.isAvatarBlurred(conv.id);
            const isMuted = privacy.isChatMuted(conv.id);

            const displayName = isGroup ? (conv.title || 'Group Chat') : user.display_name;

            return (
              <div
                key={conv.id}
                className={`conv-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  selectConversation(conv.id);
                  navigate(`/chat/${conv.id}`);
                }}
                onContextMenu={(e) => handleContextMenu(e, conv.id)}
              >
                {/* Avatar */}
                <div className={`conv-avatar-wrap ${avatarBlurred ? 'blurred-privacy-avatar' : ''}`}>
                  {isGroup ? (
                    conv.group_image ? (
                      <img src={conv.group_image} alt={displayName} className="avatar-img" />
                    ) : (
                      <div
                        className="avatar-img"
                        style={{
                          backgroundColor: 'var(--burgundy-900)',
                          border: '1px solid var(--burgundy-700)',
                          color: '#ffffff',
                        }}
                      >
                        <Users size={20} />
                      </div>
                    )
                  ) : user.profile_image ? (
                    <img src={user.profile_image} alt={displayName} className="avatar-img" />
                  ) : (
                    <div
                      className="avatar-img"
                      style={{ backgroundColor: getAvatarFallbackColor(displayName) }}
                    >
                      {getInitials(displayName)}
                    </div>
                  )}
                  {online && <div className="online-dot" />}
                </div>

                {/* Conversation Details */}
                <div className="conv-info">
                  <div className="conv-top-row">
                    <span className={`conv-name ${nameBlurred ? 'blurred-privacy-text' : ''}`}>
                      {displayName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isMuted && <BellOff size={12} color="var(--text-muted)" />}
                      <span className="conv-time">
                        {lastMsg ? formatConversationTime(lastMsg.created_at) : ''}
                      </span>
                    </div>
                  </div>

                  <div className="conv-bottom-row">
                    <div className="conv-snippet">
                      {lastMsg ? (
                        lastMsg.is_deleted ? (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            This message was deleted
                          </span>
                        ) : lastMsg.message_type === 'image' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ImageIcon size={13} /> Photo
                          </span>
                        ) : lastMsg.message_type === 'sticker' ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Smile size={13} /> Sticker
                          </span>
                        ) : (
                          <span>
                            {isGroup && lastMsg.sender_name && (
                              <b style={{ color: 'var(--burgundy-300)', fontWeight: 600 }}>
                                {lastMsg.sender_name.split(' ')[0]}:{' '}
                              </b>
                            )}
                            {lastMsg.content}
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {isGroup ? `${conv.members_count || 2} members` : 'Start the conversation...'}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {conv.unread_count > 0 && (
                        <div className="conv-badge">{conv.unread_count}</div>
                      )}

                      {/* 3-Dots Mobile Action Button */}
                      <button
                        onClick={(e) => handleContextMenu(e, conv.id)}
                        className="icon-btn mobile-only-flex"
                        style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}
                        title="Chat Options"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="chat-context-menu"
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 100,
          }}
        >
          {/* Blur / Unblur Name */}
          <button
            onClick={() => handleToggleBlurName(contextMenu.convId)}
            className="context-menu-item"
          >
            {privacy.isNameBlurred(contextMenu.convId) ? (
              <>
                <Eye size={15} color="var(--emerald)" />
                <span>Unblur Name</span>
              </>
            ) : (
              <>
                <EyeOff size={15} />
                <span>Blur Name</span>
              </>
            )}
          </button>

          {/* Blur / Unblur Avatar */}
          <button
            onClick={() => handleToggleBlurAvatar(contextMenu.convId)}
            className="context-menu-item"
          >
            {privacy.isAvatarBlurred(contextMenu.convId) ? (
              <>
                <Eye size={15} color="var(--emerald)" />
                <span>Unblur Avatar</span>
              </>
            ) : (
              <>
                <ImageIcon2 size={15} />
                <span>Blur Image</span>
              </>
            )}
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '3px 0' }} />

          {/* Mute / Unmute */}
          <button
            onClick={() => handleToggleMute(contextMenu.convId)}
            className="context-menu-item"
          >
            {privacy.isChatMuted(contextMenu.convId) ? (
              <>
                <Bell size={15} color="var(--emerald)" />
                <span>Unmute Chat</span>
              </>
            ) : (
              <>
                <BellOff size={15} color="var(--danger)" />
                <span>Mute Chat</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Group Creation Modal */}
      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onGroupCreated={(newConvId) => {
          selectConversation(newConvId);
          navigate(`/chat/${newConvId}`);
        }}
      />
    </div>
  );
};

export default ConversationList;
