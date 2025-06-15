
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { togglePostLike, getPostLikeStatus } from '@/actions/postActions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  postId: string;
  initialLikesCount: number;
  initialIsLiked?: boolean; 
  size?: "sm" | "default" | "lg" | "icon" | null | undefined;
  showText?: boolean;
}

export function LikeButton({ postId, initialLikesCount, initialIsLiked, size = "sm", showText = true }: LikeButtonProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked || false);
  const [isLoadingState, setIsLoadingState] = useState(typeof initialIsLiked === 'undefined');

  useEffect(() => {
    // If initialIsLiked is not provided and user is logged in, fetch it
    if (typeof initialIsLiked === 'undefined' && user && postId) {
      setIsLoadingState(true);
      getPostLikeStatus(postId, user.uid)
        .then(status => {
          setIsLiked(status.isLiked);
          setLikesCount(status.likesCount); // Also update count from server truth
        })
        .catch(err => {
          console.error("Failed to get like status", err);
          // Keep client-side optimistic state or reset based on server data
        })
        .finally(() => setIsLoadingState(false));
    } else {
      setIsLoadingState(false);
      if (!user && typeof initialIsLiked === 'undefined') {
        // If user logs out or was never logged in and we didn't have initial server state
        setIsLiked(false);
      }
    }
  }, [postId, user, initialIsLiked]); // Re-run if postId, user, or initialIsLiked prop changes

  // Effect to synchronize with props if they change (e.g., parent component re-renders with new data)
  useEffect(() => {
    setLikesCount(initialLikesCount);
    if (typeof initialIsLiked !== 'undefined') {
      setIsLiked(initialIsLiked);
    }
    // If user logs out, ensure isLiked is false
    if (!user) {
        setIsLiked(false);
    }
  }, [initialLikesCount, initialIsLiked, user]);


  const handleLike = async () => {
    if (!user || !userProfile) { 
      toast({ title: 'Authentication Error', description: 'You must be logged in to like a post.', variant: 'destructive' });
      return;
    }
     if (!userProfile.displayName) {
      toast({ title: 'Profile Incomplete', description: 'Please set your display name in your profile before liking posts.', variant: 'destructive' });
      // Optionally, redirect to profile setup: router.push('/onboarding/profile-setup');
      return;
    }
    if (isLoadingState || isPending) return;

    startTransition(async () => {
      const originalLiked = isLiked;
      const originalLikesCount = likesCount;

      // Optimistic update
      setIsLiked(!originalLiked);
      setLikesCount(prev => originalLiked ? prev - 1 : prev + 1);

      const likerInfoForNotification = {
        uid: userProfile.uid,
        displayName: userProfile.displayName, // Assumed to be non-null due to check above
        photoURL: userProfile.photoURL
      };

      const result = await togglePostLike(postId, user.uid, likerInfoForNotification);
      
      if (result.success) {
        if (typeof result.isLiked === 'boolean') setIsLiked(result.isLiked);
        if (typeof result.newLikesCount === 'number') setLikesCount(result.newLikesCount);
        // Toast for like/unlike can be too noisy, often omitted.
        // if (result.isLiked) toast({ title: "Post Liked!" }); 
        // else toast({ title: "Like Removed" });
      } else {
        // Revert optimistic update on failure
        setIsLiked(originalLiked);
        setLikesCount(originalLikesCount);
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const buttonDisabled = authLoading || isLoadingState || isPending;

  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size={size}
      onClick={handleLike}
      disabled={buttonDisabled}
      className={cn(
        "flex items-center space-x-1.5",
        isLiked ? "text-primary-foreground" : "text-muted-foreground",
        buttonDisabled && !isPending && "opacity-50 cursor-not-allowed" // More explicit disabled state for loading
      )}
      aria-pressed={isLiked}
      aria-label={isLiked ? "Unlike post" : "Like post"}
    >
      {isLoadingState && !isPending ? ( // Show loader only during initial state loading
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPending ? ( // Show loader during action processing
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ThumbsUp className={cn("h-4 w-4", isLiked ? "fill-current" : "")} />
      )}
      {showText && <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>}
      {!showText && <span>{likesCount}</span>}
    </Button>
  );
}

    