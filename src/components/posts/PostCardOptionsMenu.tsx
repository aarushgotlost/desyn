
"use client";

import { MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // AlertDialogTrigger is used asChild
import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "@/types/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { deletePost } from "@/actions/postActions";

interface PostCardOptionsMenuProps {
  post: Post;
}

export function PostCardOptionsMenu({ post }: PostCardOptionsMenuProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!user || user.uid !== post.authorId) {
    return null; 
  }

  const handleDelete = async () => {
    if (!user) return; // Should be redundant due to check above, but good practice
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deletePost(post.id, user.uid);
      if (result.success) {
        toast({ title: "Post Deleted", description: "Your post has been successfully removed." });
        setShowDeleteDialog(false);
        // Revalidation should handle UI updates. Forcing a client-side refresh:
        router.refresh(); 
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsDeleting(false);
    });
  };

  return (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full data-[state=open]:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Post options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link href={`/posts/${post.id}/edit`} className="flex items-center">
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center text-destructive focus:text-destructive focus:bg-destructive/10"
            onSelect={(e) => {
              e.preventDefault();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your post
            and all its comments and likes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete Post
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
