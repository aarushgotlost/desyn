
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, UploadCloud, Code2, Loader2, AlertTriangle, Image as ImageIcon, Trash2, ArrowLeft } from "lucide-react";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import NextImage from 'next/image'; 
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getPostDetails } from '@/services/firestoreService'; 
import type { Post } from '@/types/data';
import { updatePostAction, type UpdatePostData } from '@/actions/postActions';
import Link from "next/link";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Schema for the new image file being uploaded
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


const editPostFormSchema = z.object({
  postTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(150, {message: "Title must be 150 characters or less."}),
  postDescription: z.string().min(10, { message: "Description must be at least 10 characters." }),
  postCodeSnippet: z.string().optional(),
  newPostImageFile: imageFileSchema, // For handling new file uploads
  currentImageURL: z.string().nullable().optional(), // To track the existing image URL or if it's marked for removal
  postTags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
});

type EditPostFormInputs = z.infer<typeof editPostFormSchema>;

export default function EditPostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [postData, setPostData] = useState<Post | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileError, setImageFileError] = useState<string | null>(null);


  const form = useForm<EditPostFormInputs>({
    resolver: zodResolver(editPostFormSchema),
    defaultValues: {
      postTitle: "",
      postDescription: "",
      postCodeSnippet: "",
      newPostImageFile: undefined,
      currentImageURL: null,
      postTags: "",
    },
  });

  useEffect(() => {
    if (!postId || authLoading) return;
    if (!user) {
      router.replace('/login'); // Redirect if not logged in
      return;
    }

    async function fetchPost() {
      setIsLoadingPost(true);
      try {
        const fetchedPost = await getPostDetails(postId);
        if (fetchedPost) {
          if (fetchedPost.authorId !== user.uid) {
            toast({ title: "Unauthorized", description: "You are not authorized to edit this post.", variant: "destructive" });
            router.push(`/posts/${postId}`);
            return;
          }
          setPostData(fetchedPost);
          form.reset({
            postTitle: fetchedPost.title,
            postDescription: fetchedPost.description,
            postCodeSnippet: fetchedPost.codeSnippet || "",
            currentImageURL: fetchedPost.imageURL || null,
            postTags: fetchedPost.tags.join(', '),
            newPostImageFile: undefined, // Ensure new file is initially undefined
          });
          setImagePreview(fetchedPost.imageURL || null);
        } else {
          toast({ title: "Not Found", description: "Post not found.", variant: "destructive" });
          router.push('/');
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load post data.", variant: "destructive" });
      } finally {
        setIsLoadingPost(false);
      }
    }
    fetchPost();
  }, [postId, user, authLoading, router, toast, form]);

  const newImageFileWatch = form.watch('newPostImageFile');

  useEffect(() => {
    let objectUrl: string | null = null;
    if (newImageFileWatch instanceof File) {
      objectUrl = URL.createObjectURL(newImageFileWatch);
      setImagePreview(objectUrl); // Show preview of newly selected file
    } else if (form.getValues('currentImageURL') && !newImageFileWatch) {
      // If no new file is selected, revert preview to the currentImageURL (or null if it was removed)
      setImagePreview(form.getValues('currentImageURL'));
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [newImageFileWatch, form]);
  
  const handleRemoveImage = () => {
    setImagePreview(null);
    form.setValue('newPostImageFile', undefined); // Clear any selected new file
    form.setValue('currentImageURL', null); // Mark that existing/new image should be removed
    const fileInput = document.getElementById('post-image-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    setImageFileError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    setImageFileError(null); // Clear previous errors
    if (fileList && fileList.length > 0) {
        const file = fileList[0];
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setImageFileError(`Max file size is ${MAX_FILE_SIZE_MB}MB.`);
            form.setValue('newPostImageFile', undefined);
            event.target.value = ''; // Reset file input
            return;
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setImageFileError('Please upload a valid image type: JPG, PNG, GIF, WebP.');
            form.setValue('newPostImageFile', undefined);
            event.target.value = ''; // Reset file input
            return;
        }
        form.setValue('newPostImageFile', fileList); // Zod transform will pick the first file
    } else {
        form.setValue('newPostImageFile', undefined);
    }
  };


  const onSubmit: SubmitHandler<EditPostFormInputs> = async (data) => {
    if (!user || !postData) {
      toast({ title: "Error", description: "User or post data missing.", variant: "destructive" });
      return;
    }
    if (imageFileError) {
        toast({ title: "Image Error", description: imageFileError, variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    const updatePayload: UpdatePostData = {
      title: data.postTitle,
      description: data.postDescription,
      codeSnippet: data.postCodeSnippet,
      tags: data.postTags as string[],
      imageURL: data.currentImageURL, // This will be null if removed, or the old URL if kept unchanged by file input
    };
    
    let newImageToUpload: File | undefined = undefined;
    if (data.newPostImageFile instanceof File) {
        newImageToUpload = data.newPostImageFile;
        // If a new image is uploaded, imageURL in updatePayload will be overridden by the server action.
        // For client-side preview consistency, it's already handled by imagePreview state.
        // The server action needs to know if a new file is present.
    }


    try {
      const result = await updatePostAction(postData.id, user.uid, updatePayload, newImageToUpload);
      if (result.success) {
        toast({ title: "Post Updated!", description: "Your post has been successfully updated." });
        router.push(`/posts/${postData.id}`);
        router.refresh(); // Ensure the page re-fetches data
      } else {
        toast({ title: "Error Updating Post", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPost || authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!postData) {
     return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Post Not Found</h2>
        <p className="text-muted-foreground">The post you are trying to edit does not exist.</p>
        <Button asChild className="mt-4">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
             <FileText className="mr-3 w-7 h-7 text-primary" /> Edit Post
          </CardTitle>
          <CardDescription>
            Update the details of your post.
            {postData.communityName && <> (Community: <strong className="text-primary">{postData.communityName}</strong> - cannot be changed)</>}
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
              
              <FormItem>
                  <FormLabel>Image (Optional)</FormLabel>
                  {imagePreview && (
                    <div className="mb-2 relative w-full max-w-xs aspect-video">
                      <NextImage src={imagePreview} alt="Post image preview" layout="fill" objectFit="contain" className="rounded-md border" data-ai-hint="post image edit preview"/>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                      <FormField
                          control={form.control}
                          name="newPostImageFile"
                           render={({ field: { ref, name, onBlur } }) => ( // Removed onChange from here
                              <FormControl>
                                  <Input 
                                  id="post-image-file-input"
                                  type="file"
                                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                  onChange={handleFileChange} // Use custom handler
                                  onBlur={onBlur}
                                  name={name}
                                  ref={ref}
                                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                  />
                              </FormControl>
                          )}
                      />
                      <UploadCloud className="text-muted-foreground" />
                  </div>
                  {imagePreview && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage} className="mt-2">
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Current Image
                    </Button>
                  )}
                  <FormDescription>Upload a new image to replace the current one, or remove it (max {MAX_FILE_SIZE_MB}MB).</FormDescription>
                  {/* Displaying Zod's schema error or custom file error for the 'newPostImageFile' field */}
                  <FormField control={form.control} name="newPostImageFile" render={() => imageFileError ? <FormMessage>{imageFileError}</FormMessage> : <FormMessage />} />

              </FormItem>

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
              
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isSubmitting || isLoadingPost || authLoading || !!imageFileError}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

