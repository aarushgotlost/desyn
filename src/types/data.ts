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

export interface AnimationProject {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  thumbnailURL?: string | null;
}
