
"use client";

import { useState }_DOC_CREATE_CANVAS_DIALOG_EXISTED_BEFORE_
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Keep if standalone button trigger is needed
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createAnimationProject } from "@/services/firestoreService";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface CreateCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
}

export function CreateCanvasDialog({ open, onOpenChange, onProjectCreated }: CreateCanvasDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Canvas title cannot be empty.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const projectId = await createAnimationProject(title, user.uid, userProfile.displayName || "Anonymous");
      toast({ title: "Canvas Created!", description: `"${title}" has been successfully created.` });
      setTitle("");
      onOpenChange(false);
      if (onProjectCreated) {
        onProjectCreated(projectId);
      }
      router.push(`/animation/${projectId}`); // Navigate to the new project
    } catch (error: any) {
      toast({
        title: "Error Creating Canvas",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <PlusCircle className="mr-2 h-5 w-5 text-primary" /> Create New Animation Canvas
            </DialogTitle>
            <DialogDescription>
              Give your new animation project a title. You can invite collaborators later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="e.g., My Awesome Animation"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Canvas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
