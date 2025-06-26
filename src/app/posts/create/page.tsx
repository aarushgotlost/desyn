
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, UploadCloud, Code2, Loader2, AlertTriangle, Info } from "lucide-react";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getCommunityDetails } from '@/services/firestoreService'; 
import type { Community } from '@/types/data'; 
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const imageFileSchema = z
  .instanceof(FileList)
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

const postFormSchema = z.object({
  postTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(150, {message: "Title must be 150 characters or less."}),
  postDescription: z.string().min(10, { message: "Description must be at least 10 characters." }),
  postCodeSnippet: z.string().optional(),
  postImageFile: imageFileSchema,
  postTags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
});

type PostFormInputs = z.infer<typeof postFormSchema>;

export default function CreatePostPage() {
  const { createPost, user, userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const preselectedCommunityId = searchParams.get('communityId');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [communityFetchError, setCommunityFetchError] = useState<string | null>(null);


  const form = useForm<PostFormInputs>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      postTitle: "",
      postDescription: "",
      postCodeSnippet: "",
      postImageFile: undefined,
      postTags: "",
    },
  });
  
  useEffect(() => {
    async function fetchCommunityData() {
      if (preselectedCommunityId) {
        setIsLoadingCommunity(true);
        setCommunityFetchError(null);
        try {
          const community = await getCommunityDetails(preselectedCommunityId);
          if (community) {
            setSelectedCommunity(community);
          } else {
            setCommunityFetchError(`Community with ID "${preselectedCommunityId}" not found. You can still create a general post, or find a community to post in.`);
            toast({ title: "Community Not Found", description: "The specified community was not found.", variant: "destructive" });
          }
        } catch (error) {
          console.error("Failed to fetch community details", error);
          setCommunityFetchError("Failed to load community details. You can create a general post or try again later.");
          toast({ title: "Error", description: "Could not load community details.", variant: "destructive" });
        } finally {
          setIsLoadingCommunity(false);
        }
      } else {
        // No communityId in URL, allow creating a "global" post
        setSelectedCommunity(null); 
        setIsLoadingCommunity(false);
        setCommunityFetchError(null);
      }
    }
    fetchCommunityData();
  }, [preselectedCommunityId, toast]);


  const imageFileWatch = form.watch('postImageFile');

  useEffect(() => {
    let objectUrl: string | null = null;
    if (imageFileWatch instanceof File) {
      objectUrl = URL.createObjectURL(imageFileWatch);
      setImagePreview(objectUrl);
    } else {
      setImagePreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageFileWatch]);

  const onSubmit: SubmitHandler<PostFormInputs> = async (data) => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a post.", variant: "destructive" });
      return;
    }
    
    // If a communityId was provided in URL but fetching failed, prevent submission for that specific community.
    // User can still submit a global post if they remove the communityId from URL or if it wasn't there initially.
    if (preselectedCommunityId && !selectedCommunity && communityFetchError) {
        toast({ title: "Community Error", description: communityFetchError, variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const newPostId = await createPost({
        title: data.postTitle,
        communityId: selectedCommunity ? selectedCommunity.id : null, 
        communityName: selectedCommunity ? selectedCommunity.name : null, 
        description: data.postDescription,
        codeSnippet: data.postCodeSnippet,
        imageFile: data.postImageFile,
        tags: data.postTags as string[],
      });
      toast({ title: "Post Created!", description: "Your post has been successfully published." });
      router.push(`/posts/${newPostId}`);
    } catch (error: any) {
      toast({
        title: "Error Creating Post",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCommunity && preselectedCommunityId) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading community details...</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
             <FileText className="mr-3 w-7 h-7 text-primary" /> Create a New Post
          </CardTitle>
          {selectedCommunity && !communityFetchError && (
            <CardDescription>
              You are creating a post in: <strong className="text-primary">{selectedCommunity.name}</strong>.
            </CardDescription>
          )}
          {!preselectedCommunityId && !isLoadingCommunity && (
            <CardDescription>
              You are creating a general post. It will not be linked to a specific community.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {communityFetchError && preselectedCommunityId && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Community Issue</AlertTitle>
              <AlertDescription>
                {communityFetchError}
                <br />
                You can <Link href="/communities" className="underline hover:text-foreground/80">find another community</Link> or remove the community ID from the URL to create a general post.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="postTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My new walk cycle animation, How I coded this particle effect" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="postDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Share details about your animation, artwork, or code. Markdown is supported." rows={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postCodeSnippet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code Snippet (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="```javascript\nconsole.log('Hello Desyn!');\n```" rows={6} className="font-code" {...field} />
                    </FormControl>
                    <FormDescription>Use markdown for code blocks.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="postImageFile"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                  <FormItem>
                    <FormLabel>Image (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="file"
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          onChange={(e) => onChange(e.target.files)}
                          onBlur={onBlur}
                          name={name}
                          ref={ref}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                          aria-label="Upload post image"
                        />
                        <UploadCloud className="text-muted-foreground" />
                      </div>
                    </FormControl>
                    {imagePreview && (
                      <Image src={imagePreview} alt="Post image preview" width={200} height={100} className="mt-2 rounded-md object-cover border" data-ai-hint="post image preview small" />
                    )}
                    <FormDescription>Upload an image for your post (max {MAX_FILE_SIZE_MB}MB).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., react, bug, tutorial, discussion" {...field} />
                    </FormControl>
                    <FormDescription>Help categorize your post.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || (isLoadingCommunity && !!preselectedCommunityId) || (!!preselectedCommunityId && !selectedCommunity && !!communityFetchError)}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Code2 className="mr-2 h-4 w-4" /> Publish Post</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
