import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { formatDateDivider } from '../../utils/format.js';
import { MessageBubble } from './MessageBubble.js';
import { useChatWallpaper } from '../../utils/chatWallpaperStorage.js';
import { ChevronDown } from 'lucide-react';

interface MessageListProps {
  onOpenImage: (url: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ onOpenImage }) => {
  const { activeConversation, messages, isLoadingMessages, hasMoreMessages, loadMoreMessages, typingUsers } = useChat();
  const wallpaper = useChatWallpaper(activeConversation?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  // Auto-scroll to bottom on initial message load or new message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If scrolled up more than 150px from bottom, show scroll bottom button
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group messages by date
  const renderMessagesWithDates = () => {
    const elements: React.ReactNode[] = [];
    let lastDateStr = '';

    messages.forEach((msg, idx) => {
      const dateStr = formatDateDivider(msg.created_at);

      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        elements.push(
          <div key={`date-${dateStr}-${idx}`} className="date-divider">
            <span className="date-divider-badge">{dateStr}</span>
          </div>
        );
      }

      elements.push(
        <MessageBubble
          key={msg.id || idx}
          message={msg}
          onOpenImage={onOpenImage}
        />
      );
    });

    return elements;
  };

  const wallpaperStyle: React.CSSProperties = wallpaper
    ? {
        backgroundImage: `linear-gradient(rgba(10, 10, 14, ${wallpaper.overlayDim ?? 0.65}), rgba(10, 10, 14, ${wallpaper.overlayDim ?? 0.65})), url("${wallpaper.dataUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'local',
      }
    : {};

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`messages-container ${wallpaper ? 'has-custom-wallpaper' : ''}`}
      style={wallpaperStyle}
    >
      {/* Load More Trigger */}
      {hasMoreMessages && (
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <button
            className="btn-secondary"
            onClick={loadMoreMessages}
            disabled={isLoadingMessages}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            {isLoadingMessages ? 'Loading older messages...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 && !isLoadingMessages ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No messages yet
          </div>
          <div style={{ fontSize: '13.5px', maxWidth: '300px' }}>
            Say hello to start the conversation!
          </div>
        </div>
      ) : (
        renderMessagesWithDates()
      )}

      {/* Real-Time Typing Bubble */}
      {typingUsers.length > 0 && (
        <div className="message-row received">
          <div className="typing-bubble">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        </div>
      )}

      <div ref={bottomRef} style={{ height: '1px' }} />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="icon-btn"
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '24px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            zIndex: 20,
          }}
          title="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </button>
      )}
    </div>
  );
};
