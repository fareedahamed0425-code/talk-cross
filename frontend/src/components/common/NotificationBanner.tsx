import React from 'react';
import { useSocket, InAppNotificationData } from '../../context/SocketContext.js';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext.js';
import { getAvatarFallbackColor, getInitials } from '../../utils/format.js';
import {
  X,
  CheckCircle,
  Info,
  AlertTriangle,
  MessageSquare,
  Image as ImageIcon,
  Smile,
  UserPlus,
  Sparkles,
  ArrowRight,
  Bell,
} from 'lucide-react';

export const NotificationBanner: React.FC = () => {
  const {
    toast,
    clearToast,
    inAppNotifications,
    dismissInAppNotification,
    notificationPermission,
    requestNotificationPermission,
  } = useSocket();
  const { selectConversation } = useChat();
  const navigate = useNavigate();

  const handleNotificationClick = (notif: InAppNotificationData) => {
    dismissInAppNotification(notif.id);
    if (notif.onClick) {
      notif.onClick();
    } else if (notif.conversationId) {
      selectConversation(notif.conversationId);
      navigate(`/chat/${notif.conversationId}`);
    } else if (notif.type === 'friend_request') {
      navigate('/requests');
    }
  };

  const getNotificationBadge = (type: InAppNotificationData['type']) => {
    switch (type) {
      case 'image':
        return {
          icon: <ImageIcon size={13} />,
          label: 'Photo',
          gradient: 'linear-gradient(135deg, #e11d48, #9f1239)',
          color: '#f43f5e',
        };
      case 'sticker':
        return {
          icon: <Smile size={13} />,
          label: 'Sticker',
          gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: '#a78bfa',
        };
      case 'friend_request':
        return {
          icon: <UserPlus size={13} />,
          label: 'Friend Request',
          gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          color: '#22d3ee',
        };
      case 'friend_accepted':
        return {
          icon: <Sparkles size={13} />,
          label: 'Connected',
          gradient: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#34d399',
        };
      case 'message':
      default:
        return {
          icon: <MessageSquare size={13} />,
          label: 'New Message',
          gradient: 'linear-gradient(135deg, #e11d48, #881337)',
          color: '#fb7185',
        };
    }
  };

  const toastIcon = {
    success: <CheckCircle size={18} color="#10b981" />,
    warning: <AlertTriangle size={18} color="#f59e0b" />,
    info: <Info size={18} color="#06b6d4" />,
  }[toast?.type || 'info'];

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '420px',
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Permission Request Floating Banner (if permission is 'default' and notifications exist or user hasn't chosen) */}
      {notificationPermission === 'default' && (
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'rgba(15, 15, 18, 0.95)',
            border: '1px solid rgba(225, 29, 72, 0.35)',
            borderRadius: '16px',
            padding: '14px 16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(159, 18, 57, 0.25)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'bannerSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #e11d48, #881337)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)',
            }}
          >
            <Bell size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
              Turn on push notifications
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
              Get instant alerts for messages & photos even when away.
            </div>
          </div>
          <button
            onClick={() => requestNotificationPermission()}
            className="btn-primary"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Enable
          </button>
        </div>
      )}

      {/* 2. Rich In-App Heads-Up Notifications */}
      {inAppNotifications.map((notif) => {
        const badge = getNotificationBadge(notif.type);
        const avatarBg = notif.senderName ? getAvatarFallbackColor(notif.senderName) : '#881337';
        const initials = notif.senderName ? getInitials(notif.senderName) : 'TC';

        return (
          <div
            key={notif.id}
            onClick={() => handleNotificationClick(notif)}
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'rgba(14, 14, 18, 0.94)',
              border: '1px solid rgba(225, 29, 72, 0.35)',
              borderRadius: '18px',
              padding: '14px 16px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.85), 0 0 28px rgba(159, 18, 57, 0.28)',
              backdropFilter: 'blur(24px)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'relative',
              overflow: 'hidden',
              animation: 'bannerSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(225, 29, 72, 0.65)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(225, 29, 72, 0.35)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Top Row: Type Pill + Sender + Dismiss */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: badge.gradient,
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  boxShadow: `0 2px 8px ${badge.color}40`,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </div>

              <div style={{ fontSize: '11.5px', color: '#71717a', marginLeft: 'auto' }}>Just now</div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissInAppNotification(notif.id);
                }}
                style={{
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            {/* Middle Row: Avatar + Sender Info + Message/Image Content */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Avatar with glow */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {notif.senderAvatar ? (
                  <img
                    src={notif.senderAvatar}
                    alt={notif.senderName}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      objectFit: 'cover',
                      border: '1.5px solid rgba(225, 29, 72, 0.5)',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      backgroundColor: avatarBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                      fontFamily: 'var(--font-brand)',
                      border: '1.5px solid rgba(225, 29, 72, 0.5)',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {initials}
                  </div>
                )}
                {/* Online pulse dot */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    border: '2px solid #0e0e12',
                    boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
                  }}
                />
              </div>

              {/* Text & Content Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '-0.2px',
                      fontFamily: 'var(--font-brand)',
                    }}
                  >
                    {notif.senderName}
                  </span>
                  {notif.senderUsername && (
                    <span style={{ fontSize: '12px', color: '#71717a' }}>@{notif.senderUsername}</span>
                  )}
                </div>

                {/* Content preview */}
                {notif.type === 'image' ? (
                  <div style={{ marginTop: '6px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#f43f5e',
                        fontWeight: 600,
                        marginBottom: notif.content ? '4px' : '0',
                      }}
                    >
                      <ImageIcon size={14} />
                      <span>Sent you a photo</span>
                    </div>
                    {notif.content && (
                      <div
                        style={{
                          fontSize: '12.5px',
                          color: '#cbd5e1',
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {notif.content}
                      </div>
                    )}
                  </div>
                ) : notif.type === 'sticker' ? (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '13px',
                      color: '#c4b5fd',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Smile size={14} />
                    <span>Sent a sticker {notif.stickerName ? `• ${notif.stickerName}` : ''}</span>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {notif.content || 'Sent a message'}
                  </div>
                )}
              </div>

              {/* Image thumbnail preview box for image notifications! */}
              {notif.type === 'image' && notif.mediaUrl && (
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1.5px solid rgba(225, 29, 72, 0.4)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    backgroundColor: '#18181b',
                    position: 'relative',
                  }}
                >
                  <img
                    src={notif.mediaUrl}
                    alt="Received attachment"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={10} color="#ffffff" />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row: Action pill button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                paddingTop: '8px',
                marginTop: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#fb7185',
                }}
              >
                <span>{notif.type === 'friend_request' ? 'View request' : 'Open chat'}</span>
                <ArrowRight size={13} />
              </div>
            </div>

            {/* Animated auto-dismiss progress bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '2px',
                background: 'linear-gradient(90deg, #e11d48, #9f1239)',
                width: '100%',
                animation: `notifProgress ${notif.type === 'image' ? '6.5s' : '5s'} linear forwards`,
              }}
            />
          </div>
        );
      })}

      {/* 3. Simple Toasts (success, warning, info) */}
      {toast && (
        <div
          style={{
            pointerEvents: 'auto',
            backgroundColor: 'rgba(16, 22, 34, 0.96)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(20px)',
            animation: 'bannerSlideDown 0.25s ease',
          }}
        >
          <div style={{ flexShrink: 0 }}>{toastIcon}</div>
          <div style={{ fontSize: '13.5px', lineHeight: 1.4, flex: 1 }}>{toast.message}</div>
          <button
            onClick={clearToast}
            style={{
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes bannerSlideDown {
          from { transform: translateY(-30px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes notifProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default NotificationBanner;
