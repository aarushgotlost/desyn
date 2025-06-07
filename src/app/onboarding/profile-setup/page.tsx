
"use client";

import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle } from 'lucide-react';
import Image from 'next/image';

const profileSetupSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters."}),
  photoURL: z.string().url({ message: "Please enter a valid URL for your profile picture." }).optional().or(z.literal('')),
  bio: z.string().max(200, { message: "Bio cannot exceed 200 characters." }).optional(),
  techStack: z.string().optional(), // Will be comma-separated string, converted to array in AuthContext
});

type ProfileSetupFormInputs = z.infer<typeof profileSetupSchema>;

export default function ProfileSetupPage() {
  const { user, userProfile, updateCurrentProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileSetupFormInputs>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      displayName: '',
      photoURL: '',
      bio: '',
      techStack: '',
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      form.reset({
        displayName: userProfile?.displayName || user.displayName || '',
        photoURL: userProfile?.photoURL || user.photoURL || 'https://placehold.co/120x120.png',
        bio: userProfile?.bio || '',
        techStack: userProfile?.techStack?.join(', ') || '',
      });
    }
     if (!authLoading && !user) {
      router.replace('/login'); // Should not happen due to AuthGuard, but defensive
    }
  }, [user, userProfile, authLoading, form, router]);

  const onSubmit: SubmitHandler<ProfileSetupFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const profileUpdateData: Partial<UserProfile> = {
        displayName: data.displayName,
        photoURL: data.photoURL || null, // Ensure empty string becomes null
        bio: data.bio,
        techStack: data.techStack ? data.techStack.split(',').map(s => s.trim()).filter(s => s) : [],
        onboardingCompleted: true,
      };
      await updateCurrentProfile(profileUpdateData);
      toast({ title: "Profile Updated!", description: "Welcome to DevConnect!" });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Error Updating Profile",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading || (!user && !authLoading)) { // Show loading if auth is loading or user is unexpectedly null
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <UserCircle className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-2xl font-headline">Complete Your Profile</CardTitle>
          <CardDescription>Let's get your DevConnect profile set up.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photoURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Picture URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/your-image.png" {...field} />
                    </FormControl>
                     {field.value && (
                        <Image src={field.value} alt="Profile preview" width={80} height={80} className="mt-2 rounded-full object-cover" data-ai-hint="user avatar" onError={(e) => (e.currentTarget.src = 'https://placehold.co/80x80.png')} />
                     )}
                    <FormDescription>Link to your avatar image.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us a bit about yourself (e.g., your role, interests)." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="techStack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tech Stack (Optional, comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., React, Next.js, Firebase" {...field} />
                    </FormControl>
                    <FormDescription>List some technologies you work with.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading || authLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Profile & Continue"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

