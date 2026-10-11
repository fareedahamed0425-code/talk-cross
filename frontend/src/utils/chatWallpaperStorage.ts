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

// In-memory cache for fast access and fallback if localStorage quota is reached
const memoryWallpaperCache = new Map<string, ChatWallpaper>();

/**
 * Get saved wallpaper for a conversation
 */
export function getChatWallpaper(conversationId: string): ChatWallpaper | null {
  if (!conversationId || typeof window === 'undefined') return null;

  // 1. Check in-memory cache first
  if (memoryWallpaperCache.has(conversationId)) {
    return memoryWallpaperCache.get(conversationId)!;
  }

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryWallpaperCache.set(conversationId, parsed);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse chat wallpaper from localStorage:', e);
  }

  // 3. Fallback to sessionStorage
  try {
    const rawSession = sessionStorage.getItem(`${STORAGE_PREFIX}${conversationId}`);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      memoryWallpaperCache.set(conversationId, parsed);
      return parsed;
    }
  } catch (_) {}

  return null;
}

/**
 * Save wallpaper for a conversation and broadcast change
 */
export function saveChatWallpaper(wallpaper: ChatWallpaper): boolean {
  if (typeof window === 'undefined' || !wallpaper.conversationId) return false;

  // Store in memory cache immediately
  memoryWallpaperCache.set(wallpaper.conversationId, wallpaper);

  let saved = false;
  // Try persisting to localStorage
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${wallpaper.conversationId}`,
      JSON.stringify(wallpaper)
    );
    saved = true;
  } catch (e) {
    console.warn('localStorage write failed (quota or restriction), falling back to sessionStorage:', e);
    try {
      sessionStorage.setItem(
        `${STORAGE_PREFIX}${wallpaper.conversationId}`,
        JSON.stringify(wallpaper)
      );
      saved = true;
    } catch (sessionErr) {
      console.warn('sessionStorage write also failed, retaining in-memory:', sessionErr);
      // Still saved in memory cache for the active session
      saved = true;
    }
  }

  // Broadcast event across components and tabs
  try {
    window.dispatchEvent(
      new CustomEvent(WALLPAPER_EVENT, {
        detail: { conversationId: wallpaper.conversationId },
      })
    );
  } catch (eventErr) {
    console.error('Failed to dispatch wallpaper event:', eventErr);
  }

  return saved;
}

/**
 * Remove wallpaper for a conversation and broadcast change
 */
export function removeChatWallpaper(conversationId: string): void {
  if (typeof window === 'undefined') return;

  memoryWallpaperCache.delete(conversationId);

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${conversationId}`);
  } catch (e) {
    console.error('Failed to remove chat wallpaper from localStorage:', e);
  }

  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${conversationId}`);
  } catch (_) {}

  try {
    window.dispatchEvent(
      new CustomEvent(WALLPAPER_EVENT, {
        detail: { conversationId },
      })
    );
  } catch (e) {
    console.error('Failed to dispatch wallpaper removal event:', e);
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
