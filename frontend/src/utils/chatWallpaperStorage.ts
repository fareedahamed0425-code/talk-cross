import { useState, useEffect } from 'react';

export interface ChatWallpaper {
  conversationId: string;
  dataUrl: string;
  overlayDim: number; // 0 to 1, default 0.65
  blur: number; // 0 to 10px, default 0
  updatedAt: string;
}

const STORAGE_PREFIX = 'talkcross_chat_wallpaper_';
const WALLPAPER_EVENT = 'talkcross_wallpaper_updated';

/**
 * Get saved wallpaper for a conversation
 */
export function getChatWallpaper(conversationId: string): ChatWallpaper | null {
  if (!conversationId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${conversationId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse chat wallpaper:', e);
    return null;
  }
}

/**
 * Save wallpaper for a conversation and broadcast change
 */
export function saveChatWallpaper(wallpaper: ChatWallpaper): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${wallpaper.conversationId}`,
      JSON.stringify(wallpaper)
    );
    window.dispatchEvent(
      new CustomEvent(WALLPAPER_EVENT, {
        detail: { conversationId: wallpaper.conversationId },
      })
    );
  } catch (e) {
    console.error('Failed to save chat wallpaper:', e);
  }
}

/**
 * Remove wallpaper for a conversation and broadcast change
 */
export function removeChatWallpaper(conversationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${conversationId}`);
    window.dispatchEvent(
      new CustomEvent(WALLPAPER_EVENT, {
        detail: { conversationId },
      })
    );
  } catch (e) {
    console.error('Failed to remove chat wallpaper:', e);
  }
}

/**
 * React hook to reactively subscribe to a conversation's wallpaper
 */
export function useChatWallpaper(conversationId?: string | null): ChatWallpaper | null {
  const [wallpaper, setWallpaper] = useState<ChatWallpaper | null>(() => {
    return conversationId ? getChatWallpaper(conversationId) : null;
  });

  useEffect(() => {
    if (!conversationId) {
      setWallpaper(null);
      return;
    }

    setWallpaper(getChatWallpaper(conversationId));

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId?: string }>;
      if (!customEvent.detail || customEvent.detail.conversationId === conversationId) {
        setWallpaper(getChatWallpaper(conversationId));
      }
    };

    window.addEventListener(WALLPAPER_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(WALLPAPER_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [conversationId]);

  return wallpaper;
}
