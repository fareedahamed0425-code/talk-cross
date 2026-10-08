import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { Message } from '../../types/index.js';
import { formatMessageTime, getAvatarFallbackColor } from '../../utils/format.js';
import { Reply, Edit3, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { MessageStatusTicks } from './MessageStatusTicks.js';

interface MessageBubbleProps {
  message: Message;
  onOpenImage: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenImage }) => {
  const { user } = useAuth();
  const { activeConversation, startReply, startEdit, deleteMessage } = useChat();
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Mobile Swipe-to-Reply touch gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  const isSent = message.sender_id === user?.id;
  const isDeleted = message.is_deleted;
  const isSticker = message.message_type === 'sticker';
  const isImage = message.message_type === 'image';
  const isGroup = !!activeConversation?.is_group;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || isDeleted) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX.current - currentX; // positive when dragging left
    const diffY = Math.abs(touchStartY.current - currentY);

    if (diffX > 10 && diffX > diffY * 1.2) {
      setSwipeOffset(Math.min(diffX, 70));
    } else if (diffY > diffX && diffY > 20) {
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping && swipeOffset > 45 && !isDeleted) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
      startReply(message);
    }
    setIsSwiping(false);
    setSwipeOffset(0);
  };

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
      style={{ position: 'relative' }}
    >
      {/* Swipe-to-reply reveal indicator on mobile */}
      {swipeOffset > 15 && (
        <div
          style={{
            position: 'absolute',
            right: `${Math.max(8, swipeOffset * 0.4)}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--burgundy-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            opacity: Math.min(swipeOffset / 45, 1),
            transition: 'opacity 0.15s ease',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <Reply size={15} />
        </div>
      )}

      <div
        className={`message-bubble ${isSticker ? 'sticker-bubble' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeOffset > 0 ? `translateX(-${swipeOffset}px)` : 'none',
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
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
            <img
              src={message.media_url || ''}
              alt="Attachment"
              className="message-image"
              onClick={() => message.media_url && onOpenImage(message.media_url)}
            />
            {message.content && <div className="message-caption">{message.content}</div>}
          </div>
        ) : (
          <div className="message-text">{message.content}</div>
        )}

        {/* Timestamp & Status Metadata */}
        <div className="message-meta">
          {message.updated_at && !isDeleted && <span className="edited-badge">edited</span>}
          <span className="message-time">{formatMessageTime(message.created_at)}</span>
          {isSent && !isDeleted && (
            <span className="message-status">
              <MessageStatusTicks
                sending={message.sending}
                isRead={message.is_read}
                size={16}
                variant="bubble"
              />
            </span>
          )}
        </div>

        {/* Action Trigger Menu Button */}
        {!isDeleted && (
          <button
            className="bubble-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="Message options"
          >
            <MoreHorizontal size={14} />
          </button>
        )}

        {/* Context Menu Dropdown */}
        {showMenu && (
          <div
            className="bubble-menu-dropdown"
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
