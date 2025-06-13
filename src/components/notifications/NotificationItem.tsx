"use client";

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Notification } from '@/types/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ThumbsUp, MessageCircle, UserPlus } from 'lucide-react';
import { markNotificationAsRead } from '@/actions/notificationActions';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'; 
import { getInitials } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onNotificationClicked?: (notification: Notification) => Promise<void> | void;
}

const NotificationIconByType = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'new_like':
      return <ThumbsUp className="h-4 w-4 text-primary" aria-label="New like" />;
    case 'new_comment':
      return <MessageCircle className="h-4 w-4 text-green-500" aria-label="New comment" />;
    case 'new_follower':
      return <UserPlus className="h-4 w-4 text-blue-500" aria-label="New follower" />;
    default:
      return null;
  }
};

export function NotificationItem({ notification, onNotificationClicked }: NotificationItemProps) {
  const { user } = useAuth();
  const router = useRouter();
  const createdAtDate = new Date(notification.createdAt);

  const handleClick = async () => {
    if (onNotificationClicked) {
      await onNotificationClicked(notification);
    }
    if (user && !notification.isRead) {
      // Marking as read is handled by onNotificationClicked or server-side on page load.
      // For direct navigation, ensure action is called if necessary.
      // For simplicity here, assume parent component handles `markNotificationAsRead` call if needed.
      // Or, we can call it here explicitly before navigation:
      await markNotificationAsRead(notification.id, user.uid);
    }
    router.push(notification.link);
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn(
        "flex items-start space-x-3 p-2.5 cursor-pointer hover:bg-muted/50",
        !notification.isRead && "bg-primary/5 font-medium" // Add font-medium for unread
      )}
      aria-current={!notification.isRead ? "true" : undefined} // Indicate unread items
    >
      <div className="flex-shrink-0 pt-0.5">
        {notification.actor ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.actor.avatarUrl || undefined} alt={notification.actor.displayName ? `${notification.actor.displayName}'s avatar` : "User avatar"} data-ai-hint="notification actor avatar" />
            <AvatarFallback>{getInitials(notification.actor.displayName)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted">
            <NotificationIconByType type={notification.type} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {/* Using dangerouslySetInnerHTML for messages that might contain simple emphasis. Be cautious if messages can contain user-generated HTML. */}
        <p className="text-sm text-foreground leading-snug" dangerouslySetInnerHTML={{ __html: notification.message }} />
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNowStrict(createdAtDate, { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="h-2 w-2 rounded-full bg-primary self-center ml-2 flex-shrink-0" title="Unread"></div>
      )}
    </DropdownMenuItem>
  );
}
