
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { initiateVideoCall } from '@/actions/videoCallActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface StartVideoCallButtonProps {
  targetUser: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL' | 'fcmTokens'>;
}

export function StartVideoCallButton({ targetUser }: StartVideoCallButtonProps) {
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStartCall = () => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to start a call.', variant: 'destructive' });
      router.push('/login');
      return;
    }
    if (currentUser.uid === targetUser.uid) {
        toast({ title: 'Action Not Allowed', description: "You cannot start a video call with yourself.", variant: "default" });
        return;
    }


    startTransition(async () => {
      const callerProfileForAction = {
        uid: currentUserProfile.uid,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
        fcmTokens: currentUserProfile.fcmTokens || [],
      };
      const calleeProfileForAction = {
        uid: targetUser.uid,
        displayName: targetUser.displayName,
        photoURL: targetUser.photoURL,
        fcmTokens: targetUser.fcmTokens || [],
      };

      const result = await initiateVideoCall(targetUser.uid, callerProfileForAction, calleeProfileForAction);
      if (result.success && result.callId) {
        toast({ title: 'Call Initiated', description: `Starting video call with ${targetUser.displayName || 'user'}.` });
        router.push(`/video-call/${result.callId}`);
      } else {
        toast({ title: 'Error Starting Call', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (authLoading) {
    return <Button variant="outline" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Video Call</Button>;
  }

  if (!currentUser || currentUser.uid === targetUser.uid) {
    return null; // Don't show button if not logged in or it's own profile
  }


  return (
    <Button
      onClick={handleStartCall}
      disabled={isPending || authLoading}
      variant="outline"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Video className="mr-2 h-4 w-4" />
      )}
      Video Call
    </Button>
  );
}
