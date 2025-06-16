
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

export interface VideoCallSession {
  id: string; // Firestore document ID for our app's call session
  callerId: string;
  calleeId: string;
  callerName?: string;
  calleeName?: string;
  // offer and answer are removed as 100ms SDK handles WebRTC details
  status: 'pending' | 'connected' | 'ended' | 'declined' | 'error' | 'cancelled'; // Our app's status for the call
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
