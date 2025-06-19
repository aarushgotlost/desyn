
"use client"; 

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Palette, Shield, LogOut, SendToBack, CheckCircle, XCircle, AlertTriangle, Lock, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext"; 
import { cn } from "@/lib/utils"; 
import { messaging, VAPID_KEY } from '@/lib/firebase'; 
import { getToken } from 'firebase/messaging';
import { useState, useEffect, useTransition } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUserAccountAndBasicData } from "@/actions/userActions";


export default function SettingsPage() {
  const { user, logout, loading, deleteCurrentUserAccount } = useAuth(); 
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'loading'>('loading');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('denied'); 
    }
  }, []);

  const handleEnablePushNotifications = async () => {
    if (!messaging) {
      toast({
        title: "Push Not Supported",
        description: "Firebase Messaging is not available or your browser does not support push notifications.",
        variant: "destructive",
      });
      setNotificationPermission('denied');
      return;
    }

    if (!VAPID_KEY || VAPID_KEY === "YOUR_PUBLIC_VAPID_KEY_HERE" || VAPID_KEY === "BIhYhqAuf9hWPjsk5sDSk5kBZZK-6btzuXdPjvtDVcEGz81Mk6pPKayslVX394sGLPUshvM_IkXsTFsrffwqjL0_PLACEHOLDER") { 
       toast({
        title: "VAPID Key Missing",
        description: "The VAPID key is not configured correctly in the application.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    setIsRequestingToken(true);
    setFcmToken(null);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          setFcmToken(currentToken);
          toast({
            title: "Push Notifications Enabled!",
            description: "You will now receive push notifications.",
          });
        } else {
          toast({
            title: "Could Not Get Token",
            description: "Failed to retrieve FCM token. Ensure your service worker is correctly set up and you are on HTTPS.",
            variant: "destructive",
          });
        }
      } else if (permission === 'denied') {
        toast({
          title: "Permission Denied",
          description: "You have blocked push notifications. You may need to change this in your browser settings.",
          variant: "destructive",
        });
      } else {
         toast({
          title: "Permission Not Granted",
          description: "Push notification permission was not granted.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error getting FCM token or permission:', error);
      toast({
        title: "Error Enabling Notifications",
        description: "An unexpected error occurred. Check the console for details.",
        variant: "destructive",
      });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationPermission('denied');
      }
    } finally {
      setIsRequestingToken(false);
    }
  };

  const handleDeleteAccountConfirm = () => {
    setIsDeleting(true);
    startTransition(async () => {
      if (!user) {
        toast({ title: "Error", description: "User not found.", variant: "destructive" });
        setIsDeleting(false);
        setShowDeleteDialog(false);
        return;
      }

      try {
        const firestoreDeleteResult = await deleteUserAccountAndBasicData(user.uid);
        if (!firestoreDeleteResult.success) {
          toast({ title: "Error Deleting Data", description: firestoreDeleteResult.message, variant: "destructive" });
          setIsDeleting(false);
          setShowDeleteDialog(false);
          return;
        }
        toast({ title: "User Data Cleared", description: "Associated user data has been removed.", variant: "default" });

        await deleteCurrentUserAccount();
        
        toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
      } catch (error: any) {
        toast({ title: "Account Deletion Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsDeleting(false);
        setShowDeleteDialog(false);
      }
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Account</CardTitle>
          <CardDescription>Update your profile information and account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Profile Information</h3>
            <p className="text-sm text-muted-foreground mb-2">Control your public profile details.</p>
            <Link href="/onboarding/profile-setup" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              Edit Profile
            </Link>
          </div>
          <Separator />
          <div>
            <h3 className="font-medium mb-1">Change Password</h3>
            <p className="text-sm text-muted-foreground mb-2">Update your account password for better security.</p>
            <Link href="/forgot-password" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                Change Password
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Theme</h3>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
            </div>
            <ThemeToggle /> 
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><SendToBack className="mr-2 h-5 w-5 text-primary" /> Push Notifications</CardTitle>
          <CardDescription>Manage how you receive push notifications from the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!VAPID_KEY || VAPID_KEY === "YOUR_PUBLIC_VAPID_KEY_HERE" || VAPID_KEY === "BIhYhqAuf9hWPjsk5sDSk5kBZZK-6btzuXdPjvtDVcEGz81Mk6pPKayslVX394sGLPUshvM_IkXsTFsrffwqjL0_PLACEHOLDER") && ( 
            <div className="p-3 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-semibold">Action Required: VAPID Key</p>
                  <p>To enable push notifications, ensure the <code className="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded text-xs">VAPID_KEY</code> is correctly configured in <code className="text-xs">src/lib/firebase.ts</code> with your key from the Firebase Console (Project settings &gt; Cloud Messaging &gt; Web Push certificates).</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleEnablePushNotifications}
              disabled={notificationPermission === 'granted' || isRequestingToken || notificationPermission === 'loading'}
              variant={notificationPermission === 'granted' ? "ghost" : "default"}
              className="w-full sm:w-auto"
            >
              {isRequestingToken ? "Requesting..." : notificationPermission === 'granted' ? "Enabled" : "Enable Push Notifications"}
            </Button>
            {notificationPermission === 'loading' && <span className="text-sm text-muted-foreground">Loading status...</span>}
            {notificationPermission === 'granted' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {notificationPermission === 'denied' && <XCircle className="h-5 w-5 text-destructive" />}
            {notificationPermission === 'default' && <span className="text-sm text-muted-foreground">(Permission not yet requested)</span>}
          </div>
           {notificationPermission === 'denied' && (
            <p className="text-xs text-muted-foreground">
              Push notifications are currently blocked. You may need to go to your browser's site settings for this page to allow notifications.
            </p>
          )}
          {fcmToken && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Your FCM Token (for testing):</p>
              <Textarea
                readOnly
                value={fcmToken}
                className="text-xs h-24 bg-muted/50"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">This token identifies your browser for push notifications. In a real app, this would be sent securely to a server.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary" /> Security & Privacy</CardTitle>
          <CardDescription>Manage your account security and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h4 className="font-medium">Password</h4>
                        <p className="text-sm text-muted-foreground">Change your account password.</p>
                    </div>
                     <Link href="/forgot-password" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}>
                        <Lock className="mr-2 h-4 w-4" /> Change Password
                    </Link>
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <h4 className="font-medium">Account Deletion</h4>
                <p className="text-sm text-muted-foreground mb-1">Permanently delete your account and associated data.</p>
                 <div className="flex space-x-2 pt-1">
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={loading || isDeleting} className="w-full sm:w-auto">
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove your data from our servers. Your posts, comments, and other
                            contributions will also be removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting || isPending}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccountConfirm}
                            disabled={isDeleting || isPending}
                            className={buttonVariants({ variant: "destructive"})}
                          >
                            {isDeleting || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Note: Full deletion of all associated content (posts, comments, likes) is a complex process. This action will remove your main profile, notifications, posts, and community memberships.
                </p>
            </div>
        </CardContent>
      </Card>

      <div className="text-center pt-4">
        <Button variant="destructive" className="w-full max-w-xs" onClick={handleLogout} disabled={loading || isPending || isDeleting}>
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
}
    
