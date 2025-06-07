
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Image as ImageIcon, Code2, Loader2 } from "lucide-react";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Mock communities for the select dropdown - In a real app, fetch this
const mockUserCommunities = [
  { id: "1", name: "Next.js Developers" },
  { id: "2", name: "Firebase Experts" },
  { id: "3", name: "Frontend Wizards" },
  // Add more or fetch dynamically
];

const postFormSchema = z.object({
  postTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(150, {message: "Title must be 150 characters or less."}),
  communityId: z.string().min(1, { message: "Please select a community." }),
  postDescription: z.string().min(10, { message: "Description must be at least 10 characters." }),
  postCodeSnippet: z.string().optional(),
  postImageURL: z.string().url({ message: "Please enter a valid URL for the image." }).optional().or(z.literal('')),
  postTags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
});

type PostFormInputs = z.infer<typeof postFormSchema>;

export default function CreatePostPage() {
  const { createPost, user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | undefined>();

  // TODO: In a real app, fetch user's communities or all communities
  // For now, using mockUserCommunities

  const form = useForm<PostFormInputs>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      postTitle: "",
      communityId: "",
      postDescription: "",
      postCodeSnippet: "",
      postImageURL: "",
      postTags: "",
    },
  });

   const handleCommunityChange = (communityId: string) => {
    form.setValue("communityId", communityId);
    const community = mockUserCommunities.find(c => c.id === communityId);
    setSelectedCommunityName(community?.name);
  };

  const onSubmit: SubmitHandler<PostFormInputs> = async (data) => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a post.", variant: "destructive" });
      return;
    }
    if (!selectedCommunityName) {
      toast({ title: "Community Error", description: "Selected community name not found.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const newPostId = await createPost({
        title: data.postTitle,
        communityId: data.communityId,
        communityName: selectedCommunityName, // Pass the name
        description: data.postDescription,
        codeSnippet: data.postCodeSnippet,
        imageURL: data.postImageURL,
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
      setIsLoading(false);
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
                    <Select onValueChange={handleCommunityChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a community to post in" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockUserCommunities.map(community => (
                          <SelectItem key={community.id} value={community.id}>{community.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Choose one of your joined communities.</FormDescription>
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
                      <Textarea placeholder="```javascript\nconsole.log('Hello DevConnect!');\n```" rows={6} className="font-code" {...field} />
                    </FormControl>
                    <FormDescription>Use markdown for code blocks.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="postImageURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input placeholder="https://example.com/image.png" {...field} />
                        <ImageIcon className="text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormDescription>Provide a URL for an image related to your post. File upload will be added later.</FormDescription>
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
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Code2 className="mr-2 h-4 w-4" /> Publish Post</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
