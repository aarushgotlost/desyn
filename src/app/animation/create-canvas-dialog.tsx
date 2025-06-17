
"use client";

import { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, Clapperboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createCanvasProject } from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const createCanvasSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }).max(100, { message: 'Title cannot exceed 100 characters.' }),
});

type CreateCanvasFormInputs = z.infer<typeof createCanvasSchema>;

interface CreateCanvasDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCanvasCreated: (canvasId: string) => void;
}

export function CreateCanvasDialog({ isOpen, onOpenChange, onCanvasCreated }: CreateCanvasDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateCanvasFormInputs>({
    resolver: zodResolver(createCanvasSchema),
    defaultValues: {
      title: '',
    },
  });

  const onSubmit: SubmitHandler<CreateCanvasFormInputs> = async (data) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to create a canvas.', variant: 'destructive' });
      return;
    }
    startTransition(async () => {
      try {
        const newCanvasId = await createCanvasProject(data.title, user.uid);
        toast({ title: 'Canvas Created!', description: `"${data.title}" has been successfully created.` });
        form.reset();
        onCanvasCreated(newCanvasId);
        onOpenChange(false); // Close dialog
        router.push(`/animation/${newCanvasId}`); // Navigate to the new canvas
      } catch (error: any) {
        toast({
          title: 'Error Creating Canvas',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    });
  };
  
  // Ensure dialog closes if form is reset or component unmounts while open
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset(); // Reset form when dialog is closed
    }
    onOpenChange(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clapperboard className="mr-2 h-6 w-6 text-primary" />
            Create New Animation Canvas
          </DialogTitle>
          <DialogDescription>
            Give your new animation project a title. You can change it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="title" className="text-right">
              Canvas Title
            </Label>
            <Input
              id="title"
              {...form.register('title')}
              className={`mt-1 ${form.formState.errors.title ? 'border-destructive' : ''}`}
              disabled={isPending}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Canvas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
