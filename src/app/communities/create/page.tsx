
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2 } from "lucide-react";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const communityFormSchema = z.object({
  communityName: z.string().min(3, { message: "Community name must be at least 3 characters." }).max(50, { message: "Community name must be 50 characters or less." }),
  communityIcon: z.string().url({ message: "Please enter a valid URL for the icon." }).optional().or(z.literal('')),
  communityDescription: z.string().min(10, { message: "Description must be at least 10 characters." }).max(500, { message: "Description must be 500 characters or less." }),
  communityTags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
});

type CommunityFormInputs = z.infer<typeof communityFormSchema>;

export default function CreateCommunityPage() {
  const { createCommunity, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CommunityFormInputs>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: {
      communityName: "",
      communityIcon: "",
      communityDescription: "",
      communityTags: "",
    },
  });

  const onSubmit: SubmitHandler<CommunityFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a community.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const newCommunityId = await createCommunity({
        name: data.communityName,
        iconURL: data.communityIcon,
        description: data.communityDescription,
        tags: data.communityTags as string[], // Zod transform ensures it's string[]
      });
      toast({ title: "Community Created!", description: `${data.communityName} has been successfully created.` });
      router.push(`/communities/${newCommunityId}`);
    } catch (error: any) {
      toast({
        title: "Error Creating Community",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline flex items-center">
            <PlusCircle className="mr-3 w-7 h-7 text-primary" />
            Create a New Community
          </CardTitle>
          <CardDescription>
            Build a space for developers to connect and collaborate around a specific topic or technology.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="communityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Awesome JavaScript Coders" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="communityIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Icon (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/icon.png" {...field} />
                    </FormControl>
                    <FormDescription>Provide a URL for the community icon. File upload will be added later.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="communityDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is this community about?" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="communityTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., javascript, react, frontend, webdev" {...field} />
                    </FormControl>
                    <FormDescription>Help others discover your community.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Community"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
