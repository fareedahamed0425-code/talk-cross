// ==========================================================================
// INDIAN STANDARD TIME (IST - Asia/Kolkata / UTC+5:30) TIME FORMATTER
// ==========================================================================

const IST_TIMEZONE = 'Asia/Kolkata';

export function formatMessageTime(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatConversationTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();

  // Convert to IST date strings for exact same-day comparison
  const istDateStr = date.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE });
  const istNowStr = now.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE });

  if (istDateStr === istNowStr) {
    return date.toLocaleTimeString('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const istYesterdayStr = yesterday.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE });

  if (istDateStr === istYesterdayStr) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateDivider(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();

  const istDateStr = date.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE });
  const istNowStr = now.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE });

  if (istDateStr === istNowStr) return 'Today (IST)';

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const istYesterdayStr = yesterday.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE });

  if (istDateStr === istYesterdayStr) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLastSeen(lastSeenString: string | Date, isOnline: boolean): string {
  if (isOnline) return 'Online';
  if (!lastSeenString) return 'Offline';

  const date = new Date(lastSeenString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Last seen just now';
  if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
  if (diffHours < 24) return `Last seen ${diffHours}h ago`;
  if (diffDays === 1) return `Last seen yesterday at ${formatMessageTime(date)} IST`;
  if (diffDays < 7) return `Last seen ${diffDays}d ago`;

  return `Last seen on ${date.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, month: 'short', day: 'numeric' })} at ${formatMessageTime(date)} IST`;
}

export function getAvatarFallbackColor(name: string): string {
  const colors = [
    '#800020', '#9f1239', '#881337', '#be123c',
    '#e11d48', '#a21caf', '#7c2d12', '#4c0519',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateTalkCrossMediaName(originalName?: string, mimeType?: string): string {
  const ext = originalName?.split('.').pop() || (mimeType ? mimeType.split('/')[1]?.replace('+xml', '') : 'jpg') || 'jpg';
  const cleanExt = (ext === 'jpeg' ? 'jpg' : ext).toLowerCase();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const randNo = Math.floor(100 + Math.random() * 900);
  const imageSeq = `${hours}${mins}${secs}_${randNo}`;

  return `talk-cross(${dateStr}_image_${imageSeq}).${cleanExt}`;
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    const origin = apiUrl.replace(/\/api\/?$/, '');
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
}

