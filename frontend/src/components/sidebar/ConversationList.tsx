import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { formatConversationTime, getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { EmptyState } from '../common/EmptyState.js';
import { MessageSquare, Search, ImageIcon, Smile } from 'lucide-react';

interface ConversationListProps {
  onOpenSearch: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onOpenSearch }) => {
  const navigate = useNavigate();
  const { conversations, activeConversationId, selectConversation, isLoadingConversations } = useChat();
  const { isOnline } = useSocket();
  const [filterText, setFilterText] = useState<string>('');

  const filteredConversations = conversations.filter((c) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      c.other_user.display_name.toLowerCase().includes(term) ||
      c.other_user.username.toLowerCase().includes(term) ||
      (c.last_message?.content && c.last_message.content.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search in conversations */}
      <div className="sidebar-search-box">
        <Search size={16} className="sidebar-search-icon" />
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search chats..."
          className="sidebar-search-input"
        />
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
              description="Find your friends by their @username to start a conversation."
              actionText="Find People"
              onAction={onOpenSearch}
            />
          )
        ) : (
          filteredConversations.map((conv) => {
            const user = conv.other_user;
            const online = isOnline(user.id) || user.online_status;
            const isActive = conv.id === activeConversationId;
            const lastMsg = conv.last_message;

            return (
              <div
                key={conv.id}
                className={`conv-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  selectConversation(conv.id);
                  navigate(`/chat/${conv.id}`);
                }}
              >
                {/* Avatar */}
                <div className="conv-avatar-wrap">
                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt={user.display_name}
                      className="avatar-img"
                    />
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

                {/* Conversation Details */}
                <div className="conv-info">
                  <div className="conv-top-row">
                    <span className="conv-name">{user.display_name}</span>
                    <span className="conv-time">
                      {lastMsg ? formatConversationTime(lastMsg.created_at) : ''}
                    </span>
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
                          lastMsg.content
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Start the conversation...
                        </span>
                      )}
                    </div>

                    {conv.unread_count > 0 && (
                      <div className="conv-badge">{conv.unread_count}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
