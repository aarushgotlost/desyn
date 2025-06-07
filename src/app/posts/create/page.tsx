
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, UploadCloud, Code2, Loader2 } from "lucide-react";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getCommunities } from '@/services/firestoreService';
import type { Community } from '@/types/data'; 

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
  communityId: z.string().min(1, { message: "Please select a community." }),
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
  const [availableCommunities, setAvailableCommunities] = useState<Community[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);

  const preselectedCommunityId = searchParams.get('communityId');

  const form = useForm<PostFormInputs>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      postTitle: "",
      communityId: preselectedCommunityId || "",
      postDescription: "",
      postCodeSnippet: "",
      postImageFile: undefined,
      postTags: "",
    },
  });
  
  useEffect(() => {
    if (preselectedCommunityId) {
      form.setValue("communityId", preselectedCommunityId);
    }
  }, [preselectedCommunityId, form]);

  useEffect(() => {
    async function fetchCommunitiesData() {
      setIsLoadingCommunities(true);
      try {
        const communities = await getCommunities();
        setAvailableCommunities(communities);
      } catch (error) {
        // console.error("Failed to fetch communities", error); // Avoid console logs
        toast({ title: "Error", description: "Could not load communities.", variant: "destructive" });
      } finally {
        setIsLoadingCommunities(false);
      }
    }
    fetchCommunitiesData();
  }, [toast]);

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
    
    const selectedCommunity = availableCommunities.find(c => c.id === data.communityId);
    if (!selectedCommunity) {
        toast({ title: "Community Error", description: "Selected community not found or not loaded.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const newPostId = await createPost({
        title: data.postTitle,
        communityId: data.communityId,
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

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
             <FileText className="mr-3 w-7 h-7 text-primary" /> Create a New Post
          </CardTitle>
          <CardDescription>
            Share your thoughts, code snippets, or ask questions to the community.
          </CardDescription>
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
                name="communityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isLoadingCommunities}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="Select community">
                          <SelectValue placeholder={isLoadingCommunities ? "Loading communities..." : "Select a community to post in"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isLoadingCommunities && availableCommunities.map(community => (
                          <SelectItem key={community.id} value={community.id}>{community.name}</SelectItem>
                        ))}
                        {isLoadingCommunities && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormDescription>Choose a community for your post.</FormDescription>
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
                      <Image src={imagePreview} alt="Post image preview" width={200} height={100} className="mt-2 rounded-md object-cover border" data-ai-hint="post content image preview"/>
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
              
              <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingCommunities}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Code2 className="mr-2 h-4 w-4" /> Publish Post</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
