
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'; // For styling

interface NotificationItemProps {
  notification: Notification;
  onNotificationClicked?: (notification: Notification) => Promise<void> | void;
}

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

const NotificationIconByType = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'new_like':
      return <ThumbsUp className="h-4 w-4 text-primary" />;
    case 'new_comment':
      return <MessageCircle className="h-4 w-4 text-green-500" />;
    case 'new_follower':
      return <UserPlus className="h-4 w-4 text-blue-500" />;
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
      await markNotificationAsRead(notification.id, user.uid);
    }
    router.push(notification.link);
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn(
        "flex items-start space-x-3 p-2.5 cursor-pointer hover:bg-muted/50",
        !notification.isRead && "bg-primary/5"
      )}
    >
      <div className="flex-shrink-0 pt-0.5">
        {notification.actor ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.actor.avatarUrl || undefined} alt={notification.actor.displayName || "User"} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(notification.actor.displayName)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted">
            <NotificationIconByType type={notification.type} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
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
