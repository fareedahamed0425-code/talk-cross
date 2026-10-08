import { useState, useEffect } from 'react';

const STORAGE_NAMES = 'talkcross_blurred_names';
const STORAGE_AVATARS = 'talkcross_blurred_avatars';
const STORAGE_MUTED = 'talkcross_muted_chats';

function getStoredSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event('chat_privacy_updated'));
  } catch {
    // Ignore storage quota
  }
}

export const chatPrivacy = {
  isNameBlurred(convId: string): boolean {
    return getStoredSet(STORAGE_NAMES).has(convId);
  },

  toggleBlurName(convId: string): boolean {
    const set = getStoredSet(STORAGE_NAMES);
    const newVal = !set.has(convId);
    if (newVal) set.add(convId);
    else set.delete(convId);
    saveStoredSet(STORAGE_NAMES, set);
    return newVal;
  },

  isAvatarBlurred(convId: string): boolean {
    return getStoredSet(STORAGE_AVATARS).has(convId);
  },

  toggleBlurAvatar(convId: string): boolean {
    const set = getStoredSet(STORAGE_AVATARS);
    const newVal = !set.has(convId);
    if (newVal) set.add(convId);
    else set.delete(convId);
    saveStoredSet(STORAGE_AVATARS, set);
    return newVal;
  },

  isChatMuted(convId: string): boolean {
    return getStoredSet(STORAGE_MUTED).has(convId);
  },

  toggleMuteChat(convId: string): boolean {
    const set = getStoredSet(STORAGE_MUTED);
    const newVal = !set.has(convId);
    if (newVal) set.add(convId);
    else set.delete(convId);
    saveStoredSet(STORAGE_MUTED, set);
    return newVal;
  },
};

export function useChatPrivacy() {
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const handler = () => setTick((prev) => prev + 1);
    window.addEventListener('chat_privacy_updated', handler);
    return () => window.removeEventListener('chat_privacy_updated', handler);
  }, []);

  return chatPrivacy;
}
