import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useChat } from '../../context/ChatContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { Friend } from '../../types/index.js';
import { getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { Users, X, Search, Check, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useModalBackHandler } from '../../utils/useModalBackHandler.js';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (conversationId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  useModalBackHandler(isOpen, onClose, 'create-group');

  const { refreshConversations } = useChat();
  const { showToast } = useSocket();

  const [title, setTitle] = useState<string>('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Group image upload preview
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setSelectedFriendIds(new Set());
      setSearchFilter('');
      setGroupImageFile(null);
      setGroupImagePreview(null);
      return;
    }

    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true);
        const res = await api.getFriends();
        setFriends(res.friends);
      } catch (err) {
        console.error('Failed to load friends for group creation:', err);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'warning');
      return;
    }

    setGroupImageFile(file);
    setGroupImagePreview(URL.createObjectURL(file));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast('Please enter a group name', 'warning');
      return;
    }

    if (selectedFriendIds.size === 0) {
      showToast('Please select at least 1 friend to add to the group', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);

      let uploadedImageUrl: string | null = null;
      if (groupImageFile) {
        const uploadRes = await api.uploadMedia(groupImageFile);
        uploadedImageUrl = uploadRes.url;
      }

      const res = await api.createGroupConversation({
        title: trimmedTitle,
        memberIds: Array.from(selectedFriendIds),
        groupImage: uploadedImageUrl,
      });

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      showToast(`Group "${trimmedTitle}" created!`, 'success');
      await refreshConversations();
      onGroupCreated(res.conversationId);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFriends = friends.filter((f) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return f.display_name.toLowerCase().includes(term) || f.username.toLowerCase().includes(term);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(159, 18, 57, 0.2)',
                color: 'var(--burgundy-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Create New Group</h3>
          </div>
          <button onClick={onClose} className="icon-btn" style={{ width: '32px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleCreateGroup} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Group Picture & Name Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Group Avatar Upload */}
            <label
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-panel-secondary)',
                border: '2px dashed var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
              title="Upload Group Picture"
            >
              {groupImagePreview ? (
                <img src={groupImagePreview} alt="Group Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={20} color="var(--text-muted)" />
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>

            {/* Group Name Input */}
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Group Name (e.g. Squad, Weekend Trip)"
                maxLength={60}
                required
                className="input-field"
                style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
                autoFocus
              />
            </div>
          </div>

          {/* Member Selection Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                SELECT MEMBERS ({selectedFriendIds.size} selected)
              </span>
            </div>

            {/* Filter */}
            <div className="sidebar-search-box" style={{ padding: '0 0 10px 0', border: 'none' }}>
              <Search size={15} className="sidebar-search-icon" style={{ left: '12px' }} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search friends to add..."
                className="sidebar-search-input"
                style={{ padding: '8px 12px 8px 34px', fontSize: '13px' }}
              />
            </div>

            {/* Friends list */}
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-panel-secondary)',
              }}
            >
              {isLoadingFriends ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading friends...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {searchFilter ? 'No matching friends found' : 'No friends yet. Add friends first!'}
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const isSelected = selectedFriendIds.has(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="conv-avatar-wrap">
                          {f.profile_image ? (
                            <img
                              src={f.profile_image}
                              alt={f.display_name}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: getAvatarFallbackColor(f.display_name),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'white',
                              }}
                            >
                              {getInitials(f.display_name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {f.display_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>@{f.username}</div>
                        </div>
                      </div>

                      {/* Custom Checkbox */}
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid var(--burgundy-vibrant)' : '1px solid var(--border-strong)',
                          backgroundColor: isSelected ? 'var(--burgundy-vibrant)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && <Check size={13} color="white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !title.trim() || selectedFriendIds.size === 0}
            >
              {isSubmitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
