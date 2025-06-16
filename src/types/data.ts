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
  id: string; // Firestore document ID
  name: string;
  createdBy: string; // User ID of the creator
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  thumbnailURL?: string | null;
  fps?: number; // Frames per second
  // frameCount?: number; // Could be useful metadata
  // Other project-specific settings can be added here
}

// Individual frame data structure (if stored separately or as part of AnimationProject)
// This is conceptual; actual storage might be subcollection `frames` within `projects/{projectId}`
export interface AnimationFrameData {
  id: string; // e.g., frame-0, frame-1
  dataUrl: string | null; // base64 encoded image data
  layers?: any[]; // If layers are per-frame and complex
  order: number;
}
