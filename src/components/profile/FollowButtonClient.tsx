
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { followUser, unfollowUser } from '@/actions/userActions';
import { isFollowing } from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface FollowButtonClientProps {
  targetUserId: string;
  targetUserProfile: Pick<UserProfile, 'displayName'>; // Only displayName is strictly needed for the notification if following
}

export function FollowButtonClient({
  targetUserId,
  targetUserProfile,
}: FollowButtonClientProps) {
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, startTransition] = useTransition();

  const [isFollowingState, setIsFollowingState] = useState<boolean | undefined>(undefined);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    setIsLoadingStatus(true);
    setIsFollowingState(undefined); // Reset on targetUser change or auth state change

    if (authLoading) {
      // Wait for auth state to resolve
      return;
    }

    if (!currentUser || !targetUserId || currentUser.uid === targetUserId) {
      setIsLoadingStatus(false);
      setIsFollowingState(false); // Default to not following, button will be hidden or non-interactive
      return;
    }

    // Proceed to fetch follow status
    isFollowing(currentUser.uid, targetUserId)
      .then(status => {
        setIsFollowingState(status);
      })
      .catch(err => {
        console.error(`Failed to fetch follow status for ${targetUserId}:`, err);
        setIsFollowingState(false); // Default to false on error
        // Avoid toast here as it can be noisy on initial load if there's a transient network issue
      })
      .finally(() => {
        setIsLoadingStatus(false);
      });
  }, [currentUser, targetUserId, authLoading]);


  const handleClick = async () => {
    if (isLoadingStatus || isProcessing) return;

    if (!currentUser || !currentUserProfile || !currentUserProfile.uid) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to follow users.', variant: 'destructive' });
      if (!currentUser) router.push('/login');
      return;
    }

    if (currentUser.uid === targetUserId) {
      toast({ title: 'Action Not Allowed', description: "You cannot follow yourself.", variant: "destructive" });
      return;
    }
    
    // For the followUser action, ensure current user's displayName is available for notifications
    if (!isFollowingState && !currentUserProfile.displayName) {
        toast({ title: 'Profile Incomplete', description: 'Please set your display name in your profile before following users.', variant: 'destructive' });
        router.push('/onboarding/profile-setup'); // Guide user to complete profile
        return;
    }


    startTransition(async () => {
      let result;
      // Prepare current user's minimal profile for the followUser action (for notifications)
      const currentUserMinimalProfileForAction = {
        uid: currentUserProfile.uid,
        displayName: currentUserProfile.displayName, // Checked above for follow action
        photoURL: currentUserProfile.photoURL,
      };

      // Ensure targetUserProfile.displayName has a fallback for the notification message
      const targetDisplayNameForNotification = targetUserProfile?.displayName || 'User';

      if (isFollowingState) {
        result = await unfollowUser(currentUser.uid, targetUserId);
      } else {
        result = await followUser(currentUser.uid, currentUserMinimalProfileForAction, targetUserId, { displayName: targetDisplayNameForNotification });
      }

      if (result.success) {
        toast({ title: isFollowingState ? 'Unfollowed!' : 'Followed!', description: result.message });
        setIsFollowingState(!isFollowingState);
        router.refresh(); // Re-fetch server components data
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (authLoading) {
    return <Button disabled className="w-full sm:w-auto" size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }

  if (!currentUser || currentUser.uid === targetUserId) {
    return null; // Don't show button if not logged in or if it's own profile
  }

  if (isLoadingStatus || typeof isFollowingState === 'undefined') {
     return <Button disabled className="w-full sm:w-auto" size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Status...</Button>;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isProcessing}
      variant={isFollowingState ? "outline" : "default"}
      size="sm"
      className="w-auto"
    >
      {isProcessing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowingState ? (
        <UserMinus className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isProcessing ? (isFollowingState ? 'Unfollowing...' : 'Following...') : (isFollowingState ? 'Unfollow' : 'Follow')}
    </Button>
  );
}
