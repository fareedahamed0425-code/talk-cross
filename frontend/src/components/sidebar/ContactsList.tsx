import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { api } from '../../services/api.js';
import { formatLastSeen, getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { EmptyState } from '../common/EmptyState.js';
import { Users, Search, MessageSquare, Trash2 } from 'lucide-react';

interface ContactsListProps {
  onOpenSearch: () => void;
  onOpenChat: (convId: string) => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({ onOpenSearch, onOpenChat }) => {
  const { openDirectChatWithUser } = useChat();
  const { isOnline, showToast, friends, isLoadingFriends, refreshFriends } = useSocket();
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    refreshFriends();
  }, [refreshFriends]);

  const handleStartChat = async (friendId: string) => {
    try {
      const convId = await openDirectChatWithUser(friendId);
      onOpenChat(convId);
    } catch (err: any) {
      showToast(err.message || 'Failed to open chat', 'warning');
    }
  };

  const handleRemoveFriend = async (e: React.MouseEvent, friendId: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove ${name} from your friends?`)) return;

    try {
      await api.removeFriend(friendId);
      await refreshFriends();
      showToast(`Removed ${name} from friends`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove friend', 'warning');
    }
  };

  const isLoading = isLoadingFriends && friends.length === 0;
  const filtered = friends.filter((f) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return f.display_name.toLowerCase().includes(term) || f.username.toLowerCase().includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Filter */}
      <div className="sidebar-search-box">
        <Search size={16} className="sidebar-search-icon" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter contacts..."
          className="sidebar-search-input"
        />
      </div>

      {/* Friends Count Banner */}
      <div
        style={{
          padding: '10px 18px',
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{friends.length} CONNECTED FRIENDS</span>
        <span style={{ color: 'var(--emerald)' }}>
          {friends.filter((f) => isOnline(f.id) || f.online_status).length} Online
        </span>
      </div>

      {/* Friends list */}
      <div className="sidebar-content">
        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading contacts...
          </div>
        ) : filtered.length === 0 ? (
          searchFilter ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No contacts match "{searchFilter}"
            </div>
          ) : (
            <EmptyState
              icon={<Users size={26} />}
              title="No friends yet"
              description="Search for people by their @username to send a friend request."
              actionText="Search People"
              onAction={onOpenSearch}
            />
          )
        ) : (
          filtered.map((friend) => {
            const online = isOnline(friend.id) || friend.online_status;
            return (
              <div
                key={friend.id}
                className="card-item"
                style={{ cursor: 'pointer' }}
                onClick={() => handleStartChat(friend.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div className="conv-avatar-wrap">
                    {friend.profile_image ? (
                      <img src={friend.profile_image} alt={friend.display_name} className="avatar-img" />
                    ) : (
                      <div
                        className="avatar-img"
                        style={{ backgroundColor: getAvatarFallbackColor(friend.display_name) }}
                      >
                        {getInitials(friend.display_name)}
                      </div>
                    )}
                    {online && <div className="online-dot" />}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {friend.display_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      @{friend.username}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: online ? 'var(--emerald)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {online ? '● Online' : formatLastSeen(friend.last_seen, false)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="icon-btn"
                    title="Send Message"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(friend.id);
                    }}
                    style={{ color: 'var(--primary)' }}
                  >
                    <MessageSquare size={17} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Remove Friend"
                    onClick={(e) => handleRemoveFriend(e, friend.id, friend.display_name)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
