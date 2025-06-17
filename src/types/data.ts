
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

export interface AnimationFrame {
  id: string;
  frameNumber: number;
  imageDataUrl: string; // For simplicity, this will be a text input for now
  updatedAt: string; // ISO string
}

export interface AnimationProject {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  allowedUsers: string[]; // Array of UIDs
  collaborators?: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }[]; // Store more collaborator info
  thumbnailUrl?: string | null; // Optional: for project preview
}
