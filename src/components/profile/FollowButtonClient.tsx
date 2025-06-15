
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
  targetUserProfile: Pick<UserProfile, 'displayName'>;
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
    // Reset state if targetUserId changes or auth state changes significantly
    setIsLoadingStatus(true);
    setIsFollowingState(undefined);

    if (authLoading) {
      return;
    }

    if (currentUser && currentUser.uid !== targetUserId) {
      isFollowing(currentUser.uid, targetUserId)
        .then(status => {
          setIsFollowingState(status);
        })
        .catch(err => {
          console.error("Failed to fetch follow status in FollowButtonClient:", err);
          setIsFollowingState(false); // Default to false on error
        })
        .finally(() => {
          setIsLoadingStatus(false);
        });
    } else {
      setIsLoadingStatus(false); 
      setIsFollowingState(false); 
    }
  }, [currentUser, targetUserId, authLoading]);


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
    if (isLoadingStatus || isProcessing || typeof isFollowingState === 'undefined') return;

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

  if (authLoading) { 
    return <Button disabled className="w-full sm:w-auto" size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }
  
  if (!currentUser || currentUser.uid === targetUserId) {
    return null; 
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

