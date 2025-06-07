
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toggleCommunityMembership } from '@/actions/communityActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CommunityJoinButtonProps {
  communityId: string;
  initialIsJoined: boolean;
  memberCount: number;
}

export function CommunityJoinButton({ communityId, initialIsJoined, memberCount: initialMemberCount }: CommunityJoinButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State for the button's display, derived from props initially, then self-managed.
  const [isMember, setIsMember] = useState(initialIsJoined);
  const [displayMemberCount, setDisplayMemberCount] = useState(initialMemberCount);

  // This effect updates the state if the communityId changes (navigating to a new community page)
  // or if the user's auth status changes, or if the initial props themselves change significantly.
  useEffect(() => {
    setIsMember(initialIsJoined);
    setDisplayMemberCount(initialMemberCount);
  }, [communityId, initialIsJoined, initialMemberCount, user]); // Re-sync if user logs in/out, community changes, or props update from server.

  const handleClick = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to join a community.', variant: 'destructive' });
      router.push('/login');
      return;
    }

    startTransition(async () => {
      const result = await toggleCommunityMembership(communityId, user.uid);
      if (result.success && typeof result.isJoined === 'boolean') {
        toast({ title: result.isJoined ? 'Joined!' : 'Left!', description: result.message });
        setIsMember(result.isJoined); // Update internal state based on action result
        // Optimistically update member count based on action result
        setDisplayMemberCount(prevCount => {
            if (result.isJoined) return prevCount + 1;
            return Math.max(0, prevCount - 1);
        });
        // router.refresh() will eventually update the server-rendered parts and props,
        // but our internal state is now the primary driver for this button's appearance.
        router.refresh(); 
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (authLoading) {
    return <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending || authLoading}
      variant={isMember ? "outline" : "default"}
      className="w-full sm:w-auto"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isMember ? (
        <UserMinus className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Processing...' : isMember ? 'Leave Community' : 'Join Community'}
    </Button>
  );
}
