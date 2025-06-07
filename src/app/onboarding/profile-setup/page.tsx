
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
import { Loader2, UserCircle, UploadCloud, Trash2 } from 'lucide-react';
import Image from 'next/image';

const MAX_DATA_URL_SIZE_MB = 1; // Roughly 1MB limit for Firestore field
const MAX_DATA_URL_SIZE_BYTES = MAX_DATA_URL_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const profileSetupSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters."}),
  photoDataUrl: z.string().optional().nullable() // Store as Data URL string
    .refine(
      (dataUrl) => !dataUrl || dataUrl.length <= MAX_DATA_URL_SIZE_BYTES,
      `Image size is too large (max ${MAX_DATA_URL_SIZE_MB}MB). Please choose a smaller image.`
    ),
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
  const [fileError, setFileError] = useState<string | null>(null);


  const form = useForm<ProfileSetupFormInputs>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      displayName: '',
      photoDataUrl: null,
      bio: '',
      techStack: '',
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      form.reset({
        displayName: userProfile?.displayName || user.displayName || '',
        photoDataUrl: userProfile?.photoURL || null, 
        bio: userProfile?.bio || '',
        techStack: userProfile?.techStack?.join(', ') || '',
      });
      setPreviewUrl(userProfile?.photoURL || null); 
    }
     if (!authLoading && !user) {
      router.replace('/login'); 
    }
  }, [user, userProfile, authLoading, form, router]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null); // Clear previous file errors
    const file = event.target.files?.[0];
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setFileError('Invalid file type. Please select an image (jpg, png, webp, gif).');
        form.setValue('photoDataUrl', previewUrl); // Reset to previous or null
        event.target.value = ''; // Clear the file input
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl.length > MAX_DATA_URL_SIZE_BYTES) {
          setFileError(`Image is too large (max ${MAX_DATA_URL_SIZE_MB}MB). Please choose a smaller image or resize it.`);
          form.setValue('photoDataUrl', previewUrl); // Reset to previous or null
          event.target.value = ''; // Clear the file input
          return;
        }
        setPreviewUrl(dataUrl);
        form.setValue('photoDataUrl', dataUrl, { shouldValidate: true });
      };
      reader.onerror = () => {
        setFileError('Failed to read file.');
        event.target.value = ''; 
      };
      reader.readAsDataURL(file);
    } else {
      // No file selected, if user had a preview, keep it unless they explicitly remove
      // form.setValue('photoDataUrl', null);
      // setPreviewUrl(null); // Or keep previous if desired
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    form.setValue('photoDataUrl', null, { shouldValidate: true });
    // Clear the file input if it's holding a reference
    const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
     setFileError(null);
  };


  const onSubmit: SubmitHandler<ProfileSetupFormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      const profileUpdateData = {
        displayName: data.displayName,
        photoDataUrl: data.photoDataUrl, 
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

              <FormItem>
                <FormLabel>Profile Picture</FormLabel>
                <div className="flex items-center space-x-3">
                    {previewUrl ? (
                        <Image src={previewUrl} alt="Profile preview" width={80} height={80} className="rounded-full object-cover border" data-ai-hint="user avatar"/>
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-muted border flex items-center justify-center">
                            <UserCircle className="w-10 h-10 text-muted-foreground" />
                        </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input 
                          id="photo-file-input"
                          type="file" 
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          onChange={handleFileChange}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                       {previewUrl && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Image
                        </Button>
                      )}
                    </div>
                </div>
                <FormDescription className="mt-1">Upload your avatar (max {MAX_DATA_URL_SIZE_MB}MB). Larger images may impact performance.</FormDescription>
                 {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
                 {/* Display Zod validation error for photoDataUrl field */}
                 <FormField
                    control={form.control}
                    name="photoDataUrl"
                    render={() => <FormMessage />} 
                  />
              </FormItem>
              
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

    