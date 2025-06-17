
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Clapperboard } from 'lucide-react';
import { createAnimationProject } from '@/services/firestoreService';
import { DEFAULT_FPS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/lib/animationUtils';

const createAnimationSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100, { message: "Title cannot exceed 100 characters." }),
  fps: z.coerce.number().min(1, "FPS must be at least 1").max(60, "FPS cannot exceed 60"),
  width: z.coerce.number().min(100, "Width must be at least 100px").max(1920, "Width cannot exceed 1920px"),
  height: z.coerce.number().min(100, "Height must be at least 100px").max(1080, "Height cannot exceed 1080px"),
});

type CreateAnimationFormInputs = z.infer<typeof createAnimationSchema>;

export default function CreateAnimationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateAnimationFormInputs>({
    resolver: zodResolver(createAnimationSchema),
    defaultValues: {
      title: '',
      fps: DEFAULT_FPS,
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT,
    },
  });

  const onSubmit: SubmitHandler<CreateAnimationFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create an animation.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newProjectId = await createAnimationProject({
        title: data.title,
        ownerId: user.uid,
        fps: data.fps,
        width: data.width,
        height: data.height,
      });
      toast({ title: "Animation Created!", description: `"${data.title}" has been successfully created.` });
      router.push(`/animation/${newProjectId}`);
    } catch (error: any) {
      toast({
        title: "Error Creating Animation",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
            <Clapperboard className="mr-3 w-7 h-7 text-primary" />
            Create New Animation
          </CardTitle>
          <CardDescription>
            Set up the details for your new 2D animation project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Animation Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Awesome Short Film" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Width (px)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder={`${DEFAULT_CANVAS_WIDTH}`} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Height (px)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder={`${DEFAULT_CANVAS_HEIGHT}`} {...field} />
                        </FormControl>
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
                        <FormControl>
                        <Input type="number" placeholder={`${DEFAULT_FPS}`} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting || !user}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create Animation Project
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
