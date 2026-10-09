import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { useChat } from '../../context/ChatContext.js';
import { api } from '../../services/api.js';
import { FriendRequest } from '../../types/index.js';
import { getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { EmptyState } from '../common/EmptyState.js';
import { UserCheck, Check, X, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RequestsListProps {
  onOpenSearch: () => void;
  onOpenChat: (convId: string) => void;
}

export const RequestsList: React.FC<RequestsListProps> = ({ onOpenSearch, onOpenChat }) => {
  const { showToast, receivedRequests, sentRequests, isLoadingRequests, refreshFriendRequests } = useSocket();
  const { refreshConversations } = useChat();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    refreshFriendRequests();
  }, [refreshFriendRequests]);

  const handleAccept = async (req: FriendRequest) => {
    try {
      setProcessingId(req.id);
      const res = await api.acceptFriendRequest({ requestId: req.id });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      showToast(`Connected with ${req.display_name}!`, 'success');
      await Promise.all([refreshFriendRequests(), refreshConversations()]);
      if (res.conversationId) {
        onOpenChat(res.conversationId);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to accept request', 'warning');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      setProcessingId(reqId);
      await api.rejectFriendRequest({ requestId: reqId });
      await refreshFriendRequests();
      showToast('Friend request rejected', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject request', 'warning');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (reqId: string) => {
    try {
      setProcessingId(reqId);
      await api.cancelFriendRequest({ requestId: reqId });
      await refreshFriendRequests();
      showToast('Friend request cancelled', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel request', 'warning');
    } finally {
      setProcessingId(null);
    }
  };

  const isLoading = isLoadingRequests && receivedRequests.length === 0 && sentRequests.length === 0;
  const currentList = tab === 'received' ? receivedRequests : sentRequests;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-sidebar)',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setTab('received')}
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: tab === 'received' ? 600 : 500,
            backgroundColor: tab === 'received' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: tab === 'received' ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          Received ({receivedRequests.length})
        </button>
        <button
          onClick={() => setTab('sent')}
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: tab === 'sent' ? 600 : 500,
            backgroundColor: tab === 'sent' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: tab === 'sent' ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          Sent ({sentRequests.length})
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading requests...
          </div>
        ) : currentList.length === 0 ? (
          <EmptyState
            icon={<UserCheck size={26} />}
            title={tab === 'received' ? 'No incoming requests' : 'No sent requests'}
            description={
              tab === 'received'
                ? 'When someone wants to connect with you, their request will appear here.'
                : 'Search for someone by username to send them a friend request.'
            }
            actionText="Find People"
            onAction={onOpenSearch}
          />
        ) : (
          currentList.map((req) => (
            <div key={req.id} className="card-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div className="conv-avatar-wrap">
                  {req.profile_image ? (
                    <img src={req.profile_image} alt={req.display_name} className="avatar-img" />
                  ) : (
                    <div
                      className="avatar-img"
                      style={{ backgroundColor: getAvatarFallbackColor(req.display_name) }}
                    >
                      {getInitials(req.display_name)}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {req.display_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    @{req.username}
                  </div>
                  {req.bio && (
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
                      {req.bio}
                    </div>
                  )}
                </div>
              </div>

              {tab === 'received' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => handleAccept(req)}
                    disabled={processingId === req.id}
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', gap: '4px' }}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> Pending
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCancel(req.id)}
                    disabled={processingId === req.id}
                    style={{ padding: '5px 8px', fontSize: '11.5px' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
