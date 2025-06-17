
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Share2, UserPlus, Trash2, Link as LinkIcon, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AnimationProject } from '@/types/data';
import { addCollaboratorToAnimationProject, getUserProfile } from '@/services/firestoreService'; // Assuming getUserProfile for display
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: AnimationProject | null;
}

export function ShareProjectDialog({ open, onOpenChange, project }: ShareProjectDialogProps) {
  const { toast } = useToast();
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState(project?.collaborators || []);

  useEffect(() => {
    setCollaborators(project?.collaborators || []);
  }, [project]);


  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !collaboratorEmail.trim()) {
      toast({ title: "Error", description: "Project not loaded or email is empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addCollaboratorToAnimationProject({ projectId: project.id, collaboratorEmail });
      if (result.data.success) {
        toast({ title: "Collaborator Added!", description: result.data.message });
        setCollaboratorEmail("");
        // Optimistically update collaborators list or re-fetch project details
        // For simplicity, assume parent will refresh or useAnimation context handles it.
        // Or, fetch the new collaborator profile and add it here:
        const newCollaboratorProfile = await getUserProfile(result.data.message.split("UID: ")[1] || ""); // A bit hacky, Cloud Function should return UID
        if (newCollaboratorProfile) {
           setCollaborators(prev => [...prev, {uid: newCollaboratorProfile.uid, email: newCollaboratorProfile.email, displayName: newCollaboratorProfile.displayName, photoURL: newCollaboratorProfile.photoURL}]);
        }
      } else {
        toast({ title: "Failed to Add", description: result.data.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({
        title: "Error Adding Collaborator",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Placeholder for removing collaborator
  const handleRemoveCollaborator = (uid: string) => {
    toast({ title: "Info", description: `Remove collaborator functionality (UID: ${uid}) to be implemented.`, variant: "default" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share2 className="mr-2 h-5 w-5 text-primary" /> Share "{project?.title || 'Project'}"
          </DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this animation project by email.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleAddCollaborator} className="space-y-3 pt-2">
          <div className="flex items-center space-x-2">
            <Input
              id="collaboratorEmail"
              type="email"
              value={collaboratorEmail}
              onChange={(e) => setCollaboratorEmail(e.target.value)}
              placeholder="Enter collaborator's email"
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isSubmitting || !collaboratorEmail.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span className="sr-only">Add Collaborator</span>
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium flex items-center"><Users className="mr-2 h-4 w-4"/>Current Collaborators:</h4>
          {collaborators.length > 0 ? (
            <ScrollArea className="h-40 border rounded-md p-2">
              <ul className="space-y-2">
                {collaborators.map(collab => (
                  <li key={collab.uid} className="flex items-center justify-between text-sm p-1.5 bg-muted/50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={collab.photoURL || undefined} alt={collab.displayName || "User"} />
                        <AvatarFallback className="text-xs">{getInitials(collab.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate" title={collab.displayName || collab.email || 'Unknown'}>
                        {collab.displayName || collab.email || 'Unknown User'}
                        {collab.uid === project?.ownerId && <span className="text-xs text-primary ml-1">(Owner)</span>}
                      </span>
                    </div>
                    {collab.uid !== project?.ownerId && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCollaborator(collab.uid)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                        <span className="sr-only">Remove collaborator</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-xs text-muted-foreground">No collaborators yet (besides the owner).</p>
          )}
        </div>
        
        {/* Placeholder for public link sharing */}
        <div className="mt-4 pt-4 border-t">
           <Button variant="outline" className="w-full" disabled>
            <LinkIcon className="mr-2 h-4 w-4" /> Generate Public Link (Future)
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
