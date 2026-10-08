// Talk Cross Rich Push & In-App Notification Service

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    conversationId?: string;
    senderId?: string;
    type?: string;
  };
  onClick?: () => void;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private onNavigateCallback: ((conversationId: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }

    // Listen to messages from Service Worker when a notification is clicked
    if (typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE_CHAT' && event.data.conversationId) {
          if (this.onNavigateCallback) {
            this.onNavigateCallback(event.data.conversationId);
          }
        }
      });
    }
  }

  public setNavigateHandler(handler: (conversationId: string) => void) {
    this.onNavigateCallback = handler;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (this.isSupported()) {
      this.permission = Notification.permission;
      return this.permission;
    }
    return 'denied';
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return 'denied';
    }
  }

  public async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported()) return;

    if (this.permission !== 'granted') {
      const perm = await this.requestPermission();
      if (perm !== 'granted') return;
    }

    // Trigger haptic vibration on supported devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 60, 120]);
      } catch {
        // Ignore vibration errors
      }
    }

    const title = payload.title;
    const defaultIcon = '/icon-192.png';
    const icon = payload.icon || defaultIcon;
    const image = payload.image;
    const tag = payload.tag || 'talkcross-notif';
    const data = payload.data || {};

    // 1. Try Service Worker showNotification first (best for rich push with large image preview & background support)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          const options: any = {
            body: payload.body,
            icon: icon,
            badge: defaultIcon,
            tag: tag,
            data: data,
            renotify: true,
            vibrate: [120, 60, 120],
          };

          if (image) {
            options.image = image;
          }

          await registration.showNotification(title, options);
          return;
        }
      } catch (swErr) {
        console.warn('Service worker notification failed, falling back to Notification API:', swErr);
      }
    }

    // 2. Fallback to standard Notification API
    try {
      const notif = new Notification(title, {
        body: payload.body,
        icon: icon,
        image: image,
        tag: tag,
        data: data,
      } as any);

      notif.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notif.close();

        if (payload.onClick) {
          payload.onClick();
        } else if (data.conversationId && this.onNavigateCallback) {
          this.onNavigateCallback(data.conversationId);
        } else if (data.url) {
          window.location.href = data.url;
        }
      };
    } catch (err) {
      console.error('Error creating native notification:', err);
    }
  }

  // Convenience helper for incoming chat message notifications
  public notifyIncomingMessage(options: {
    senderName: string;
    senderUsername?: string;
    senderAvatar?: string | null;
    messageType: 'text' | 'image' | 'sticker';
    content: string | null;
    mediaUrl?: string | null;
    stickerName?: string | null;
    conversationId: string;
    onOpen?: () => void;
  }) {
    const {
      senderName,
      senderUsername,
      senderAvatar,
      messageType,
      content,
      mediaUrl,
      stickerName,
      conversationId,
      onOpen,
    } = options;

    const senderDisplay = senderName || 'Someone';

    let title = '';
    let body = '';
    let image: string | undefined = undefined;

    switch (messageType) {
      case 'image':
        title = `📷 ${senderDisplay} sent a photo`;
        body = content ? `"${content}"` : `Tap to view the photo`;
        image = mediaUrl || undefined;
        break;

      case 'sticker':
        title = `✨ ${senderDisplay} sent a sticker`;
        body = stickerName ? `[${stickerName}]` : `Tap to view sticker`;
        break;

      case 'text':
      default:
        title = `💬 ${senderDisplay}${senderUsername ? ` (@${senderUsername})` : ''}`;
        body = content || 'Sent you a new message';
        break;
    }

    this.showNotification({
      title,
      body,
      icon: senderAvatar || '/icon-192.png',
      image,
      tag: `conv-${conversationId}`,
      data: {
        url: `/chat/${conversationId}`,
        conversationId,
        type: messageType,
      },
      onClick: onOpen,
    });
  }

  // Convenience helper for friend requests
  public notifyFriendRequest(options: {
    senderName: string;
    senderUsername?: string;
    senderAvatar?: string | null;
    onOpen?: () => void;
  }) {
    const { senderName, senderUsername, senderAvatar, onOpen } = options;
    this.showNotification({
      title: `👋 Friend Request`,
      body: `${senderName}${senderUsername ? ` (@${senderUsername})` : ''} sent you a friend request`,
      icon: senderAvatar || '/icon-192.png',
      tag: 'friend-request',
      data: {
        url: '/requests',
        type: 'friend_request',
      },
      onClick: onOpen,
    });
  }

  // Convenience helper for friend accepted
  public notifyFriendAccepted(options: {
    friendName: string;
    friendAvatar?: string | null;
    onOpen?: () => void;
  }) {
    const { friendName, friendAvatar, onOpen } = options;
    this.showNotification({
      title: `🎉 Friend Request Accepted!`,
      body: `You and ${friendName} are now connected. Start chatting!`,
      icon: friendAvatar || '/icon-192.png',
      tag: 'friend-accepted',
      data: {
        url: '/chat',
        type: 'friend_accepted',
      },
      onClick: onOpen,
    });
  }
}

export const notificationService = new NotificationService();
