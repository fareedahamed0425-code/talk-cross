import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { api } from '../../services/api.js';
import { getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import { AtSign, Camera, LogOut, Check, X, Bell, BellRing, Image as ImageIcon, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

export const ProfilePanel: React.FC = () => {
  const { user, stats, updateUserProfile, signOut, refreshProfile } = useAuth();
  const { showToast, notificationPermission, requestNotificationPermission, sendTestNotification } = useSocket();

  const [displayName, setDisplayName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string>('');

  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setProfileImage(user.profile_image || null);
    }
  }, [user]);

  // Username validation check
  useEffect(() => {
    if (!username || username === user?.username) {
      setIsUsernameAvailable(true);
      setUsernameError('');
      return;
    }

    if (username.length < 3) {
      setIsUsernameAvailable(false);
      setUsernameError('Must be at least 3 characters');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingUsername(true);
        const res = await api.checkUsername(username);
        setIsUsernameAvailable(res.available);
        setUsernameError(res.available ? '' : res.reason || 'Username is taken');
      } catch (err: any) {
        setIsUsernameAvailable(false);
        setUsernameError(err.message || 'Error checking username');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const res = await api.uploadMedia(file, 'avatars');
      setProfileImage(res.url);
      await updateUserProfile({ profileImage: res.url });
      showToast('Profile photo updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'warning');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'warning');
      return;
    }

    if (isUsernameAvailable === false) {
      showToast('Please choose an available username', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        profileImage,
      });
      await refreshProfile();
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-sidebar)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          My Profile
        </span>
        <button
          onClick={signOut}
          className="btn-secondary"
          style={{ display: 'flex', gap: '6px', fontSize: '12.5px', color: 'var(--danger)' }}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      <div className="sidebar-content" style={{ padding: '20px 18px' }}>
        <form onSubmit={handleSaveProfile}>
          {/* Avatar with upload hover trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div
              style={{
                position: 'relative',
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: getAvatarFallbackColor(displayName),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 600,
                    color: 'white',
                  }}
                >
                  {getInitials(displayName)}
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isUploadingAvatar ? 1 : 0.8,
                  transition: 'opacity 0.2s',
                  color: 'white',
                }}
              >
                <Camera size={22} />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '8px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              {isUploadingAvatar ? 'Uploading avatar...' : 'Change Profile Photo'}
            </span>
          </div>

          {/* Stats Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                {stats?.friendsCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Friends</div>
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--emerald)' }}>
                {stats?.stickersCount || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Custom Stickers</div>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Display Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }}
                required
              />
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Username (@handle)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <AtSign size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  style={{ width: '100%', padding: '10px 36px 10px 34px', fontSize: '14px', fontFamily: 'monospace' }}
                  required
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  {isCheckingUsername && <div style={{ width: '12px', height: '12px', border: '2px solid var(--text-muted)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                  {!isCheckingUsername && isUsernameAvailable === true && <Check size={16} color="var(--emerald)" />}
                  {!isCheckingUsername && isUsernameAvailable === false && <X size={16} color="var(--danger)" />}
                </div>
              </div>
              {usernameError && (
                <span style={{ fontSize: '11.5px', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                  {usernameError}
                </span>
              )}
            </div>

            {/* Bio */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Bio / Status
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Say something about yourself..."
                rows={3}
                maxLength={200}
                style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', resize: 'none' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', float: 'right', marginTop: '2px' }}>
                {bio.length}/200
              </span>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || isUsernameAvailable === false}
              style={{ width: '100%', padding: '12px', marginTop: '12px', justifyContent: 'center' }}
            >
              {isSaving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Push Notifications Section */}
        <div
          style={{
            marginTop: '28px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--burgundy-vibrant), var(--burgundy-primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <BellRing size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Push Notifications
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Instant alerts for messages & photos
                </div>
              </div>
            </div>

            {/* Permission Badge */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor:
                  notificationPermission === 'granted'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : notificationPermission === 'denied'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                color:
                  notificationPermission === 'granted'
                    ? '#10b981'
                    : notificationPermission === 'denied'
                    ? '#ef4444'
                    : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {notificationPermission === 'granted' ? (
                <>
                  <CheckCircle size={12} /> Enabled
                </>
              ) : notificationPermission === 'denied' ? (
                <>
                  <AlertCircle size={12} /> Blocked
                </>
              ) : (
                'Not Enabled'
              )}
            </span>
          </div>

          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={() => requestNotificationPermission()}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '12.5px',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '14px',
              }}
            >
              <Bell size={14} /> Enable Push Notifications
            </button>
          )}

          {/* Test Buttons */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Test Notification Previews:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => sendTestNotification('image')}
                style={{
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <ImageIcon size={14} color="#f43f5e" /> Test Photo
              </button>
              <button
                type="button"
                onClick={() => sendTestNotification('message')}
                style={{
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <MessageSquare size={14} color="#38bdf8" /> Test Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
