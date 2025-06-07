
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
  memberCount: number; // Pass member count to update UI optimistically or via revalidation
}

export function CommunityJoinButton({ communityId, initialIsJoined, memberCount: initialMemberCount }: CommunityJoinButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isJoined, setIsJoined] = useState(initialIsJoined);
  const [currentMemberCount, setCurrentMemberCount] = useState(initialMemberCount);


  useEffect(() => {
    setIsJoined(initialIsJoined);
    setCurrentMemberCount(initialMemberCount);
  }, [initialIsJoined, initialMemberCount]);


  const handleClick = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to join a community.', variant: 'destructive' });
      router.push('/login');
      return;
    }

    startTransition(async () => {
      const result = await toggleCommunityMembership(communityId, user.uid);
      if (result.success) {
        toast({ title: result.isJoined ? 'Joined!' : 'Left!', description: result.message });
        setIsJoined(result.isJoined!);
        // Optimistically update member count, or rely on revalidation if preferred
        setCurrentMemberCount(prevCount => result.isJoined ? prevCount + 1 : prevCount -1);
        router.refresh(); // Re-fetches server component data
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
      variant={isJoined ? "outline" : "default"}
      className="w-full sm:w-auto"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isJoined ? (
        <UserMinus className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Processing...' : isJoined ? 'Leave Community' : 'Join Community'}
    </Button>
  );
}
