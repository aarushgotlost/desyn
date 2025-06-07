
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
  createdAt: Timestamp;
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
  createdAt: Timestamp;
  likes: number;
  commentsCount: number;
  isSolved: boolean;
}
