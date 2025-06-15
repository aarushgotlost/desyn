
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
  const [isProcessing, startTransition] = useTransition(); 
  
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
        })
        .finally(() => {
          setIsLoadingStatus(false);
        });
    } else if (!currentUser && !authLoading) { // Ensure we don't set to false while auth is still loading
        setIsFollowingState(false);
        setIsLoadingStatus(false);
    }
  }, [initialIsFollowing, currentUser, targetUserId, authLoading]);


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

  if (authLoading || isLoadingStatus) {
    return <Button disabled className="w-full sm:w-auto" size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }

  if (!currentUser || currentUser.uid === targetUserId) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isProcessing || authLoading || isLoadingStatus} // Keep authLoading here to prevent clicks while context is initializing
      variant={isFollowingState ? "outline" : "default"}
      size="sm" 
      className="w-auto" 
    >
      {isProcessing ? ( // Show loader only when processing the follow/unfollow action
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

    
