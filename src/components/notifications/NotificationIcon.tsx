
"use client";

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Bell, MailCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserNotifications, getUnreadNotificationsCount } from '@/services/notificationService';
import type { Notification } from '@/types/notifications';
import { NotificationItem } from './NotificationItem';
import { markAllNotificationsAsRead } from '@/actions/notificationActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function NotificationIcon() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchNotificationsData = async () => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    try {
      const [count, recentNotifs] = await Promise.all([
        getUnreadNotificationsCount(user.uid),
        getUserNotifications(user.uid, 5, false) // Fetch a few, including read ones for context
      ]);
      setUnreadCount(count);
      setNotifications(recentNotifs);
    } catch (error) {
      console.error("Error fetching notifications data:", error);
      toast({ title: "Error", description: "Could not load notifications.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isDropdownOpen) {
      fetchNotificationsData();
    }
     // Refresh count if user changes or dropdown opens (to catch external updates)
    if (user) {
        getUnreadNotificationsCount(user.uid).then(setUnreadCount);
    }
  }, [user, isDropdownOpen]);


  const handleMarkAllRead = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await markAllNotificationsAsRead(user.uid);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        // No explicit router.refresh() here as we're client-side updating state for the dropdown
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const onNotificationClicked = async (notification: Notification) => {
    if (!user) return;
    // Optimistically mark as read in local state
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    if (!notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    // Actual DB update happens in NotificationItem or a separate action call
    // For now, rely on NotificationItem's own logic or full page refresh if link is external.
    setIsDropdownOpen(false); // Close dropdown on click
  };


  if (authLoading) {
    return <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full" disabled><Loader2 className="h-5 w-5 animate-spin" /></Button>;
  }

  if (!user) {
    return null; // Don't show icon if not logged in
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 && !isLoading ? (
          <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
            No new notifications.
          </DropdownMenuItem>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notif) => (
               <NotificationItem key={notif.id} notification={notif} onNotificationClicked={onNotificationClicked} />
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleMarkAllRead} disabled={isPending || unreadCount === 0}>
          <MailCheck className="mr-2 h-4 w-4" /> Mark all as read
          {isPending && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="w-full justify-center">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
