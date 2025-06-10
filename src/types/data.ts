
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
  communityId?: string | null; // Made optional
  communityName?: string | null; // Made optional
  description: string;
  codeSnippet?: string | null;
  imageURL?: string | null;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  createdAt: string; // ISO string
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

