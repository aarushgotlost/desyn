
export interface Community {
  id: string; 
  name: string;
  description: string;
  iconURL?: string | null;
  tags: string[];
  createdBy: string; 
  memberCount: number;
  members: string[]; 
  createdAt: string; // ISO string
}

export interface Post {
  id: string; 
  title: string;
  communityId?: string | null; 
  communityName?: string | null; 
  description: string;
  codeSnippet?: string | null;
  imageURL?: string | null;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string, for edit timestamp
  likes: number;
  commentsCount: number;
}

export interface Comment {
  id: string; 
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  text: string;
  createdAt: string; // ISO string
}

// UserProfile is defined in AuthContext.tsx

export interface MeetingParticipant {
  uid: string;
  displayName: string | null;
  photoURL?: string | null;
  role: string; // e.g., 'host', 'speaker', 'listener' (matches 100ms role)
  joinedAt: string; // ISO string
}

export interface Meeting {
  id: string; // Firestore document ID
  title: string;
  description?: string;
  roomId100ms: string; // 100ms Room ID
  hostUid: string; // UID of the user who created the meeting
  hostProfile: { // Denormalized host info for quick display
    uid: string;
    displayName: string | null;
    photoURL?: string | null;
  };
  participants: MeetingParticipant[];
  participantUids: string[]; // For easier querying
  isActive: boolean; // To mark if the meeting is ongoing or ended
  createdAt: string; // ISO string
  endedAt?: string | null; // ISO string
}
