
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

// Tearix 2D Animation Project Data
export interface AnimationFrameData {
  id: string; // Unique ID for the frame (e.g., frame-timestamp-random)
  projectId: string; // Link back to the parent project
  frameNumber: number; // Sequential frame number (0-based for array index)
  dataUrl: string | null; // Store canvas drawing for this frame as a data URL (single layer for now)
  // layers: AnimationLayerData[]; // Future: for multi-layer support
  thumbnailUrl?: string | null; // Optional: A small dataURL or path to a generated thumbnail
  createdAt: string; // ISO string, Firestore serverTimestamp on creation
  updatedAt: string; // ISO string, Firestore serverTimestamp on update
}

export interface AnimationProject {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  allowedUsers: string[]; // UIDs of users who can access
  fps: number;
  width: number; // Canvas width
  height: number; // Canvas height
  thumbnailUrl?: string | null; // Project-level thumbnail (e.g., first frame)
  totalFrames: number; // Denormalized count for quick display, updated with each frame add/delete
  // backgroundColor: string; // Default canvas background color
}

// Interface for collaborators displayed in UI
export interface CollaboratorProfile {
    uid: string;
    displayName: string | null;
    photoURL?: string | null;
    email?: string | null; // Email might be useful for display
}
