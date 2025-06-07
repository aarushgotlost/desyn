
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
import { Loader2, UserCircle, UploadCloud } from 'lucide-react';
import Image from 'next/image';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const imageFileSchema = z
  .custom<FileList>((val) => val instanceof FileList, "Expected a FileList")
  .optional()
  .refine(
    (fileList) => !fileList || fileList.length === 0 || (fileList.length === 1 && fileList[0].size <= MAX_FILE_SIZE_BYTES),
    `Max file size is ${MAX_FILE_SIZE_MB}MB.`
  )
  .refine(
    (fileList) => !fileList || fileList.length === 0 || (fileList.length === 1 && ACCEPTED_IMAGE_TYPES.includes(fileList[0].type)),
    '.jpg, .jpeg, .png, .webp, .gif files are accepted.'
  )
  .transform((fileList) => (fileList && fileList.length > 0 ? fileList[0] : undefined));


const profileSetupSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters."}),
  photoFile: imageFileSchema,
  bio: z.string().max(200, { message: "Bio cannot exceed 200 characters." }).optional(),
  techStack: z.string().optional(), 
});

type ProfileSetupFormInputs = z.infer<typeof profileSetupSchema>;

export default function ProfileSetupPage() {
  const { user, userProfile, updateCurrentProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProfileSetupFormInputs>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      displayName: '',
      photoFile: undefined,
      bio: '',
      techStack: '',
    },
  });

  const photoFileWatch = form.watch('photoFile');

  useEffect(() => {
    if (!authLoading && user) {
      form.reset({
        displayName: userProfile?.displayName || user.displayName || '',
        photoFile: undefined, 
        bio: userProfile?.bio || '',
        techStack: userProfile?.techStack?.join(', ') || '',
      });
      setPreviewUrl(userProfile?.photoURL || null); 
    }
     if (!authLoading && !user) {
      router.replace('/login'); 
    }
  }, [user, userProfile, authLoading, form, router]);


  useEffect(() => {
    let objectUrl: string | null = null;
    if (photoFileWatch instanceof File) {
      objectUrl = URL.createObjectURL(photoFileWatch);
      setPreviewUrl(objectUrl);
    } else if (!photoFileWatch && userProfile?.photoURL) {
      setPreviewUrl(userProfile.photoURL);
    } else if (!photoFileWatch) {
      setPreviewUrl(null);
    }
  
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoFileWatch, userProfile?.photoURL]);


  const onSubmit: SubmitHandler<ProfileSetupFormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      const profileUpdateData = {
        displayName: data.displayName,
        photoFile: data.photoFile, 
        bio: data.bio,
        techStack: data.techStack ? data.techStack.split(',').map(s => s.trim()).filter(s => s) : [],
        onboardingCompleted: true,
      };
      await updateCurrentProfile(profileUpdateData);
      toast({ title: "Profile Updated!", description: "Your profile has been successfully saved." });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Error Updating Profile",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || (!user && !authLoading)) { 
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
          <CardTitle className="text-2xl font-headline">
            {userProfile?.onboardingCompleted ? "Update Your Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            {userProfile?.onboardingCompleted ? "Keep your information current." : "Let's get your Desyn profile set up."}
          </CardDescription>
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
                name="photoFile"
                render={({ field: { onChange, onBlur, name, ref } }) => ( // Correctly destructure to pass only necessary props to Input
                  <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex items-center space-x-3">
                        {previewUrl && (
                            <Image src={previewUrl} alt="Profile preview" width={80} height={80} className="rounded-full object-cover border" data-ai-hint="user avatar"/>
                        )}
                        {!previewUrl && (
                            <div className="w-20 h-20 rounded-full bg-muted border flex items-center justify-center">
                                <UserCircle className="w-10 h-10 text-muted-foreground" />
                            </div>
                        )}
                        <FormControl>
                            <div className="flex-1">
                            <Input 
                                type="file" 
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                onChange={(e) => onChange(e.target.files)} // Pass FileList to RHF
                                onBlur={onBlur} 
                                name={name} 
                                ref={ref}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            <FormDescription className="mt-1">Upload your avatar (max {MAX_FILE_SIZE_MB}MB).</FormDescription>
                            </div>
                        </FormControl>
                    </div>
                    <FormMessage /> {/* This will show errors from zod schema */}
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
              
              <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
