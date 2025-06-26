
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, UploadCloud } from "lucide-react";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const MAX_FILE_SIZE_MB = 2;
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

const communityFormSchema = z.object({
  communityName: z.string().min(3, { message: "Community name must be at least 3 characters." }).max(50, { message: "Community name must be 50 characters or less." }),
  communityIconFile: imageFileSchema,
  communityDescription: z.string().min(10, { message: "Description must be at least 10 characters." }).max(500, { message: "Description must be 500 characters or less." }),
  communityTags: z.string().optional().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []),
});

type CommunityFormInputs = z.infer<typeof communityFormSchema>;

export default function CreateCommunityPage() {
  const { createCommunity, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const form = useForm<CommunityFormInputs>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: {
      communityName: "",
      communityIconFile: undefined,
      communityDescription: "",
      communityTags: "",
    },
  });

  const iconFileWatch = form.watch('communityIconFile');

  useEffect(() => {
    let objectUrl: string | null = null;
    if (iconFileWatch instanceof File) {
      objectUrl = URL.createObjectURL(iconFileWatch);
      setIconPreview(objectUrl);
    } else {
      setIconPreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [iconFileWatch]);

  const onSubmit: SubmitHandler<CommunityFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a community.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newCommunityId = await createCommunity({
        name: data.communityName,
        iconFile: data.communityIconFile, 
        description: data.communityDescription,
        tags: data.communityTags as string[],
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
      setIsSubmitting(false);
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
            Build a space for animators and developers to connect and collaborate around a specific tool, style, or project.
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
                      <Input placeholder="e.g., Indie Animators Hub, JavaScript Animation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="communityIconFile"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                  <FormItem>
                    <FormLabel>Community Icon (Optional)</FormLabel>
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
                        />
                        <UploadCloud className="text-muted-foreground" />
                      </div>
                    </FormControl>
                    {iconPreview && (
                      <Image src={iconPreview} alt="Community icon preview" width={80} height={80} className="mt-2 rounded-md object-cover border" data-ai-hint="community icon preview" />
                    )}
                    <FormDescription>Upload an icon for your community (max {MAX_FILE_SIZE_MB}MB).</FormDescription>
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
                      <Textarea placeholder="What is this community about? Who is it for?" rows={4} {...field} />
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
                      <Input placeholder="e.g., 2d animation, gamedev, javascript, character design" {...field} />
                    </FormControl>
                    <FormDescription>Help others discover your community.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Community"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
