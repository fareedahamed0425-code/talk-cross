export interface DbUser {
  id: string;
  firebase_uid: string;
  username: string;
  display_name: string;
  email: string | null;
  profile_image: string | null;
  bio: string;
  online_status: boolean;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface DbFriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: Date;
  updated_at: Date;
}

export interface DbFriendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: Date;
}

export interface DbConversation {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: Date;
}

export type MessageType = 'text' | 'image' | 'sticker';

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: MessageType;
  content: string | null;
  media_url: string | null;
  sticker_id: string | null;
  reply_to_message_id: string | null;
  created_at: Date;
  updated_at: Date;
  is_edited?: boolean;
  deleted_at: Date | null;
}

export interface DbSticker {
  id: string;
  user_id: string;
  name: string;
  storage_url: string;
  created_at: Date;
}

export interface MessageWithSender extends DbMessage {
  sender?: {
    id: string;
    username: string;
    display_name: string;
    profile_image: string | null;
  };
  reply_to_message?: {
    id: string;
    content: string | null;
    message_type: MessageType;
    media_url: string | null;
    sender_name?: string;
  } | null;
  read_by?: string[];
  is_read?: boolean;
}

export interface ConversationSummary {
  id: string;
  created_at: Date;
  updated_at: Date;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    profile_image: string | null;
    online_status: boolean;
    last_seen: Date;
    bio?: string;
  };
  last_message?: {
    id: string;
    content: string | null;
    message_type: MessageType;
    sender_id: string | null;
    created_at: Date;
    is_deleted: boolean;
  } | null;
  unread_count: number;
}

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  profile_image: string | null;
  bio: string;
  online_status: boolean;
  last_seen: Date;
  friendship_status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';
  request_id?: string;
}

export interface AuthUserContext {
  id: string;
  firebase_uid: string;
  username: string;
  display_name: string;
  email: string | null;
  profile_image: string | null;
  bio: string;
}
