
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

export interface Meeting {
  id: string;
  title: string;
  createdBy: string; // User ID of the creator
  createdByName: string | null; // Display name of the creator
  createdAt: string; // ISO string
  participants: { uid: string; displayName: string | null; photoURL?: string | null }[]; // Array of participant profiles
  participantUids: string[]; // Array of User IDs for querying
  isActive: boolean; // To indicate if the meeting is currently "live"
  // endedAt?: string; // ISO string, optional for when the meeting ends
}


// UserProfile is defined in AuthContext.tsx to avoid circular dependencies
// but it's good to have a reference here for what it generally contains.
// export interface UserProfile {
//   uid: string;
//   email: string | null;
//   displayName: string | null;
//   photoURL?: string | null;
//   bannerURL?: string | null;
//   bio?: string;
//   skills?: string[]; 
//   interests?: string[];
//   onboardingCompleted: boolean;
//   createdAt?: string; // ISO string
//   lastLogin?: string; // ISO string
//   updatedAt?: string; // ISO string
//   followersCount?: number;
//   followingCount?: number;
// }

