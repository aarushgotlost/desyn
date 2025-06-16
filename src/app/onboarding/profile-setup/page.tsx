
"use client";

import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle, UploadCloud, Trash2, Image as ImageIcon, BellRing, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { messaging, VAPID_KEY } from '@/lib/firebase'; 
import { getToken } from 'firebase/messaging';

const MAX_AVATAR_SIZE_MB = 1; 
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

const MAX_BANNER_SIZE_MB = 2;
const MAX_BANNER_SIZE_BYTES = MAX_BANNER_SIZE_MB * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const profileSetupSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters."}),
  photoDataUrl: z.string().optional().nullable() 
    .refine(
      (dataUrl) => !dataUrl || dataUrl.length <= MAX_AVATAR_SIZE_BYTES,
      `Avatar image size is too large (max ${MAX_AVATAR_SIZE_MB}MB).`
    ),
  bannerDataUrl: z.string().optional().nullable()
    .refine(
      (dataUrl) => !dataUrl || dataUrl.length <= MAX_BANNER_SIZE_BYTES,
      `Banner image size is too large (max ${MAX_BANNER_SIZE_MB}MB).`
    ),
  bio: z.string().max(200, { message: "Bio cannot exceed 200 characters." }).optional(),
  skills: z.string().optional(), 
});

type ProfileSetupFormInputs = z.infer<typeof profileSetupSchema>;

export default function ProfileSetupPage() {
  const { user, userProfile, updateCurrentProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFileError, setAvatarFileError] = useState<string | null>(null);

  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerFileError, setBannerFileError] = useState<string | null>(null);

  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'loading' | 'not_requested'>('not_requested');
  const [isRequestingNotificationPerm, setIsRequestingNotificationPerm] = useState(false);

  const form = useForm<ProfileSetupFormInputs>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      displayName: '',
      photoDataUrl: null,
      bannerDataUrl: null,
      bio: '',
      skills: '', // Changed from techStack
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      form.reset({
        displayName: userProfile?.displayName || user.displayName || '',
        photoDataUrl: userProfile?.photoURL || null, 
        bannerDataUrl: userProfile?.bannerURL || null,
        bio: userProfile?.bio || '',
        skills: userProfile?.skills?.join(', ') || '', // Changed from techStack
      });
      setAvatarPreviewUrl(userProfile?.photoURL || null); 
      setBannerPreviewUrl(userProfile?.bannerURL || null);
    }
     if (!authLoading && !user) {
      router.replace('/login'); 
    }
  }, [user, userProfile, authLoading, form, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && messaging) {
      setNotificationStatus(Notification.permission);
    } else if (typeof window !== 'undefined' && (!('Notification' in window) || !('serviceWorker' in navigator) || !messaging)){
      setNotificationStatus('denied'); 
    } else {
      setNotificationStatus('loading'); 
    }
  }, []);


  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarFileError(null); 
    const file = event.target.files?.[0];
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setAvatarFileError('Invalid file type. Please select an image (jpg, png, webp, gif).');
        form.setValue('photoDataUrl', avatarPreviewUrl); 
        event.target.value = ''; 
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl.length > MAX_AVATAR_SIZE_BYTES) {
          setAvatarFileError(`Avatar is too large (max ${MAX_AVATAR_SIZE_MB}MB).`);
          form.setValue('photoDataUrl', avatarPreviewUrl); 
          event.target.value = ''; 
          return;
        }
        setAvatarPreviewUrl(dataUrl);
        form.setValue('photoDataUrl', dataUrl, { shouldValidate: true });
      };
      reader.onerror = () => {
        setAvatarFileError('Failed to read file.');
        event.target.value = ''; 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreviewUrl(null);
    form.setValue('photoDataUrl', null, { shouldValidate: true });
    const fileInput = document.getElementById('avatar-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
     setAvatarFileError(null);
  };

  const handleBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBannerFileError(null);
    const file = event.target.files?.[0];
    if (file) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setBannerFileError('Invalid file type. Please select an image (jpg, png, webp, gif).');
            form.setValue('bannerDataUrl', bannerPreviewUrl);
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            if (dataUrl.length > MAX_BANNER_SIZE_BYTES) {
                setBannerFileError(`Banner image is too large (max ${MAX_BANNER_SIZE_MB}MB).`);
                form.setValue('bannerDataUrl', bannerPreviewUrl);
                event.target.value = '';
                return;
            }
            setBannerPreviewUrl(dataUrl);
            form.setValue('bannerDataUrl', dataUrl, { shouldValidate: true });
        };
        reader.onerror = () => {
            setBannerFileError('Failed to read banner file.');
            event.target.value = '';
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
      setBannerPreviewUrl(null);
      form.setValue('bannerDataUrl', null, { shouldValidate: true });
      const fileInput = document.getElementById('banner-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setBannerFileError(null);
  };

  const handleRequestNotificationPermission = async (): Promise<string | null> => {
    if (!messaging || !user) {
      toast({ title: "Setup Incomplete", description: "Notification features are not available at the moment.", variant: "destructive" });
      setNotificationStatus('denied');
      return null;
    }
  
    setIsRequestingNotificationPerm(true);
    let fcmToken: string | null = null;
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
  
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          fcmToken = currentToken;
          toast({ title: "Notifications Enabled!", description: "You'll receive updates from Desyn." });
        } else if (!currentToken) {
          toast({ title: "Could Not Get Token", description: "Failed to retrieve notification token. Ensure your browser supports notifications and try again.", variant: "destructive" });
        }
      } else {
        toast({ title: "Permission Denied", description: "Notifications will not be sent. You can change this in your browser settings.", variant: "default" });
      }
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      toast({ title: "Notification Error", description: error.message || "Could not enable notifications. Please try again.", variant: "destructive" });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationStatus(Notification.permission); 
      }
    } finally {
      setIsRequestingNotificationPerm(false);
    }
    return fcmToken;
  };


  const onSubmit: SubmitHandler<ProfileSetupFormInputs> = async (data) => {
    setIsSubmitting(true);
    let acquiredFcmToken: string | null = null;

    if (notificationStatus === 'default' && messaging && user && VAPID_KEY !== "YOUR_PUBLIC_VAPID_KEY_HERE" && VAPID_KEY !== "BIhYhqAuf9hWPjsk5sDSk5kBZZK-6btzuXdPjvtDVcEGz81Mk6pPKayslVX394sGLPUshvM_IkXsTFsrffwqjL0_PLACEHOLDER") {
      acquiredFcmToken = await handleRequestNotificationPermission();
    }

    try {
      const profileUpdateData: UpdateProfileData = { 
        displayName: data.displayName,
        photoDataUrl: data.photoDataUrl, 
        bannerDataUrl: data.bannerDataUrl,
        bio: data.bio,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(s => s) : [], // Changed from techStack
        onboardingCompleted: true,
        newFcmToken: acquiredFcmToken || undefined, 
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
            {userProfile?.onboardingCompleted ? "Keep your information current." : "Let's get your Desyn profile set up to connect with other creators."}
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
                      <Input placeholder="Your Name or Alias" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Profile Picture</FormLabel>
                <div className="flex items-center space-x-3">
                    {avatarPreviewUrl ? (
                        <Image src={avatarPreviewUrl} alt="Profile picture preview" width={80} height={80} className="rounded-full object-cover border" data-ai-hint="user avatar preview"/>
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-muted border flex items-center justify-center">
                            <UserCircle className="w-10 h-10 text-muted-foreground" />
                        </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input 
                          id="avatar-file-input"
                          type="file" 
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          onChange={handleAvatarFileChange}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                          aria-label="Upload profile picture"
                      />
                       {avatarPreviewUrl && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar} aria-label="Remove profile picture">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Avatar
                        </Button>
                      )}
                    </div>
                </div>
                <FormDescription className="mt-1">Upload your avatar (max {MAX_AVATAR_SIZE_MB}MB).</FormDescription>
                 {avatarFileError && <p className="text-sm font-medium text-destructive">{avatarFileError}</p>}
                 <FormField
                    control={form.control}
                    name="photoDataUrl"
                    render={() => <FormMessage />} 
                  />
              </FormItem>

              <FormItem>
                  <FormLabel>Profile Banner</FormLabel>
                  {bannerPreviewUrl ? (
                      <div className="relative w-full aspect-[3/1] rounded-md overflow-hidden border mb-2">
                          <Image src={bannerPreviewUrl} alt="Profile banner preview" layout="fill" objectFit="cover" data-ai-hint="profile banner preview wide"/>
                      </div>
                  ) : (
                      <div className="w-full aspect-[3/1] rounded-md bg-muted border flex items-center justify-center mb-2">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                  )}
                  <div className="flex items-center space-x-3">
                      <div className="flex-1 space-y-2">
                          <Input
                              id="banner-file-input"
                              type="file"
                              accept={ACCEPTED_IMAGE_TYPES.join(',')}
                              onChange={handleBannerFileChange}
                              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                              aria-label="Upload profile banner"
                          />
                          {bannerPreviewUrl && (
                              <Button type="button" variant="outline" size="sm" onClick={handleRemoveBanner} aria-label="Remove profile banner">
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove Banner
                              </Button>
                          )}
                      </div>
                  </div>
                  <FormDescription className="mt-1">Upload a banner for your profile (max {MAX_BANNER_SIZE_MB}MB).</FormDescription>
                  {bannerFileError && <p className="text-sm font-medium text-destructive">{bannerFileError}</p>}
                  <FormField
                    control={form.control}
                    name="bannerDataUrl"
                    render={() => <FormMessage />}
                  />
              </FormItem>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us a bit about yourself (e.g., your role, creative pursuits, interests)." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skills" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills / Tools (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Animation, 3D Modeling, JavaScript, Figma" {...field} />
                    </FormControl>
                    <FormDescription>List your skills, software, or tools you work with.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <FormItem>
                <FormLabel>Push Notifications</FormLabel>
                <FormDescription>Stay updated with real-time notifications from Desyn.</FormDescription>
                <div className="mt-2 space-y-2">
                  {notificationStatus === 'granted' && (
                    <div className="flex items-center text-green-500 p-2 bg-green-500/10 rounded-md">
                      <CheckCircle className="mr-2 h-5 w-5" /> Notifications Enabled
                    </div>
                  )}
                  {notificationStatus === 'denied' && (
                    <div className="flex items-center text-destructive p-2 bg-destructive/10 rounded-md">
                      <XCircle className="mr-2 h-5 w-5" /> Notifications Denied/Blocked
                    </div>
                  )}
                  {(notificationStatus === 'default' || notificationStatus === 'not_requested') && messaging && VAPID_KEY !== "YOUR_PUBLIC_VAPID_KEY_HERE" && VAPID_KEY !== "BIhYhqAuf9hWPjsk5sDSk5kBZZK-6btzuXdPjvtDVcEGz81Mk6pPKayslVX394sGLPUshvM_IkXsTFsrffwqjL0_PLACEHOLDER" && (
                    <Button type="button" variant="outline" onClick={handleRequestNotificationPermission} disabled={isRequestingNotificationPerm}>
                      {isRequestingNotificationPerm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                      Enable Notifications
                    </Button>
                  )}
                  {notificationStatus === 'loading' && (
                    <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking permission...</div>
                  )}
                  {(!messaging || VAPID_KEY === "YOUR_PUBLIC_VAPID_KEY_HERE" || VAPID_KEY === "BIhYhqAuf9hWPjsk5sDSk5kBZZK-6btzuXdPjvtDVcEGz81Mk6pPKayslVX394sGLPUshvM_IkXsTFsrffwqjL0_PLACEHOLDER") && notificationStatus !== 'granted' && (
                     <p className="text-xs text-destructive">Notifications are not supported, available, or configured correctly in your browser/environment.</p>
                  )}
                  {notificationStatus === 'denied' && (
                    <p className="text-xs text-muted-foreground">If you previously denied permission, you might need to change it in your browser's site settings for Desyn.</p>
                  )}
                </div>
              </FormItem>
              
              <Button type="submit" className="w-full !mt-8" disabled={isSubmitting || authLoading}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
