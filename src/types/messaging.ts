
import type { Timestamp } from 'firebase/firestore';

export interface ChatParticipant {
  uid: string;
  displayName: string | null;
  photoURL?: string | null;
}

export interface ChatSession {
  id: string;
  participants: ChatParticipant[]; // Array of participant UIDs
  participantUids: string[]; // For querying
  lastMessageText?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // For potential future use like unread counts per user
  // unreadCounts?: { [userId: string]: number };
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string | null; // Denormalized for display
  senderAvatar?: string | null; // Denormalized for display
  text: string;
  createdAt: Timestamp;
  // readBy?: string[]; // For read receipts, future enhancement
}
