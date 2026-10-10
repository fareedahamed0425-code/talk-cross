import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { Message } from '../../types/index.js';
import { formatMessageTime, getAvatarFallbackColor, resolveMediaUrl } from '../../utils/format.js';
import { Reply, Edit3, Trash2, Copy, MoreHorizontal, ZoomIn } from 'lucide-react';
import { MessageStatusTicks } from './MessageStatusTicks.js';

interface MessageBubbleProps {
  message: Message;
  onOpenImage: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenImage }) => {
  const { user } = useAuth();
  const { activeConversation, startReply, startEdit, deleteMessage } = useChat();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [showMenu]);

  // Mobile Swipe-to-Reply & Double-Tap gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const lastTapRef = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  const isSent = message.sender_id === user?.id;
  const isDeleted = message.is_deleted;
  const isSticker = message.message_type === 'sticker';
  const isImage = message.message_type === 'image';
  const isGroup = !!activeConversation?.is_group;

  // Only display 'edited' badge if message was genuinely edited after sending
  const isEdited = !isDeleted && (
    message.is_edited === true ||
    (Boolean(message.updated_at && message.created_at) &&
      new Date(message.updated_at).getTime() - new Date(message.created_at).getTime() > 2000 &&
      message.is_edited !== false)
  );

  // Check 15-minute edit window (timer resets on each edit as updated_at is refreshed)
  const lastActiveTimestamp = message.updated_at || message.created_at;
  const isWithinEditWindow =
    Date.now() - new Date(lastActiveTimestamp).getTime() <= 15 * 60 * 1000;
  const canEdit = isSent && message.message_type === 'text' && !isDeleted && isWithinEditWindow;

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
    const diffX = currentX - touchStartX.current; // positive when swiping right
    const diffY = Math.abs(touchStartY.current - currentY);

    if (diffX > 8 && diffX > diffY * 1.1) {
      setSwipeOffset(Math.min(diffX, 70));
    } else if (diffY > diffX && diffY > 20) {
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping && swipeOffset > 38 && !isDeleted) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
      startReply(message);
    } else if (!isDeleted && swipeOffset < 10) {
      // Double-tap detection on mobile
      const now = Date.now();
      if (now - lastTapRef.current < 320) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
        startReply(message);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const handleDoubleClick = () => {
    if (!isDeleted) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
      startReply(message);
    }
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
      {/* Swipe-to-reply reveal indicator on right-swipe */}
      {swipeOffset > 12 && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.max(6, swipeOffset * 0.45)}px`,
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
            opacity: Math.min(swipeOffset / 38, 1),
            transition: 'opacity 0.15s ease',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <Reply size={15} />
        </div>
      )}

      <div
        className={`message-bubble ${isSticker ? 'sticker-bubble' : ''} ${isImage ? 'image-bubble' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : 'none',
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
            <div className="quoted-sender">
              {message.reply_to_message.sender_name || 'Friend'}
            </div>
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
              src={resolveMediaUrl(message.sticker_url || message.media_url)}
              alt={message.sticker_name || 'Sticker'}
              className="sticker-img"
              onClick={() => {
                const url = resolveMediaUrl(message.sticker_url || message.media_url);
                if (url) onOpenImage(url);
              }}
            />
          </div>
        ) : isImage ? (
          <div className="message-image-container">
            <div
              className="message-image-preview"
              onClick={() => {
                const url = resolveMediaUrl(message.media_url);
                if (url) onOpenImage(url);
              }}
              title="Click to view image"
            >
              <img
                src={resolveMediaUrl(message.media_url)}
                alt="Image attachment"
                className="message-image"
                loading="lazy"
              />
              <div className="message-image-overlay">
                <span className="image-zoom-hint">
                  <ZoomIn size={12} />
                  <span>View</span>
                </span>
              </div>
            </div>
            {message.content && <div className="message-caption">{message.content}</div>}
          </div>
        ) : (
          <div className="message-text">{message.content}</div>
        )}

        {/* Timestamp & Status Metadata */}
        <div className="message-meta">
          {isEdited && <span className="edited-badge">edited</span>}
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
            className={`bubble-action-btn ${showMenu ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="Message options"
            aria-label="Message options"
          >
            <MoreHorizontal size={14} />
          </button>
        )}

        {/* Context Menu Dropdown */}
        {showMenu && (
          <div
            ref={menuRef}
            className="bubble-menu-dropdown"
            style={{
              right: isSent ? '0' : 'auto',
              left: isSent ? 'auto' : '0',
            }}
          >
            <button className="bubble-menu-item" onClick={handleReply}>
              <Reply size={14} /> Reply
            </button>

            {message.content && (
              <button className="bubble-menu-item" onClick={handleCopy}>
                <Copy size={14} /> Copy
              </button>
            )}

            {canEdit && (
              <button className="bubble-menu-item" onClick={handleEdit}>
                <Edit3 size={14} /> Edit
              </button>
            )}

            {isSent && (
              <button className="bubble-menu-item danger" onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

