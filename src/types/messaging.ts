
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
  lastMessageAt?: string; // ISO string or Firebase Timestamp for server actions
  lastMessageSenderId?: string;
  createdAt: string; // ISO string or Firebase Timestamp
  updatedAt: string; // ISO string or Firebase Timestamp
}

export interface ChatMessage {
  id: string;
  chatId: string; // Ensure this is present if used for delete action
  senderId: string;
  senderName: string | null; 
  senderAvatar?: string | null; 
  text: string;
  createdAt: string; // ISO string or Firebase Timestamp
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

export interface MeetingChatMessage {
  id: string;
  meetingId: string; // For context
  senderId: string;
  senderName: string | null;
  senderAvatar?: string | null;
  text: string;
  createdAt: string; // ISO string
}
