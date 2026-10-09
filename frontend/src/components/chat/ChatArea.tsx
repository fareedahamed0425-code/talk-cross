import React, { useState, useRef } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { ChatHeader } from './ChatHeader.js';
import { MessageList } from './MessageList.js';
import { ChatComposer } from './ChatComposer.js';
import { ImagePreviewModal } from './ImagePreviewModal.js';
import { EmptyState } from '../common/EmptyState.js';
import { MessageSquare, PanelLeftOpen, ChevronLeft } from 'lucide-react';

interface ChatAreaProps {
  onBackMobile?: () => void;
  onOpenSearch?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onBackMobile,
  onOpenSearch,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { activeConversation, typingUsers } = useChat();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Mobile edge swipe-to-go-back gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [swipeDistanceX, setSwipeDistanceX] = useState<number>(0);
  const [isSwipingBack, setIsSwipingBack] = useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onBackMobile) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    // Allow swipe back only when initiating gesture at the left screen edge (within 28px)
    if (touch.clientX < 28) {
      setIsSwipingBack(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipingBack || !onBackMobile) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = Math.abs(touch.clientY - touchStartY.current);

    // Only recognize predominantly horizontal rightward swipes
    if (diffX > 15 && diffX > diffY * 1.2) {
      setSwipeDistanceX(Math.min(diffX, 120));
    } else if (diffY > diffX && diffY > 25) {
      // User is scrolling vertically
      setIsSwipingBack(false);
      setSwipeDistanceX(0);
    }
  };

  const handleTouchEnd = () => {
    if (isSwipingBack && swipeDistanceX > 65 && onBackMobile) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
      onBackMobile();
    }
    setIsSwipingBack(false);
    setSwipeDistanceX(0);
  };

  if (!activeConversation) {
    return (
      <main className="chat-area">
        {isSidebarCollapsed && onToggleSidebar && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              onClick={onToggleSidebar}
              className="icon-btn"
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={20} />
            </button>
          </div>
        )}
        <EmptyState
          icon={<MessageSquare size={36} />}
          title="Select a conversation"
          description="Choose a chat or search for friends by their @username."
          actionText="Find Friends"
          onAction={onOpenSearch}
        />
      </main>
    );
  }

  const typingUser = typingUsers[0];
  const typingText = typingUser ? `${typingUser.display_name} is typing...` : null;

  return (
    <main
      className="chat-area"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        transform: swipeDistanceX > 0 ? `translateX(${swipeDistanceX * 0.3}px)` : 'none',
        transition: isSwipingBack && swipeDistanceX > 0 ? 'none' : 'transform 0.2s ease',
      }}
    >
      {/* Visual Swipe-Back floating hint indicator on mobile */}
      {swipeDistanceX > 25 && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(swipeDistanceX * 0.8, 30)}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 150,
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'var(--burgundy-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px rgba(225, 29, 72, 0.5)',
            opacity: Math.min(swipeDistanceX / 60, 1),
            pointerEvents: 'none',
          }}
        >
          <ChevronLeft size={22} />
        </div>
      )}

      {/* 1. Header */}
      <ChatHeader
        conversation={activeConversation}
        onBack={onBackMobile}
        typingText={typingText}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
      />

      {/* 2. Message History Thread */}
      <MessageList onOpenImage={(url) => setLightboxImage(url)} />

      {/* 3. Composer */}
      <ChatComposer />

      {/* 4. Fullscreen Lightbox Modal */}
      <ImagePreviewModal
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </main>
  );
};
