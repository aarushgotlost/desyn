
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

    const handleCreate = () => {
        if (!user) {
            toast({ title: "Please log in", description: "You must be logged in to create an animation.", variant: "destructive" });
            return;
        }
        if (!projectName.trim()) {
            toast({ title: "Invalid Name", description: "Project name cannot be empty.", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await createAnimationProject(projectName, user.uid);
            if (result.success && result.projectId) {
                toast({ title: "Project Created!", description: `"${projectName}" has been created.` });
                setIsOpen(false);
                setProjectName("");
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
                    Desyn2d
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Animation</DialogTitle>
                    <DialogDescription>
                        Give your new animation project a name to get started.
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
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isPending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={isPending || !projectName.trim()}>
                         {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
