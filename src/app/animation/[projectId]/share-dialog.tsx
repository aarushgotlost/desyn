
"use client";
import { useState, type FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Share2, UserPlus, Trash2, Copy } from "lucide-react";
import { useAnimation } from "@/context/AnimationContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ShareProjectDialog() {
  const { project, collaborators, isLoadingCollaborators, addCollaborator, routeProjectIdFromProp } = useAnimation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !project) return;
    setIsAdding(true);
    const result = await addCollaborator(email.trim());
    if (result.success) {
      setEmail("");
      // Dialog might close automatically or stay open for more additions based on UX preference
      // setIsOpen(false); // Optionally close dialog on success
    }
    setIsAdding(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/animation/${routeProjectIdFromProp}`;
    navigator.clipboard.writeText(link)
      .then(() => toast({ title: "Link Copied!", description: "Project link copied to clipboard." }))
      .catch(() => toast({ title: "Error", description: "Could not copy link.", variant: "destructive" }));
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Share Project: {project.title}</DialogTitle>
          <DialogDescription>
            Add collaborators by email or copy the project link.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-left">
              Add by Email
            </Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isAdding}
              />
              <Button type="submit" disabled={isAdding || !email.trim()}>
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-2 pt-2">
            <Label className="text-left">Copy Link</Label>
            <div className="flex items-center space-x-2">
                <Input
                    id="link"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/animation/${routeProjectIdFromProp}`}
                    readOnly
                    className="flex-1"
                />
                <Button type="button" size="icon" onClick={handleCopyLink} variant="outline">
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy link</span>
                </Button>
            </div>
        </div>
        
        <Separator className="my-4" />

        <div className="space-y-2">
          <Label>Current Collaborators</Label>
          {isLoadingCollaborators ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : collaborators.length > 0 ? (
            <ScrollArea className="h-[150px] w-full rounded-md border p-2">
              <div className="space-y-2">
              {collaborators.map(collab => (
                <div key={collab.uid} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={collab.photoURL || undefined} alt={collab.displayName || "User"} />
                      <AvatarFallback>{getInitials(collab.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-medium truncate">{collab.displayName || "Unnamed User"}</p>
                        {collab.email && <p className="text-xs text-muted-foreground truncate">{collab.email}</p>}
                    </div>
                  </div>
                  {/* Placeholder for remove collaborator button - requires another cloud function */}
                  {/* {project.ownerId === currentUser?.uid && collab.uid !== currentUser?.uid && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  )} */}
                </div>
              ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">Only you have access currently.</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Separator Component - if not already globally available
import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = SeparatorPrimitive.Root.displayName

