
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { followUser, unfollowUser } from '@/actions/userActions';
import { isFollowing } from '@/services/firestoreService'; // To fetch status
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface FollowButtonClientProps {
  targetUserId: string;
  targetUserProfile: Pick<UserProfile, 'displayName'>; // For notification message
  initialIsFollowing?: boolean; // Now optional
}

export function FollowButtonClient({
  targetUserId,
  targetUserProfile,
  initialIsFollowing
}: FollowButtonClientProps) {
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, startTransition] = useTransition(); // Renamed from isPending for clarity
  
  const [isFollowingState, setIsFollowingState] = useState(initialIsFollowing);
  const [isLoadingStatus, setIsLoadingStatus] = useState(typeof initialIsFollowing === 'undefined');


  useEffect(() => {
    // If initialIsFollowing is explicitly provided, use it.
    if (typeof initialIsFollowing !== 'undefined') {
      setIsFollowingState(initialIsFollowing);
      setIsLoadingStatus(false);
    } else if (currentUser && currentUser.uid !== targetUserId) {
      // If not provided, and we have a current user (and not viewing own profile), fetch it.
      setIsLoadingStatus(true);
      isFollowing(currentUser.uid, targetUserId)
        .then(status => {
          setIsFollowingState(status);
        })
        .catch(err => {
          console.error("Failed to fetch follow status:", err);
          // Keep isFollowingState as potentially false or based on previous state
        })
        .finally(() => {
          setIsLoadingStatus(false);
        });
    } else if (!currentUser) {
        // Not logged in, default to not followed, not loading
        setIsFollowingState(false);
        setIsLoadingStatus(false);
    }
    // This effect depends on initialIsFollowing, currentUser, and targetUserId to re-evaluate.
  }, [initialIsFollowing, currentUser, targetUserId]);


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
    if (isLoadingStatus || isProcessing) return;

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
        router.refresh(); 
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (authLoading || (isLoadingStatus && typeof initialIsFollowing === 'undefined') ) {
    return <Button disabled className="w-full sm:w-auto" size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }

  if (!currentUser || currentUser.uid === targetUserId) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isProcessing || authLoading || isLoadingStatus}
      variant={isFollowingState ? "outline" : "default"}
      size="sm" // Defaulting to sm size for use in cards
      className="w-auto" // More flexible width
    >
      {isProcessing || isLoadingStatus ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowingState ? (
        <UserMinus className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isProcessing || isLoadingStatus ? 'Loading...' : isFollowingState ? 'Unfollow' : 'Follow'}
    </Button>
  );
}

    