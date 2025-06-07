
"use client";

import type { Comment } from '@/types/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CornerDownRight, Loader2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { getInitials } from '@/components/messaging/MessageBubble';


interface CommentListProps {
  postId: string;
  initialComments?: Comment[]; // For SSR or initial fetch
}

export function CommentList({ postId, initialComments = [] }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>(
     initialComments.map(c => ({...c, createdAt: c.createdAt instanceof Date ? c.createdAt : (c.createdAt as Timestamp).toDate()}))
  );
  const [isLoading, setIsLoading] = useState(initialComments.length === 0); // Only load if no initial comments

  useEffect(() => {
    if (!postId) return;

    setIsLoading(true);
    const commentsColRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsColRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(data.createdAt as any),
        } as Comment;
      });
      setComments(fetchedComments);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching comments:", error);
      setIsLoading(false);
      // Optionally show toast
    });

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
      {comments.map(comment => (
        <div key={comment.id} className="space-y-3">
          <div className="flex items-start space-x-3">
            <Link href={`/profile/${comment.authorId}`}> {/* TODO: Update to actual dynamic profile page */}
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.authorAvatar || undefined} alt={comment.authorName} data-ai-hint="commenter avatar"/>
                <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-xs mb-1">
                <Link href={`/profile/${comment.authorId}`} className="font-semibold text-foreground hover:text-primary">{comment.authorName}</Link> {/* TODO: Update to actual dynamic profile page */}
                <span className="text-muted-foreground">
                  {comment.createdAt ? formatDistanceToNowStrict(new Date(comment.createdAt as any), { addSuffix: true }) : 'just now'}
                </span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
            </div>
          </div>
          {/* Placeholder for replies - future enhancement */}
          {/* {comment.replies && comment.replies.length > 0 && (
            <div className="ml-8 pl-3 border-l-2 border-muted space-y-3">
              {comment.replies.map(reply => (
                 <div key={reply.id} className="flex items-start space-x-3">
                   <Link href={`/profile/${reply.authorId}`}>
                     <Avatar className="h-6 w-6">
                       <AvatarImage src={reply.authorAvatar || undefined} alt={reply.authorName}/>
                       <AvatarFallback>{reply.authorName.substring(0,1)}</AvatarFallback>
                     </Avatar>
                   </Link>
                   <div className="flex-1 bg-muted/30 p-2 rounded-lg">
                     <div className="flex items-center justify-between text-xs mb-0.5">
                       <Link href={`/profile/${reply.authorId}`} className="font-semibold text-foreground hover:text-primary text-xs">{reply.authorName}</Link>
                       <span className="text-muted-foreground text-xs">{formatDistanceToNowStrict(new Date(reply.createdAt as any), { addSuffix: true })}</span>
                     </div>
                     <p className="text-xs text-foreground/90">{reply.text}</p>
                   </div>
                 </div>
              ))}
            </div>
          )} */}
          {/* <Button variant="ghost" size="sm" className="ml-11 text-xs text-muted-foreground hover:text-primary" disabled>
            <CornerDownRight size={12} className="mr-1"/> Reply
          </Button> */}
        </div>
      ))}
    </div>
  );
}
