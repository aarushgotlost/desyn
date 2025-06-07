
export interface ChatParticipant {
  uid: string;
  displayName: string | null;
  photoURL?: string | null;
}

export interface ChatSession {
  id: string;
  participants: ChatParticipant[]; 
  participantUids: string[]; 
  lastMessageText?: string;
  lastMessageAt?: string; // ISO string
  lastMessageSenderId?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string | null; 
  senderAvatar?: string | null; 
  text: string;
  createdAt: string; // ISO string
}

export interface CommunityChatMessage {
  id: string; 
  communityId: string;
  senderId: string;
  senderName: string | null;
  senderAvatar?: string | null;
  text: string;
  createdAt: string; // ISO string
}
