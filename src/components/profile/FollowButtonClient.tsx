
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { followUser, unfollowUser } from '@/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface FollowButtonClientProps {
  targetUserId: string;
  targetUserProfile: Pick<UserProfile, 'displayName'>; // For notification message
  initialIsFollowing: boolean;
}

export function FollowButtonClient({
  targetUserId,
  targetUserProfile,
  initialIsFollowing
}: FollowButtonClientProps) {
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFollowingState, setIsFollowingState] = useState(initialIsFollowing);
  const [localFollowersCount, setLocalFollowersCount] = useState<number | undefined>(undefined); // Could fetch target user's follower count if needed for display

  useEffect(() => {
    setIsFollowingState(initialIsFollowing);
  }, [initialIsFollowing, targetUserId]); // Re-sync if target changes or initial prop changes

  const handleClick = async () => {
    if (!currentUser || !currentUserProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to follow users.', variant: 'destructive' });
      router.push('/login');
      return;
    }
    if (currentUser.uid === targetUserId) {
      toast({ title: 'Action Not Allowed', description: "You cannot follow yourself.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      let result;
      const currentUserMinimalProfile = {
        uid: currentUserProfile.uid,
        displayName: currentUserProfile.displayName,
        photoURL: currentUserProfile.photoURL,
      };

      if (isFollowingState) {
        result = await unfollowUser(currentUser.uid, targetUserId);
      } else {
        result = await followUser(currentUser.uid, currentUserMinimalProfile, targetUserId, targetUserProfile);
      }

      if (result.success) {
        toast({ title: isFollowingState ? 'Unfollowed!' : 'Followed!', description: result.message });
        setIsFollowingState(!isFollowingState);
        // Could update localFollowersCount here if the action returned the new count
        router.refresh(); // Revalidate data on the page
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (authLoading) {
    return <Button disabled className="w-full sm:w-auto"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }

  // Don't show button if not logged in, or if viewing own profile
  if (!currentUser || currentUser.uid === targetUserId) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending || authLoading}
      variant={isFollowingState ? "outline" : "default"}
      className="w-full sm:w-auto"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowingState ? (
        <UserMinus className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Processing...' : isFollowingState ? 'Unfollow' : 'Follow'}
    </Button>
  );
}
