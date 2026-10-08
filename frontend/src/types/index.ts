export interface User {
  id: string;
  firebase_uid: string;
  username: string;
  display_name: string;
  email: string | null;
  profile_image: string | null;
  bio: string;
  online_status: boolean;
  last_seen: string;
  created_at?: string;
}

export interface UserStats {
  friendsCount: number;
  stickersCount: number;
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  profile_image: string | null;
  bio: string;
  online_status: boolean;
  last_seen: string;
  friendship_status: FriendshipStatus;
  request_id?: string;
}

export interface Friend {
  id: string;
  username: string;
  display_name: string;
  profile_image: string | null;
  bio: string;
  online_status: boolean;
  last_seen: string;
  friendship_date?: string;
  conversation_id?: string;
}

export interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender_id?: string;
  receiver_id?: string;
  username: string;
  display_name: string;
  profile_image: string | null;
  bio: string;
  online_status: boolean;
  last_seen: string;
}

export type MessageType = 'text' | 'image' | 'sticker';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_name?: string;
  message_type: MessageType;
  content: string | null;
  media_url: string | null;
  sticker_id: string | null;
  sticker_url?: string | null;
  sticker_name?: string | null;
  reply_to_message_id: string | null;
  reply_to_message?: {
    id: string;
    content: string | null;
    message_type: MessageType;
    media_url: string | null;
    sender_name?: string;
  } | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  is_read: boolean;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    profile_image: string | null;
  };
  sending?: boolean;
  failed?: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    profile_image: string | null;
    online_status: boolean;
    last_seen: string;
    bio?: string;
  };
  last_message?: {
    id: string;
    content: string | null;
    message_type: MessageType;
    sender_id: string | null;
    created_at: string;
    is_deleted: boolean;
  } | null;
  unread_count: number;
}

export interface Sticker {
  id: string;
  name: string;
  storage_url: string;
  is_default?: boolean;
  user_id?: string;
  created_at?: string;
}
