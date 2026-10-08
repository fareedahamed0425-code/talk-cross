import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { ChatHeader } from './ChatHeader.js';
import { MessageList } from './MessageList.js';
import { ChatComposer } from './ChatComposer.js';
import { ImagePreviewModal } from './ImagePreviewModal.js';
import { EmptyState } from '../common/EmptyState.js';
import { MessageSquare, PanelLeftOpen } from 'lucide-react';

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
    <main className="chat-area">
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
