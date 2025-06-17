
"use client";

import { useState, useEffect, type FormEvent } from 'react';
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
import { Loader2, Settings, Save } from "lucide-react";
import { useAnimation } from "@/context/AnimationContext";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const projectSettingsSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title too long."),
  fps: z.coerce.number().min(1).max(60),
  width: z.coerce.number().min(100).max(1920),
  height: z.coerce.number().min(100).max(1080),
  // backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"), // Add later
});
type ProjectSettingsFormInputs = z.infer<typeof projectSettingsSchema>;

export default function ProjectSettingsDialog() {
  const { project, updateProjectMetadata, isSavingProjectMeta } = useAnimation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ProjectSettingsFormInputs>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      title: project?.title || '',
      fps: project?.fps || 12,
      width: project?.width || 640,
      height: project?.height || 360,
    }
  });
  
  useEffect(() => {
    if (project && isOpen) { // Reset form when dialog opens or project data changes
      form.reset({
        title: project.title,
        fps: project.fps,
        width: project.width,
        height: project.height,
      });
    }
  }, [project, isOpen, form]);


  const onSubmit: SubmitHandler<ProjectSettingsFormInputs> = async (data) => {
    await updateProjectMetadata(data);
    setIsOpen(false); // Close dialog on successful save
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Manage your animation project's title, FPS, and dimensions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-3 gap-3">
                    <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Width</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Height</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="fps"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>FPS</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 {/* Background Color Picker - Future Enhancement
                <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <FormControl><Input type="color" {...field} className="h-10 w-full" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                */}
                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSavingProjectMeta}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSavingProjectMeta}>
                        {isSavingProjectMeta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
