
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
  initialIsLiked?: boolean; // Optional: if passed, skips initial client fetch
  size?: "sm" | "default" | "lg" | "icon" | null | undefined;
  showText?: boolean;
}

export function LikeButton({ postId, initialLikesCount, initialIsLiked, size = "sm", showText = true }: LikeButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked || false);
  const [isLoadingState, setIsLoadingState] = useState(typeof initialIsLiked === 'undefined'); // Only load if initialIsLiked not provided

  useEffect(() => {
    // If initialIsLiked is provided, we trust it and don't fetch.
    // Otherwise, fetch the like status for the current user.
    if (typeof initialIsLiked === 'undefined' && user && postId) {
      setIsLoadingState(true);
      getPostLikeStatus(postId, user.uid)
        .then(status => {
          setIsLiked(status.isLiked);
          setLikesCount(status.likesCount); // Sync count from server
        })
        .catch(err => {
          console.error("Failed to get like status", err);
          // Optionally set default state or show error
        })
        .finally(() => setIsLoadingState(false));
    } else {
      // If user logs out or initialIsLiked is provided, reset loading state
      setIsLoadingState(false);
      // If user is not logged in and initialIsLiked was not provided, ensure isLiked is false
      if (!user && typeof initialIsLiked === 'undefined') {
        setIsLiked(false);
      }
    }
  }, [postId, user, initialIsLiked]);

  // Reset button state if the post or user changes
  useEffect(() => {
    setLikesCount(initialLikesCount);
    setIsLiked(initialIsLiked || false);
    if (!user) { // if user logs out
      setIsLiked(false);
    }
  }, [initialLikesCount, initialIsLiked, user]);


  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to like a post.', variant: 'destructive' });
      return;
    }
    if (isLoadingState || isPending) return;

    startTransition(async () => {
      const originalLiked = isLiked;
      const originalLikesCount = likesCount;

      // Optimistic update
      setIsLiked(!originalLiked);
      setLikesCount(prev => originalLiked ? prev - 1 : prev + 1);

      const result = await togglePostLike(postId, user.uid);
      if (result.success) {
        // Server state overrides optimistic update if different
        if (typeof result.isLiked === 'boolean') setIsLiked(result.isLiked);
        if (typeof result.newLikesCount === 'number') setLikesCount(result.newLikesCount);
        // toast({ title: result.message }); // Can be too noisy
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
      className={cn("flex items-center space-x-1.5", isLiked ? "text-primary-foreground" : "text-muted-foreground")}
      aria-pressed={isLiked}
      aria-label={isLiked ? "Unlike post" : "Like post"}
    >
      {buttonDisabled && !isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ThumbsUp className={cn("h-4 w-4", isLiked ? "fill-current" : "")} />
      )}
      {showText && <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>}
      {!showText && <span>{likesCount}</span>}
    </Button>
  );
}
