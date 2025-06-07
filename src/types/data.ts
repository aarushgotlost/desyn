
import type { Timestamp } from 'firebase/firestore';

export interface Community {
  id: string; // Document ID
  name: string;
  description: string;
  iconURL?: string | null;
  tags: string[];
  createdBy: string; // UID
  memberCount: number;
  members: string[]; // Array of UIDs - UIDs of users who have joined
  createdAt: Timestamp | Date; // Can be Timestamp from Firestore or Date object after processing
}

export interface Post {
  id: string; // Document ID
  title: string;
  communityId: string;
  communityName: string;
  description: string;
  codeSnippet?: string | null;
  imageURL?: string | null;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  createdAt: Timestamp | Date; // Can be Timestamp from Firestore or Date object after processing
  likes: number;
  commentsCount: number;
  isSolved: boolean;
}

export interface Comment {
  id: string; // Document ID
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  text: string;
  createdAt: Timestamp | Date; // Can be Timestamp from Firestore or Date object after processing
  // replies?: Reply[]; // Future enhancement
}

// Example Reply structure (for future use)
// export interface Reply {
//   id: string;
//   commentId: string;
//   authorId: string;
//   authorName: string;
//   authorAvatar?: string | null;
//   text: string;
//   createdAt: Timestamp | Date;
// }
