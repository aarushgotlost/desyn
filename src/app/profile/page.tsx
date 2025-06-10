
"use client"; 

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import { Edit3, Mail, Users, FileText, CalendarDays, Loader2, ThumbsUp, MessageCircle as MessageIcon } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { useRouter } from "next/navigation"; 
import { useState, useEffect } from "react"; 
import { format, formatDistanceToNowStrict } from 'date-fns';
import { getUserPosts, getUserJoinedCommunities } from "@/services/firestoreService"; 
import type { Post, Community } from "@/types/data";
import { useToast } from "@/hooks/use-toast";
import { unstable_noStore as noStore } from 'next/cache';


const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
};

export default function ProfilePage() {
  noStore(); 
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  const profileToDisplay = currentUserProfile;
  const isLoadingProfile = authLoading;


  useEffect(() => {
    async function fetchActivity() {
      if (!profileToDisplay?.uid) {
        setIsLoadingActivity(false);
        return;
      }
      setIsLoadingActivity(true);
      try {
        const [posts, communities] = await Promise.all([
          getUserPosts(profileToDisplay.uid),
          getUserJoinedCommunities(profileToDisplay.uid)
        ]);
        setUserPosts(posts);
        setJoinedCommunities(communities);
      } catch (error) {
        console.error("Error fetching user activity:", error);
        toast({ title: "Error", description: "Could not load user activity.", variant: "destructive"});
      } finally {
        setIsLoadingActivity(false);
      }
    }

    if (profileToDisplay) {
      fetchActivity();
    }
  }, [profileToDisplay, toast]);


  if (isLoadingProfile && !profileToDisplay) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!currentUser && !authLoading) { 
    router.replace('/login');
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!profileToDisplay) { 
     return <div className="text-center py-10">Profile not found.</div>;
  }
  
  const { displayName, email, photoURL, bannerURL, bio, techStack, createdAt, followersCount, followingCount } = profileToDisplay;
  const joinedDate = createdAt ? new Date(createdAt) : null; 

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        <div className="relative h-40 md:h-56">
          {bannerURL ? (
            <Image 
              src={bannerURL} 
              alt={`${displayName || 'User'}'s profile banner`} 
              layout="fill" 
              objectFit="cover" 
              priority 
              data-ai-hint="profile banner user custom"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-primary to-accent" data-ai-hint="abstract gradient default banner"></div>
          )}
        </div>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6 px-6 pb-6 border-b">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
              <AvatarImage src={photoURL || undefined} alt={displayName || "User profile picture"} data-ai-hint="profile picture user"/>
              <AvatarFallback className="text-4xl">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold font-headline">{displayName || "User Name"}</h1>
              <p className="text-muted-foreground">@{email?.split('@')[0] || 'username'}</p>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {email && <span className="flex items-center"><Mail size={14} className="mr-1.5" /> {email}</span>}
                {joinedDate && (
                    <span className="flex items-center">
                        <CalendarDays size={14} className="mr-1.5" /> 
                        Joined {format(joinedDate, 'MMMM yyyy')}
                    </span>
                )}
                 <span className="flex items-center"><Users size={14} className="mr-1.5" /> {followersCount || 0} Followers</span>
                 <span className="flex items-center"><Users size={14} className="mr-1.5" /> {followingCount || 0} Following</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-center md:self-end">
                <Button variant="outline" asChild aria-label="Edit profile">
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
                    <p className="text-foreground/80 mb-6 whitespace-pre-line">{bio}</p>
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
          <TabsTrigger value="posts" className="text-base"><FileText className="mr-2 h-5 w-5" />My Posts ({userPosts.length})</TabsTrigger>
          <TabsTrigger value="communities" className="text-base"><Users className="mr-2 h-5 w-5" />Joined Communities ({joinedCommunities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6 space-y-4">
          {isLoadingActivity ? (
             <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : userPosts.length > 0 ? userPosts.map(post => {
            const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();
            return (
              <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Link href={`/posts/${post.id}`}>
                    <CardTitle className="text-lg hover:text-primary">{post.title}</CardTitle>
                  </Link>
                  <CardDescription className="text-xs">
                    {post.communityId && post.communityName ? (
                      <>In <Link href={`/communities/${post.communityId}`} className="text-primary hover:underline">{post.communityName}</Link> &bull; </>
                    ) : "General Post &bull; "}
                     {formatDistanceToNowStrict(postCreatedAt, {addSuffix: true})}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="text-xs text-muted-foreground flex justify-between">
                  <span><ThumbsUp size={12} className="inline mr-1"/>{post.likes || 0} Likes &bull; <MessageIcon size={12} className="inline mr-1"/>{post.commentsCount || 0} Comments</span>
                </CardFooter>
              </Card>
            );
          }) : (
            <p className="text-center text-muted-foreground py-8">You haven't created any posts yet.</p>
          )}
        </TabsContent>
        <TabsContent value="communities" className="mt-6 space-y-4">
           {isLoadingActivity ? (
             <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
           ) : joinedCommunities.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {joinedCommunities.map(community => (
                <Card key={community.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 flex items-center space-x-3">
                    <Image src={community.iconURL || "https://placehold.co/40x40.png?text=Icon"} alt={`${community.name} community icon`} width={40} height={40} className="rounded-md object-cover" data-ai-hint="community logo small"/>
                    <div>
                        <Link href={`/communities/${community.id}`}>
                        <h3 className="font-semibold text-sm hover:text-primary">{community.name}</h3>
                        </Link>
                        <p className="text-xs text-muted-foreground">{community.memberCount || 0} members</p>
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>
           ) : (
            <p className="col-span-full text-center text-muted-foreground py-8">You haven't joined any communities yet.</p>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
