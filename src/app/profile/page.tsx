
"use client"; 

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import { Edit3, Mail, Users, FileText, CalendarDays, Loader2, UserPlus, Check, ThumbsUp, MessageCircle as MessageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext"; 
import { useRouter } from "next/navigation"; 
import { useState, useEffect } from "react"; 
import { format, formatDistanceToNowStrict } from 'date-fns';
import { getUserPosts, getUserJoinedCommunities, isFollowing as checkIsFollowing } from "@/services/firestoreService";
import { followUser, unfollowUser } from "@/actions/userActions";
import type { Post, Community } from "@/types/data";
import { useToast } from "@/hooks/use-toast";


const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
};

// This page currently shows the logged-in user's own profile.
// A dynamic route /profile/[userId] would be needed for viewing other users' profiles.
// The follow button logic is included as a placeholder for that future page.
interface ProfilePageProps {
  // params?: { userId?: string }; // For a future dynamic route
}

export default function ProfilePage({ /* params */ }: ProfilePageProps) {
  const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // const targetUserId = params?.userId; // For future dynamic profile page
  // const isOwnProfile = !targetUserId || targetUserId === currentUser?.uid;
  const isOwnProfile = true; // For now, this page is always the current user's profile

  // const [profileToDisplay, setProfileToDisplay] = useState<UserProfile | null>(null);
  // const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  // const [isFollowingUser, setIsFollowingUser] = useState(false);
  // const [isFollowPending, setIsFollowPending] = useState(false);

  // For this page, we use currentUserProfile directly
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

  // Follow logic would be relevant for /profile/[userId]
  /*
  useEffect(() => {
    async function checkFollowStatus() {
      if (!isOwnProfile && currentUser && targetUserId) {
        const following = await checkIsFollowing(currentUser.uid, targetUserId);
        setIsFollowingUser(following);
      }
    }
    if (profileToDisplay) {
      checkFollowStatus();
    }
  }, [currentUser, targetUserId, isOwnProfile, profileToDisplay]);

  const handleFollowToggle = async () => {
    if (!currentUser || !targetUserId || isOwnProfile) return;
    setIsFollowPending(true);
    try {
      let result;
      if (isFollowingUser) {
        result = await unfollowUser(currentUser.uid, targetUserId);
      } else {
        result = await followUser(currentUser.uid, targetUserId);
      }
      if (result.success) {
        setIsFollowingUser(!isFollowingUser);
        // Optimistically update counts or re-fetch profileToDisplay for updated counts
        setProfileToDisplay(prev => prev ? ({
            ...prev,
            followersCount: isFollowingUser ? (prev.followersCount || 1) - 1 : (prev.followersCount || 0) + 1
        }) : null);
        toast({ title: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not perform action.", variant: "destructive" });
    } finally {
      setIsFollowPending(false);
    }
  };
  */

  if (isLoadingProfile && !profileToDisplay) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!currentUser && !authLoading) { // If not loading and no user, redirect
    router.replace('/login');
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!profileToDisplay) { // Should be covered by above, but as a fallback
     return <div className="text-center py-10">Profile not found.</div>;
  }
  
  const { displayName, email, photoURL, bio, techStack, createdAt, followersCount, followingCount } = profileToDisplay;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        <div className="relative h-40 md:h-56 bg-gradient-to-r from-primary to-accent">
        </div>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6 px-6 pb-6 border-b">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
              <AvatarImage src={photoURL || undefined} alt={displayName || "User"} data-ai-hint="profile picture"/>
              <AvatarFallback className="text-4xl">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold font-headline">{displayName || "User Name"}</h1>
              <p className="text-muted-foreground">@{email?.split('@')[0] || 'username'}</p>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {email && <span className="flex items-center"><Mail size={14} className="mr-1.5" /> {email}</span>}
                {createdAt && (
                    <span className="flex items-center">
                        <CalendarDays size={14} className="mr-1.5" /> 
                        Joined {format(createdAt instanceof Date ? createdAt : (createdAt as Timestamp).toDate(), 'MMMM yyyy')}
                    </span>
                )}
                 <span className="flex items-center"><Users size={14} className="mr-1.5" /> {followersCount || 0} Followers</span>
                 <span className="flex items-center"><Users size={14} className="mr-1.5" /> {followingCount || 0} Following</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-center md:self-end">
                {isOwnProfile ? (
                    <Button variant="outline" asChild>
                    <Link href="/onboarding/profile-setup"> 
                        <Edit3 size={16} className="mr-2" /> Edit Profile
                    </Link>
                    </Button>
                ) : (
                  <>
                    {/* <Button variant={isFollowingUser ? "outline" : "default"} onClick={handleFollowToggle} disabled={isFollowPending || !currentUser}>
                        {isFollowPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isFollowingUser ? <Check className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        {isFollowPending ? "Processing..." : isFollowingUser ? "Following" : "Follow"}
                    </Button> */}
                    {/* Placeholder for Message button to other users */}
                    {/* <Button variant="outline"> Message </Button> */}
                  </>
                )}
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
             {!bio && (!techStack || techStack.length === 0) && isOwnProfile && (
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
          ) : userPosts.length > 0 ? userPosts.map(post => (
            <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Link href={`/posts/${post.id}`}>
                  <CardTitle className="text-lg hover:text-primary">{post.title}</CardTitle>
                </Link>
                <CardDescription className="text-xs">
                  In <Link href={`/communities/${post.communityId}`} className="text-primary hover:underline">{post.communityName}</Link> &bull; {post.createdAt ? formatDistanceToNowStrict(post.createdAt instanceof Date ? post.createdAt : (post.createdAt as Timestamp).toDate(), {addSuffix: true}) : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground flex justify-between">
                <span><ThumbsUp size={12} className="inline mr-1"/>{post.likes || 0} Likes &bull; <MessageIcon size={12} className="inline mr-1"/>{post.commentsCount || 0} Comments</span>
                {post.isSolved && <span className="text-green-600 flex items-center"><Check size={14} className="mr-1"/>Solved</span>}
              </CardFooter>
            </Card>
          )) : (
            <p className="text-center text-muted-foreground py-8">{isOwnProfile ? "You haven't created any posts yet." : "This user hasn't created any posts yet."}</p>
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
                    <Image src={community.iconURL || "https://placehold.co/40x40.png?text=N/A"} alt={community.name} width={40} height={40} className="rounded-md object-cover" data-ai-hint="community logo"/>
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
            <p className="col-span-full text-center text-muted-foreground py-8">{isOwnProfile ? "You haven't joined any communities yet." : "This user hasn't joined any communities yet."}</p>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

    