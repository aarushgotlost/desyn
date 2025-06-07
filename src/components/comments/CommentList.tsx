
"use client";

import type { Comment } from '@/types/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCommentsForPostRealtime } from '@/services/firestoreService'; // Use the dedicated realtime fetcher
import { getInitials } from '@/components/messaging/MessageBubble';


interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    setIsLoading(true);
    const unsubscribe = getCommentsForPostRealtime(
      postId,
      (fetchedComments) => {
        setComments(fetchedComments);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching comments:", error);
        setIsLoading(false);
        // Optionally show toast
      }
    );

    return () => unsubscribe();
  }, [postId]);

  if (isLoading) {
    return <div className="py-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No comments yet. Be the first to comment!</p>;
  }

  return (
    <div className="space-y-6">
      {comments.map(comment => {
        const commentCreatedAt = new Date(comment.createdAt); // Convert ISO string to Date
        return (
          <div key={comment.id} className="space-y-3">
            <div className="flex items-start space-x-3">
              <Link href={`/profile/${comment.authorId}`}> 
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.authorAvatar || undefined} alt={comment.authorName} data-ai-hint="commenter avatar"/>
                  <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Link href={`/profile/${comment.authorId}`} className="font-semibold text-foreground hover:text-primary">{comment.authorName}</Link> 
                  <span className="text-muted-foreground">
                    {formatDistanceToNowStrict(commentCreatedAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
