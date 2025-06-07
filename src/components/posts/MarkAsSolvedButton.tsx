
"use client";

import { useState, useTransition, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { togglePostSolvedStatus } from '@/actions/postActions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MarkAsSolvedButtonProps {
  postId: string;
  initialIsSolved: boolean;
  authorId: string;
  size?: "sm" | "default" | "lg" | "icon" | null | undefined;
}

export function MarkAsSolvedButton({ postId, initialIsSolved, authorId, size="sm" }: MarkAsSolvedButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSolved, setIsSolved] = useState(initialIsSolved);

  useEffect(() => {
    setIsSolved(initialIsSolved);
  }, [initialIsSolved]);

  const isAuthor = user?.uid === authorId;

  const handleToggleSolved = async () => {
    if (!user || !isAuthor) {
      toast({ title: 'Permission Denied', description: 'Only the post author can mark it as solved.', variant: 'destructive' });
      return;
    }
    if (isPending) return;

    startTransition(async () => {
      const originalSolvedStatus = isSolved;
      setIsSolved(!originalSolvedStatus); // Optimistic update

      const result = await togglePostSolvedStatus(postId, user.uid);
      if (result.success) {
        if (typeof result.isSolved === 'boolean') setIsSolved(result.isSolved);
        toast({ title: result.message });
      } else {
        setIsSolved(originalSolvedStatus); // Revert on error
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (!isAuthor && !isSolved) { 
    return <Button variant="outline" size={size} disabled className="text-xs">Mark as Solved</Button>;
  }
  
  if (isSolved && !isAuthor) { 
     return (
        <div className={cn("flex items-center font-medium text-xs", 
                        isSolved ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                        size === "default" && "text-sm",
                        size === "lg" && "text-base"
                        )}>
          <CheckCircle className="mr-1.5 h-4 w-4" /> Solved
        </div>
    );
  }


  return (
    <Button
      variant={isSolved ? "outline" : "outline"}
      size={size}
      onClick={handleToggleSolved}
      disabled={authLoading || isPending || !isAuthor}
      className={cn(
        "flex items-center space-x-1.5 text-xs",
        isSolved ? "text-green-600 dark:text-green-400 border-green-500 hover:bg-green-50 dark:hover:bg-green-900/50" : "text-muted-foreground hover:text-foreground",
         size === "default" && "text-sm",
         size === "lg" && "text-base"
      )}
      aria-pressed={isSolved}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSolved ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <CheckCircle className="h-4 w-4" />
      )}
      <span>{isSolved ? 'Mark as Unsolved' : 'Mark as Solved'}</span>
    </Button>
  );
}
