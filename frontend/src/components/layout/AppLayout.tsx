import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useChat } from '../../context/ChatContext.js';
import { Sidebar, SidebarTab } from '../sidebar/Sidebar.js';
import { ChatArea } from '../chat/ChatArea.js';
import { UsernameModal } from '../auth/UsernameModal.js';
import { NotificationBanner } from '../common/NotificationBanner.js';
import { InstallPrompt } from '../common/InstallPrompt.js';
import { notificationService } from '../../services/notificationService.js';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { activeConversationId, selectConversation } = useChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Set up deep-link navigation handler for push notification clicks
  useEffect(() => {
    notificationService.setNavigateHandler((convId) => {
      selectConversation(convId);
      navigate(`/chat/${convId}`);
    });
  }, [selectConversation, navigate]);

  // Derive active tab from current URL pathname
  const getTabFromPath = (pathname: string): SidebarTab => {
    if (pathname.startsWith('/contacts')) return 'contacts';
    if (pathname.startsWith('/requests')) return 'requests';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/stickers')) return 'stickers';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'chats';
  };

  const activeTab = getTabFromPath(location.pathname);

  // Synchronize conversation from route param & support hardware/gesture back button
  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      selectConversation(conversationId);
    } else if (!conversationId && activeConversationId && location.pathname === '/chat') {
      selectConversation(null);
    }
  }, [conversationId, activeConversationId, selectConversation, location.pathname]);

  const handleTabChange = (tab: SidebarTab) => {
    if (tab === 'chats') {
      if (activeConversationId) {
        navigate(`/chat/${activeConversationId}`);
      } else {
        navigate('/chat');
      }
    } else {
      navigate(`/${tab}`);
    }
  };

  const handleBackMobile = () => {
    selectConversation(null);
    navigate('/chat');
  };

  const handleOpenChat = (convId: string) => {
    selectConversation(convId);
    navigate(`/chat/${convId}`);
  };

  const handleOpenSearch = () => {
    navigate('/search');
    setIsSidebarCollapsed(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar (Navigation Rail + Collapsible Panel) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenChat={handleOpenChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Chat Area (Individual Floating Card) */}
      <div className={`chat-area-wrap ${!activeConversationId ? 'hidden-mobile' : ''}`}>
        <ChatArea
          onBackMobile={activeConversationId ? handleBackMobile : undefined}
          onOpenSearch={handleOpenSearch}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Modal Dialogs, Rich Notifications & Install App Prompt */}
      <UsernameModal />
      <NotificationBanner />
      <InstallPrompt />
    </div>
  );
};

export default AppLayout;
