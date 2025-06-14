
export interface NotificationActor {
  id: string;
  displayName: string | null;
  avatarUrl?: string | null;
}

export type NotificationType = 
  | 'new_like' 
  | 'new_comment' 
  | 'new_follower'
  | 'new_message'; // Added new_message type

export interface Notification {
  id: string;
  userId: string; // The user who receives the notification
  type: NotificationType;
  actor: NotificationActor | null; // The user who triggered the notification, null for system
  message: string; // Pre-formatted message
  link: string; // Link to the relevant content (post, profile, etc.)
  isRead: boolean;
  createdAt: string; // ISO string
  relatedEntityId?: string; // e.g., postId, commentId, followerUserId, chatId
}
