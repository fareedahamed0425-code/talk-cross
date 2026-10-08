import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { ConversationList } from './ConversationList.js';
import { ContactsList } from './ContactsList.js';
import { RequestsList } from './RequestsList.js';
import { SearchPanel } from './SearchPanel.js';
import { StickersStudio } from './StickersStudio.js';
import { ProfilePanel } from './ProfilePanel.js';
import { getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import {
  MessageSquare,
  Users,
  UserPlus,
  Search,
  Smile,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export type SidebarTab = 'chats' | 'contacts' | 'requests' | 'search' | 'stickers' | 'profile';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  onOpenChat: (convId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenChat,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user } = useAuth();
  const { conversations } = useChat();
  const { theme, toggleTheme } = useTheme();

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const getTitle = () => {
    switch (activeTab) {
      case 'chats':
        return 'Conversations';
      case 'contacts':
        return 'Contacts';
      case 'requests':
        return 'Friend Requests';
      case 'search':
        return 'Search Users';
      case 'stickers':
        return 'Sticker Studio';
      case 'profile':
        return 'My Profile';
    }
  };

  return (
    <>
      {/* 1. Left Vertical Navigation Rail (Individual Modular Floating Strip) */}
      <nav className="nav-rail">
        {/* Brand Icon / Logo */}
        <div
          className="nav-rail-logo"
          title="Talk Cross"
          onClick={() => {
            setActiveTab('chats');
            if (isCollapsed) onToggleCollapse();
          }}
        >
          <MessageSquare size={22} />
        </div>

        {/* Navigation Items */}
        <div className="nav-rail-items">
          <button
            className={`nav-item ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('chats');
              if (isCollapsed) onToggleCollapse();
            }}
            title="Conversations"
          >
            <MessageSquare size={21} />
            {totalUnread > 0 && <span className="nav-badge">{totalUnread}</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('contacts');
              if (isCollapsed) onToggleCollapse();
            }}
            title="Contacts"
          >
            <Users size={21} />
          </button>

          <button
            className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('requests');
              if (isCollapsed) onToggleCollapse();
            }}
            title="Friend Requests"
          >
            <UserPlus size={21} />
          </button>

          <button
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('search');
              if (isCollapsed) onToggleCollapse();
            }}
            title="Find People"
          >
            <Search size={21} />
          </button>

          <button
            className={`nav-item ${activeTab === 'stickers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('stickers');
              if (isCollapsed) onToggleCollapse();
            }}
            title="Sticker Studio"
          >
            <Smile size={21} />
          </button>
        </div>

        {/* Bottom Actions: Theme Switcher, Collapse Toggle & Profile */}
        <div className="nav-rail-bottom">
          {/* Collapse Sidebar Toggle */}
          <button
            className="nav-item"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            style={{ color: 'var(--text-muted)' }}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            className="nav-item"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="var(--burgundy-primary)" />}
          </button>

          {/* User Profile Avatar Trigger */}
          <button
            className={`user-avatar-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile');
              if (isCollapsed) onToggleCollapse();
            }}
            title="Profile & Settings"
          >
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.display_name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: getAvatarFallbackColor(user?.display_name || 'Me'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {getInitials(user?.display_name || 'U')}
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* 2. Dynamic Sidebar Panel (Collapsible Individual Card) */}
      <div className={`sidebar-panel-wrap ${isCollapsed ? 'collapsed' : ''}`}>
        <aside className="sidebar-panel">
          <div className="sidebar-header">
            <h2 className="sidebar-title">{getTitle()}</h2>
            <button
              onClick={onToggleCollapse}
              className="icon-btn"
              title="Collapse"
              style={{ width: '32px', height: '32px' }}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {activeTab === 'chats' && <ConversationList onOpenSearch={() => setActiveTab('search')} />}
          {activeTab === 'contacts' && <ContactsList onOpenSearch={() => setActiveTab('search')} onOpenChat={onOpenChat} />}
          {activeTab === 'requests' && <RequestsList onOpenSearch={() => setActiveTab('search')} onOpenChat={onOpenChat} />}
          {activeTab === 'search' && <SearchPanel onOpenChat={onOpenChat} />}
          {activeTab === 'stickers' && <StickersStudio />}
          {activeTab === 'profile' && <ProfilePanel />}
        </aside>
      </div>
    </>
  );
};
