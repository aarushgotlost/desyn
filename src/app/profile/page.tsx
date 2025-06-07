
"use client"; 

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import { Edit3, Mail, Users, FileText, Settings, CalendarDays, Link2, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"; 
import { useRouter } from "next/navigation"; 
import { useState, useEffect } from "react"; 
import { format } from 'date-fns';

// Mock data for posts and communities - replace with actual data fetching later
const mockUserActivity = {
   joinedCommunities: [
    { id: "1", name: "Next.js Enthusiasts", icon: "https://placehold.co/40x40.png", iconHint: "community logo" },
    { id: "2", name: "Firebase Experts", icon: "https://placehold.co/40x40.png", iconHint: "community logo" },
  ],
  createdPosts: [
    { id: "p1", title: "Mastering Server Components in Next.js 14", community: "Next.js Enthusiasts", date: "5 days ago", likes: 55, comments: 8 },
    { id: "p2", title: "Optimizing Firestore Queries", community: "Firebase Experts", date: "2 week ago", likes: 122, comments: 25 },
  ],
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
};

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user || !userProfile) {
    // This should ideally be caught by AuthGuard, but as a fallback
    router.replace('/login');
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  const { displayName, email, photoURL, bio, techStack, createdAt } = userProfile;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        <div className="relative h-40 md:h-56 bg-gradient-to-r from-primary to-accent">
           {/* Optional: Cover Image can be added here later */}
        </div>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6 px-6 pb-6 border-b">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
              <AvatarImage src={photoURL || undefined} alt={displayName || "User"} data-ai-hint="profile picture"/>
              <AvatarFallback className="text-4xl">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold font-headline">{displayName || "User Name"}</h1>
              <p className="text-muted-foreground">@{user.email?.split('@')[0] || 'username'}</p> {/* Placeholder username */}
              <div className="mt-1 flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {email && <span className="flex items-center"><Mail size={14} className="mr-1" /> {email}</span>}
                {createdAt && (
                    <span className="flex items-center">
                        <CalendarDays size={14} className="mr-1" /> 
                        Joined {format(createdAt.toDate ? createdAt.toDate() : new Date(createdAt as any), 'MMMM yyyy')}
                    </span>
                )}
                {/* Add website link here if available in UserProfile */}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-center md:self-end">
                <Button variant="outline" asChild>
                  <Link href="/onboarding/profile-setup"> 
                    <Edit3 size={16} className="mr-2" /> Edit Profile
                  </Link>
                </Button>
            </div>
          </div>
          
          <div className="p-6">
            {bio && (
                <>
                    <h2 className="text-lg font-semibold mb-1">Bio</h2>
                    <p className="text-foreground/80 mb-6">{bio}</p>
                </>
            )}

            {techStack && techStack.length > 0 && (
                <>
                    <h2 className="text-lg font-semibold mb-2">Tech Stack</h2>
                    <div className="flex flex-wrap gap-2">
                    {techStack.map(tech => (
                        <span key={tech} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">{tech}</span>
                    ))}
                    </div>
                </>
            )}
             {!bio && (!techStack || techStack.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No bio or tech stack added yet. <Link href="/onboarding/profile-setup" className="text-primary hover:underline">Complete your profile!</Link></p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 bg-muted/50">
          <TabsTrigger value="posts" className="text-base"><FileText className="mr-2 h-5 w-5" />My Posts</TabsTrigger>
          <TabsTrigger value="communities" className="text-base"><Users className="mr-2 h-5 w-5" />Joined Communities</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6 space-y-4">
          {/* Replace with actual post fetching logic for the current user */}
          {mockUserActivity.createdPosts.length > 0 ? mockUserActivity.createdPosts.map(post => (
            <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Link href={`/posts/${post.id}`}>
                  <CardTitle className="text-lg hover:text-primary">{post.title}</CardTitle>
                </Link>
                <CardDescription className="text-xs">
                  In <Link href={`/communities/${post.community.toLowerCase().replace(/\s+/g, '-')}`} className="text-primary hover:underline">{post.community}</Link> &bull; {post.date}
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">
                <span>{post.likes} Likes &bull; {post.comments} Comments</span>
              </CardFooter>
            </Card>
          )) : (
            <p className="text-center text-muted-foreground py-8">You haven't created any posts yet.</p>
          )}
        </TabsContent>
        <TabsContent value="communities" className="mt-6 space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Replace with actual community fetching logic for the current user */}
            {mockUserActivity.joinedCommunities.length > 0 ? mockUserActivity.joinedCommunities.map(community => (
              <Card key={community.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 flex items-center space-x-3">
                  <Image src={community.icon} alt={community.name} width={40} height={40} className="rounded-md" data-ai-hint={community.iconHint}/>
                  <div>
                    <Link href={`/communities/${community.id}`}>
                      <h3 className="font-semibold text-sm hover:text-primary">{community.name}</h3>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="col-span-full text-center text-muted-foreground py-8">You haven't joined any communities yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
