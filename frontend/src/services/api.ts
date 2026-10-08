import {
  User,
  UserSearchResult,
  Friend,
  FriendRequest,
  Conversation,
  Message,
  Sticker,
  UserStats,
  MessageType,
} from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private token: string | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch {
        // Fallback to generic message
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // --- AUTH ---
  public async syncUser(payload: {
    username?: string;
    displayName?: string;
    email?: string | null;
    profileImage?: string | null;
  }): Promise<{ user: User; isNew: boolean }> {
    return this.request('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async checkUsername(username: string, currentUserId?: string): Promise<{ available: boolean; reason?: string; username?: string; isCurrent?: boolean }> {
    const url = currentUserId
      ? `/auth/username-check?username=${encodeURIComponent(username)}&currentUserId=${encodeURIComponent(currentUserId)}`
      : `/auth/username-check?username=${encodeURIComponent(username)}`;
    return this.request(url);
  }

  // --- USER PROFILE ---
  public async getMe(): Promise<{ user: User; stats: UserStats }> {
    return this.request('/users/me');
  }

  public async updateMe(payload: {
    displayName?: string;
    username?: string;
    bio?: string;
    profileImage?: string | null;
  }): Promise<{ user: User }> {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async searchUsers(query: string): Promise<{ results: UserSearchResult[] }> {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }

  public async getUserByUsername(username: string): Promise<{ user: UserSearchResult }> {
    return this.request(`/users/${encodeURIComponent(username)}`);
  }

  // --- FRIENDS & REQUESTS ---
  public async getFriends(): Promise<{ friends: Friend[] }> {
    return this.request('/friends');
  }

  public async getFriendRequests(): Promise<{ received: FriendRequest[]; sent: FriendRequest[] }> {
    return this.request('/friends/requests');
  }

  public async sendFriendRequest(payload: { receiverId?: string; username?: string }): Promise<{ request: any; message: string }> {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async acceptFriendRequest(payload: { requestId?: string; senderId?: string }): Promise<{ success: boolean; conversationId: string; friend: Friend }> {
    return this.request('/friends/accept', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async rejectFriendRequest(payload: { requestId?: string; senderId?: string }): Promise<{ success: boolean }> {
    return this.request('/friends/reject', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async cancelFriendRequest(payload: { requestId?: string; receiverId?: string }): Promise<{ success: boolean }> {
    return this.request('/friends/cancel', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async removeFriend(friendId: string): Promise<{ success: boolean }> {
    return this.request(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  // --- CONVERSATIONS ---
  public async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request('/conversations');
  }

  public async getOrCreateConversation(targetUserId: string): Promise<{ conversationId: string; created: boolean }> {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  public async createGroupConversation(payload: {
    title: string;
    memberIds: string[];
    groupImage?: string | null;
  }): Promise<{ conversationId: string; created: boolean }> {
    return this.request('/conversations/group', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- MESSAGES ---
  public async getMessages(conversationId: string, before?: string): Promise<{ messages: Message[]; hasMore: boolean }> {
    const url = before
      ? `/messages/conversations/${conversationId}/messages?before=${encodeURIComponent(before)}`
      : `/messages/conversations/${conversationId}/messages`;
    return this.request(url);
  }

  public async sendMessage(payload: {
    conversationId: string;
    messageType: MessageType;
    content?: string | null;
    mediaUrl?: string | null;
    stickerId?: string | null;
    replyToMessageId?: string | null;
  }): Promise<{ message: Message }> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async editMessage(messageId: string, content: string): Promise<{ message: Message }> {
    return this.request(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  public async deleteMessage(messageId: string): Promise<{ success: boolean; messageId: string }> {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  public async markConversationRead(conversationId: string): Promise<{ success: boolean }> {
    return this.request(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  }

  // --- STICKERS ---
  public async getStickers(): Promise<{ myStickers: Sticker[]; defaultStickers: Sticker[] }> {
    return this.request('/stickers');
  }

  public async createSticker(formData: FormData): Promise<{ sticker: Sticker }> {
    return this.request('/stickers', {
      method: 'POST',
      body: formData,
    });
  }

  public async createStickerFromDataUrl(name: string, dataUrl: string): Promise<{ sticker: Sticker }> {
    return this.request('/stickers', {
      method: 'POST',
      body: JSON.stringify({ name, dataUrl }),
    });
  }

  public async deleteSticker(stickerId: string): Promise<{ success: boolean }> {
    return this.request(`/stickers/${stickerId}`, {
      method: 'DELETE',
    });
  }

  // --- MEDIA UPLOAD ---
  public async uploadMedia(file: File, bucket: 'chat-media' | 'avatars' = 'chat-media'): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    return this.request('/media/upload', {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiService();
