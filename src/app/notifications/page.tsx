
"use client"; // Changed to client component for interactions

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserNotifications } from '@/services/notificationService';
import type { Notification } from '@/types/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BellRing, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { markAllNotificationsAsRead } from '@/actions/notificationActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition(); // For mark all as read

  useEffect(() => {
    async function fetchNotifications() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedNotifications = await getUserNotifications(user.uid, 50); // Fetch more for the page
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast({ title: "Error", description: "Could not load notifications.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      if (user) {
        fetchNotifications();
      } else {
        router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, authLoading, router, toast]);

  const handleMarkAllRead = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await markAllNotificationsAsRead(user.uid);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const onNotificationItemClicked = (notification: Notification) => {
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );
    // Actual read marking is handled by NotificationItem's click handler or its parent
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Please log in to view your notifications.</p>
          <Button asChild><Link href="/login">Log In</Link></Button>
        </CardContent>
      </Card>
    );
  }
  
  const unreadNotificationsExist = notifications.some(n => !n.isRead);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-2xl font-bold font-headline flex items-center">
              <BellRing className="mr-3 w-7 h-7 text-primary" />
              Notifications
            </CardTitle>
            {notifications.length > 0 && unreadNotificationsExist && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
                Mark all as read
              </Button>
            )}
          </div>
          <CardDescription>
            Your recent notifications. Click on an item to view details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => (
                // Wrap NotificationItem in a div or fragment if it doesn't render a suitable root for CardContent direct child
                <div key={notification.id}>
                   <NotificationItem notification={notification} onNotificationClicked={onNotificationItemClicked} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-6">
              <BellRing size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
              <p className="text-sm text-muted-foreground">
                You have no new notifications.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
       {/* Placeholder for pagination or "load more" */}
       {/* {notifications.length >= 50 && (
        <div className="text-center mt-8">
          <Button variant="outline">Load More Notifications</Button>
        </div>
      )} */}
    </div>
  );
}
