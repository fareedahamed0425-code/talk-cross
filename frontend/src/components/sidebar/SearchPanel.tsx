import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { useChat } from '../../context/ChatContext.js';
import { api } from '../../services/api.js';
import { UserSearchResult } from '../../types/index.js';
import { getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { Search, UserPlus, MessageSquare, Clock } from 'lucide-react';

interface SearchPanelProps {
  onOpenChat: (convId: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onOpenChat }) => {
  const { isOnline, showToast } = useSocket();
  const { openDirectChatWithUser } = useChat();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.searchUsers(query);
        setResults(res.results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSendRequest = async (targetUser: UserSearchResult) => {
    try {
      setActionLoadingId(targetUser.id);
      await api.sendFriendRequest({ receiverId: targetUser.id });
      setResults((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, friendship_status: 'pending_sent' } : u))
      );
      showToast(`Friend request sent to @${targetUser.username}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to send friend request', 'warning');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenChat = async (userId: string) => {
    try {
      const convId = await openDirectChatWithUser(userId);
      onOpenChat(convId);
    } catch (err: any) {
      showToast(err.message || 'Failed to open chat', 'warning');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Input Box */}
      <div className="sidebar-search-box">
        <Search size={16} className="sidebar-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by @username or name..."
          className="sidebar-search-input"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="sidebar-content">
        {isSearching ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Searching users...
          </div>
        ) : query.trim() && results.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No users found
            </div>
            <div style={{ fontSize: '13px' }}>
              No accounts match "@{query.replace(/^@/, '')}". Try a different username.
            </div>
          </div>
        ) : !query.trim() ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 12px auto', color: 'var(--primary)', opacity: 0.6 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Discover People
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.45 }}>
              Type an exact or partial username (e.g. <code>@fareed</code>) to find and connect with friends.
            </div>
          </div>
        ) : (
          results.map((target) => {
            const online = isOnline(target.id) || target.online_status;
            return (
              <div key={target.id} className="card-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div className="conv-avatar-wrap">
                    {target.profile_image ? (
                      <img src={target.profile_image} alt={target.display_name} className="avatar-img" />
                    ) : (
                      <div
                        className="avatar-img"
                        style={{ backgroundColor: getAvatarFallbackColor(target.display_name) }}
                      >
                        {getInitials(target.display_name)}
                      </div>
                    )}
                    {online && <div className="online-dot" />}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {target.display_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                      @{target.username}
                    </div>
                    {target.bio && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '160px',
                          marginTop: '2px',
                        }}
                      >
                        {target.bio}
                      </div>
                    )}
                  </div>
                </div>

                {/* Relationship Button */}
                <div>
                  {target.friendship_status === 'friends' ? (
                    <button
                      className="btn-secondary"
                      onClick={() => handleOpenChat(target.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}
                    >
                      <MessageSquare size={14} color="var(--primary)" />
                      <span>Chat</span>
                    </button>
                  ) : target.friendship_status === 'pending_sent' ? (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <Clock size={13} />
                      <span>Requested</span>
                    </div>
                  ) : target.friendship_status === 'pending_received' ? (
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        try {
                          await api.acceptFriendRequest({ senderId: target.id });
                          setResults((prev) =>
                            prev.map((u) => (u.id === target.id ? { ...u, friendship_status: 'friends' } : u))
                          );
                          showToast(`Connected with ${target.display_name}!`, 'success');
                        } catch (err: any) {
                          showToast(err.message, 'warning');
                        }
                      }}
                      style={{ fontSize: '12.5px' }}
                    >
                      Accept
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => handleSendRequest(target)}
                      disabled={actionLoadingId === target.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}
                    >
                      <UserPlus size={14} />
                      <span>Add Friend</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
