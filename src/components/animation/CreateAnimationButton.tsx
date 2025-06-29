
"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createAnimationProject } from "@/actions/animationActions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function CreateAnimationButton() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [fps, setFps] = useState(24);

    const handleCreate = () => {
        if (!user) {
            toast({ title: "Please log in", description: "You must be logged in to create an animation.", variant: "destructive" });
            return;
        }
        if (!projectName.trim()) {
            toast({ title: "Invalid Name", description: "Project name cannot be empty.", variant: "destructive" });
            return;
        }
        if (fps < 1 || fps > 60) {
            toast({ title: "Invalid FPS", description: "FPS must be between 1 and 60.", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await createAnimationProject(projectName, user.uid, fps);
            if (result.success && result.projectId) {
                toast({ title: "Project Created!", description: `"${projectName}" has been created.` });
                setIsOpen(false);
                setProjectName("");
                setFps(24);
                router.push(`/animation/${result.projectId}`);
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Animation</DialogTitle>
                    <DialogDescription>
                        Give your new animation project a name and set the framerate.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="project-name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., My First Short"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project-fps" className="text-right">
                            FPS
                        </Label>
                        <Input
                            id="project-fps"
                            type="number"
                            value={fps}
                            onChange={(e) => setFps(e.target.value ? parseInt(e.target.value, 10) : 0)}
                            className="col-span-3"
                            min="1"
                            max="60"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isPending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={isPending || !projectName.trim() || !fps || fps < 1 || fps > 60}>
                         {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
