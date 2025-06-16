
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Film, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createAnimationProject } from '@/services/firestoreService';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from 'next/link';

const createAnimationSchema = z.object({
  projectName: z.string().min(3, { message: "Project name must be at least 3 characters." }).max(50, { message: "Project name must be 50 characters or less." }),
  fps: z.coerce.number().min(1, { message: "FPS must be at least 1." }).max(60, { message: "FPS can be at most 60." }).default(12),
});

type CreateAnimationFormInputs = z.infer<typeof createAnimationSchema>;

export default function CreateAnimationProjectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateAnimationFormInputs>({
    resolver: zodResolver(createAnimationSchema),
    defaultValues: {
      projectName: "",
      fps: 12,
    },
  });

  const onSubmit: SubmitHandler<CreateAnimationFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create an animation project.", variant: "destructive" });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const newProjectId = await createAnimationProject(user.uid, data.projectName, data.fps);
      toast({ title: "Project Created!", description: `"${data.projectName}" has been successfully created.` });
      router.push(`/animation/${newProjectId}`);
    } catch (error: any) {
      toast({
        title: "Error Creating Project",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !authLoading) {
     router.push('/login');
     return (
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p>Redirecting to login...</p>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <div className="max-w-lg mx-auto">
       <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/animation">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Link>
        </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
            <Film className="mr-3 w-7 h-7 text-primary" />
            Create New Animation Project
          </CardTitle>
          <CardDescription>
            Set up the basic details for your new 2D animation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Awesome Short Film" {...field} />
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
                    <FormLabel>Frames Per Second (FPS)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="60" placeholder="12" {...field} />
                    </FormControl>
                    <FormDescription>Common values are 12, 24, 30.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Project & Open Editor"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
