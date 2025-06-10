
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
import { getCommunityDetails } from '@/services/firestoreService'; // Changed to getCommunityDetails
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
  // communityId is no longer directly in the form schema for user input
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
  const [communityError, setCommunityError] = useState<string | null>(null);


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
        setCommunityError(null);
        try {
          const community = await getCommunityDetails(preselectedCommunityId);
          if (community) {
            setSelectedCommunity(community);
          } else {
            setCommunityError("The specified community could not be found. Please select a valid community to post in.");
            toast({ title: "Community Not Found", description: "Please create posts from a valid community page.", variant: "destructive" });
          }
        } catch (error) {
          console.error("Failed to fetch community details", error);
          setCommunityError("Failed to load community details. Please try again.");
          toast({ title: "Error", description: "Could not load community details.", variant: "destructive" });
        } finally {
          setIsLoadingCommunity(false);
        }
      } else {
        setCommunityError("No community selected. Please create posts from a community page.");
         // Optionally redirect or show a more prominent message
        // router.push('/communities'); 
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
    
    if (!selectedCommunity || !preselectedCommunityId) {
        toast({ title: "Community Error", description: communityError || "No community selected. Posts must be created within a community.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const newPostId = await createPost({
        title: data.postTitle,
        communityId: preselectedCommunityId, 
        communityName: selectedCommunity.name, 
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

  if (isLoadingCommunity && !selectedCommunity && !communityError) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading community details...</p>
      </div>
    );
  }
  
  if (communityError) {
    return (
       <div className="max-w-3xl mx-auto pt-10">
         <Alert variant="destructive">
           <AlertTriangle className="h-5 w-5" />
           <AlertTitle>Cannot Create Post</AlertTitle>
           <AlertDescription>
             {communityError}
             <br />
             You can find communities to post in <Link href="/communities" className="underline hover:text-destructive-foreground/80">here</Link>.
           </AlertDescription>
         </Alert>
       </div>
    );
  }
  
  if (!selectedCommunity && !isLoadingCommunity) {
     return (
       <div className="max-w-3xl mx-auto pt-10">
         <Alert variant="default">
           <Info className="h-5 w-5" />
           <AlertTitle>Community Information Missing</AlertTitle>
           <AlertDescription>
             It seems community details are not available. Please try navigating from a community page.
             <br />
             <Link href="/communities" className="underline hover:text-foreground/80">Explore communities</Link>.
           </AlertDescription>
         </Alert>
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
          {selectedCommunity && (
            <CardDescription>
              You are creating a post in: <strong className="text-primary">{selectedCommunity.name}</strong>.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="postTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a catchy title for your post" {...field} />
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
                      <Textarea placeholder="Write your post content here. Markdown is supported." rows={10} {...field} />
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
              
              <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingCommunity || !selectedCommunity || !!communityError}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Code2 className="mr-2 h-4 w-4" /> Publish Post</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
