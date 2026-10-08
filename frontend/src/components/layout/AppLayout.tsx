import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { Sidebar, SidebarTab } from '../sidebar/Sidebar.js';
import { ChatArea } from '../chat/ChatArea.js';
import { UsernameModal } from '../auth/UsernameModal.js';
import { Toast } from '../common/Toast.js';

export const AppLayout: React.FC = () => {
  const { activeConversationId, selectConversation } = useChat();
  const [activeTab, setActiveTab] = useState<SidebarTab>('chats');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const handleBackMobile = () => {
    selectConversation(null);
  };

  const handleOpenChat = (convId: string) => {
    setActiveTab('chats');
    selectConversation(convId);
  };

  return (
    <div className="app-container">
      {/* Sidebar (Navigation Rail + Collapsible Panel) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenChat={handleOpenChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Chat Area (Individual Floating Card) */}
      <div className={`chat-area-wrap ${!activeConversationId ? 'hidden-mobile' : ''}`}>
        <ChatArea
          onBackMobile={activeConversationId ? handleBackMobile : undefined}
          onOpenSearch={() => {
            setActiveTab('search');
            setIsSidebarCollapsed(false);
          }}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Modal Dialogs & Toasts */}
      <UsernameModal />
      <Toast />
    </div>
  );
};
