
"use client"; 

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import { Edit3, Mail, Users, FileText, CalendarDays, Loader2, ThumbsUp, MessageCircle, Palette } from "lucide-react";
import { useAuth, type UserProfile as UserProfileType } from "@/contexts/AuthContext"; 
import { useRouter } from "next/navigation"; 
import { useState, useEffect } from "react"; 
import { format, formatDistanceToNowStrict } from 'date-fns';
import { getUserPosts, getUserJoinedCommunities, getUserProfile } from "@/services/firestoreService"; 
import type { Post, Community } from "@/types/data";
import { useToast } from "@/hooks/use-toast";
import { unstable_noStore as noStore } from 'next/cache';
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { LikeButton } from "@/components/posts/LikeButton";
import { PostCardOptionsMenu } from "@/components/posts/PostCardOptionsMenu";

export default function ProfilePage() {
  noStore(); 
  const { user: currentUser, loading: authLoadingFromContext } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayedProfile, setDisplayedProfile] = useState<UserProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); 
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    async function fetchProfileData() {
      if (authLoadingFromContext) return; 

      if (!currentUser?.uid) {
        setIsLoadingProfile(false);
        router.replace('/login'); 
        return;
      }

      setIsLoadingProfile(true);
      try {
        const profile = await getUserProfile(currentUser.uid); 
        if (profile) {
          setDisplayedProfile(profile);
        } else {
          toast({ title: "Error", description: "Could not load your profile. Please try logging in again.", variant: "destructive"});
          router.replace('/login');
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({ title: "Error", description: "Could not load your profile.", variant: "destructive"});
      } finally {
        setIsLoadingProfile(false);
      }
    }
    
    fetchProfileData();

  }, [currentUser, authLoadingFromContext, router, toast]);


  useEffect(() => {
    async function fetchActivity() {
      if (!displayedProfile?.uid) {
        setIsLoadingActivity(false);
        return;
      }
      setIsLoadingActivity(true);
      try {
        const [posts, communities] = await Promise.all([
          getUserPosts(displayedProfile.uid),
          getUserJoinedCommunities(displayedProfile.uid)
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

    if (displayedProfile) {
      fetchActivity();
    }
  }, [displayedProfile, toast]);


  if (isLoadingProfile || authLoadingFromContext) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!currentUser && !authLoadingFromContext) { 
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><p>Redirecting to login...</p><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!displayedProfile) { 
     return (
        <div className="text-center py-10">
            <p>Could not load profile details. You might need to log in again.</p>
            <Button onClick={() => router.push('/login')} className="mt-2">Login</Button>
        </div>
    );
  }
  
  const { displayName, email, photoURL, bannerURL, bio, skills, createdAt, followersCount, followingCount } = displayedProfile;
  const joinedDate = createdAt ? new Date(createdAt) : null; 

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl bg-card border rounded-xl">
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
            <div className="h-full w-full bg-gradient-to-r from-primary/70 via-primary to-accent/70" data-ai-hint="abstract gradient default banner"></div>
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

            {skills && skills.length > 0 && (
                <>
                    <h2 className="text-lg font-semibold mb-2 flex items-center"><Palette size={20} className="mr-2 text-primary"/>Skills / Tools</h2>
                    <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                        <Badge key={skill} variant="default" className="text-sm font-medium">{skill}</Badge>
                    ))}
                    </div>
                </>
            )}
             {!bio && (!skills || skills.length === 0) && (
                <p className="text-muted-foreground text-center py-4">No bio or skills added yet. <Link href="/onboarding/profile-setup" className="text-primary hover:underline">Complete your profile!</Link></p>
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
              <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out group bg-card border rounded-lg">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/posts/${post.id}`} className="flex-grow min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2 font-headline leading-tight">
                        {post.title}
                      </h3>
                    </Link>
                    <div className="flex-shrink-0 ml-2">
                      <PostCardOptionsMenu post={post} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {post.communityId && post.communityName ? (
                      <>In <Link href={`/communities/${post.communityId}`} className="text-primary/90 hover:text-primary font-medium">{post.communityName}</Link> &bull; </>
                    ) : "General &bull; "}
                     {formatDistanceToNowStrict(postCreatedAt, {addSuffix: true})}
                  </p>
                  {post.description && (
                    <Link href={`/posts/${post.id}`}>
                        <p className="text-sm text-foreground/70 mb-3 line-clamp-2 group-hover:text-primary/70 transition-colors">
                        {post.description}
                        </p>
                    </Link>
                  )}
                  {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 mb-3">
                          {post.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">{tag}</Badge>
                          ))}
                      </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground border-t pt-3 mt-3">
                    <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="sm" showText={false} />
                    <Link href={`/posts/${post.id}#comments`} className="flex items-center text-xs hover:text-primary transition-colors">
                        <MessageCircle size={14} className="mr-1"/>
                        <span>{post.commentsCount || 0}</span>
                    </Link>
                  </div>
                </CardContent>
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
                <Card key={community.id} className="shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out bg-card border rounded-lg">
                    <CardContent className="p-4 flex items-center space-x-3">
                    <Image src={community.iconURL || "https://placehold.co/40x40.png"} alt={`${community.name} community icon`} width={40} height={40} className="rounded-md object-cover" data-ai-hint="community logo small"/>
                    <div>
                        <Link href={`/communities/${community.id}`}>
                        <h3 className="font-semibold text-sm hover:text-primary transition-colors">{community.name}</h3>
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
