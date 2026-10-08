import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { Message } from '../../types/index.js';
import { formatMessageTime, getAvatarFallbackColor } from '../../utils/format.js';
import { Check, CheckCheck, Reply, Edit3, Trash2, Copy, MoreHorizontal } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onOpenImage: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenImage }) => {
  const { user } = useAuth();
  const { activeConversation, startReply, startEdit, deleteMessage } = useChat();
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const isSent = message.sender_id === user?.id;
  const isDeleted = message.is_deleted;
  const isSticker = message.message_type === 'sticker';
  const isImage = message.message_type === 'image';
  const isGroup = !!activeConversation?.is_group;

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    setShowMenu(false);
  };

  const handleReply = () => {
    startReply(message);
    setShowMenu(false);
  };

  const handleEdit = () => {
    startEdit(message);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message?')) {
      deleteMessage(message.id);
    }
    setShowMenu(false);
  };

  return (
    <div
      className={`message-row ${isSent ? 'sent' : 'received'}`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className={`message-bubble ${isSticker ? 'sticker-bubble' : ''}`}>
        {/* Group Message Sender Header */}
        {isGroup && !isSent && !isDeleted && message.sender_name && (
          <div
            className="group-sender-header"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: getAvatarFallbackColor(message.sender_name),
              marginBottom: '2px',
            }}
          >
            {message.sender_name}
          </div>
        )}

        {/* Reply Context Banner */}
        {message.reply_to_message && !isDeleted && (
          <div className="quoted-message">
            <div className="quoted-sender">{message.reply_to_message.sender_name || 'Friend'}</div>
            <div className="quoted-text">
              {message.reply_to_message.message_type === 'image' ? (
                '📷 Photo'
              ) : message.reply_to_message.message_type === 'sticker' ? (
                '✨ Sticker'
              ) : (
                message.reply_to_message.content
              )}
            </div>
          </div>
        )}

        {/* Message Content */}
        {isDeleted ? (
          <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '13.5px' }}>
            This message was deleted
          </div>
        ) : isSticker ? (
          <div>
            <img
              src={message.sticker_url || message.media_url || ''}
              alt={message.sticker_name || 'Sticker'}
              className="sticker-img"
              onClick={() => message.sticker_url && onOpenImage(message.sticker_url)}
            />
          </div>
        ) : isImage ? (
          <div>
            {message.media_url && (
              <div className="msg-image-wrap" onClick={() => onOpenImage(message.media_url!)}>
                <img src={message.media_url} alt="Attachment" className="msg-image" />
              </div>
            )}
            {message.content && <div style={{ marginTop: '4px' }}>{message.content}</div>}
          </div>
        ) : (
          <div>{message.content}</div>
        )}

        {/* Footer Meta: Time, Edited label, Read Status */}
        <div className="message-meta">
          {message.updated_at !== message.created_at && !isDeleted && (
            <span style={{ fontSize: '10px', opacity: 0.7, marginRight: '2px' }}>(edited)</span>
          )}

          <span>{formatMessageTime(message.created_at)}</span>

          {isSent && !isDeleted && (
            <span className="msg-status-icon">
              {message.is_read ? (
                <CheckCheck size={14} className="msg-status-read" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
        </div>

        {/* Action Trigger Button */}
        {!isDeleted && (
          <button
            className="msg-actions-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="Message options"
          >
            <MoreHorizontal size={14} />
          </button>
        )}

        {/* Dropdown Action Menu */}
        {showMenu && !isDeleted && (
          <div
            style={{
              position: 'absolute',
              top: '24px',
              right: isSent ? '0' : 'auto',
              left: isSent ? 'auto' : '0',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '4px',
              zIndex: 30,
              minWidth: '120px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <button
              onClick={handleReply}
              style={{
                padding: '6px 10px',
                fontSize: '12.5px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '4px',
                width: '100%',
                justifyContent: 'flex-start',
              }}
            >
              <Reply size={14} /> Reply
            </button>

            {message.content && (
              <button
                onClick={handleCopy}
                style={{
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '4px',
                  width: '100%',
                  justifyContent: 'flex-start',
                }}
              >
                <Copy size={14} /> Copy
              </button>
            )}

            {isSent && message.message_type === 'text' && (
              <button
                onClick={handleEdit}
                style={{
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '4px',
                  width: '100%',
                  justifyContent: 'flex-start',
                }}
              >
                <Edit3 size={14} /> Edit
              </button>
            )}

            {isSent && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '4px',
                  width: '100%',
                  justifyContent: 'flex-start',
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
