
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deletePost } from "@/actions/postActions";
import type { Post } from "@/types/data";

interface PostActionsClientProps {
  post: Post;
  currentUserId: string | null;
}

export function PostActionsClient({ post, currentUserId }: PostActionsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isAuthor = currentUserId === post.authorId;

  const handleDeletePost = async () => {
    if (!isAuthor || !currentUserId) return; // Added currentUserId check for safety
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deletePost(post.id, currentUserId);
      if (result.success) {
        toast({ title: "Post Deleted", description: "Your post has been successfully removed." });
        router.push(post.communityId ? `/communities/${post.communityId}` : '/');
        router.refresh(); // Ensure UI updates if user stays on a list page
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsDeleting(false);
    });
  };

  if (!isAuthor) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/posts/${post.id}/edit`}> <Edit size={14} className="mr-1.5" /> Edit</Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isDeleting || isPending}>
            {isDeleting || isPending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post and all its comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={isDeleting || isPending} className="bg-destructive hover:bg-destructive/90">
              {isDeleting || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
