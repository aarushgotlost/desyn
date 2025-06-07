
"use client";

import { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { addCommentToPost } from '@/actions/postActions';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/components/messaging/MessageBubble'; // Assuming getInitials is exported here

const commentSchema = z.object({
  text: z.string().min(1, { message: "Comment cannot be empty." }).max(1000, { message: "Comment is too long."}),
});

type CommentFormInputs = z.infer<typeof commentSchema>;

interface CommentFormProps {
  postId: string;
  onCommentAdded?: (newComment: any) => void; // Callback for optimistic updates
}

export function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CommentFormInputs>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      text: '',
    },
  });

  const onSubmit: SubmitHandler<CommentFormInputs> = async (data) => {
    if (!user || !userProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to comment.', variant: 'destructive' });
      return;
    }
    if (isPending) return;

    startTransition(async () => {
      const commentData = {
        text: data.text,
        authorId: user.uid,
        authorName: userProfile.displayName || 'Anonymous User',
        authorAvatar: userProfile.photoURL,
      };
      const result = await addCommentToPost(postId, commentData);
      if (result.success) {
        form.reset();
        // toast({ title: "Comment Posted!" }); // Can be too noisy
        if (onCommentAdded && result.newComment) {
          // Convert Firestore Timestamp to Date if necessary for client-side handling
          const clientComment = {
            ...result.newComment,
            createdAt: result.newComment.createdAt instanceof Date 
              ? result.newComment.createdAt 
              : (result.newComment.createdAt as any)?.toDate 
              ? (result.newComment.createdAt as any).toDate() 
              : new Date(),
          };
          onCommentAdded(clientComment);
        }
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  if (authLoading) {
    return <div className="flex items-center space-x-3 p-4 border-t"><Loader2 className="h-5 w-5 animate-spin" /> <p>Loading...</p></div>;
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground p-4 border-t">Please log in to add a comment.</p>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start space-x-3 p-4 border-t">
      <Avatar>
        <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName || "User"} data-ai-hint="current user avatar"/>
        <AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          placeholder="Add a comment..."
          rows={3}
          {...form.register('text')}
          className={form.formState.errors.text ? 'border-destructive' : ''}
          disabled={isPending}
        />
        {form.formState.errors.text && <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>}
        <Button type="submit" size="sm" disabled={isPending || !form.watch('text')?.trim()}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send size={16} className="mr-2" />}
          Post Comment
        </Button>
      </div>
    </form>
  );
}
