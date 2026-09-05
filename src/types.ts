export interface UserProfile {
  uid: string;
  displayName: string;
  firstName: string;
  lastName: string;
  nickName: string;
  phoneNumber: string;
  email: string;
  username?: string;
  photoURL?: string;
  bio?: string;
  status?: 'online' | 'offline';
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  banUntil?: string;
  isPermanentlyBanned?: boolean;
  reportCount?: number;
  blockedUsers?: string[];
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: string;
  read: boolean;
  senderName?: string;
  isAdmin?: boolean;
}

export interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderUid: string;
    createdAt: string;
  };
  updatedAt: string;
  isSupport?: boolean;
  userUid?: string;
}

export interface StaffMember {
  uid: string;
  email: string;
  name?: string;
  password?: string;
  role: 'super' | 'admin' | 'staff' | 'moderator';
  title?: string;
  status?: 'active' | 'suspended';
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
