
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import { Mail, Users, FileText, CalendarDays, MessageSquare, Loader2, ThumbsUp, MessageCircle as MessageIcon, ArrowLeft } from "lucide-react";
import { getUserProfile, getUserPosts, getUserJoinedCommunities, isFollowing, getCurrentUserId } from "@/services/firestoreService";
import type { UserProfile as UserProfileType, Post, Community } from "@/types/data";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { unstable_noStore as noStore } from 'next/cache';
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { LikeButton } from "@/components/posts/LikeButton";
import { FollowButtonClient } from "@/components/profile/FollowButtonClient";
import { PostCardOptionsMenu } from "@/components/posts/PostCardOptionsMenu"; // For consistency if needed on their posts

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  noStore();
  const { userId: targetUserId } = params;

  const [profileToDisplay, currentUserId] = await Promise.all([
    getUserProfile(targetUserId),
    getCurrentUserId() // This will be null for now, will be hydrated by client component if needed
  ]);
  
  // Fetch current user's minimal profile for follow button actor, if logged in
  // This needs to be done carefully to avoid client-side fetches in server component if possible
  // For now, FollowButtonClient will rely on useAuth()
  // const currentUserProfileData = currentUserId ? await getUserProfile(currentUserId) : null;


  if (!profileToDisplay) {
    return (
      <div className="text-center py-20">
        <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-3">User Not Found</h1>
        <p className="text-muted-foreground mb-6">The profile you are looking for does not exist.</p>
        <Button asChild>
          <Link href="/"> <ArrowLeft className="mr-2 h-4 w-4" /> Go Home</Link>
        </Button>
      </div>
    );
  }

  const [userPosts, joinedCommunities, initialIsFollowing] = await Promise.all([
    getUserPosts(targetUserId),
    getUserJoinedCommunities(targetUserId),
    currentUserId ? isFollowing(currentUserId, targetUserId) : Promise.resolve(false)
  ]);
  
  const { displayName, email, photoURL, bannerURL, bio, techStack, createdAt, followersCount = 0, followingCount = 0 } = profileToDisplay;
  const joinedDate = createdAt ? new Date(createdAt) : null;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl bg-card">
        <div className="relative h-40 md:h-56">
          {bannerURL ? (
            <Image
              src={bannerURL}
              alt={`${displayName || 'User'}'s profile banner`}
              layout="fill"
              objectFit="cover"
              priority
              data-ai-hint="profile banner other user"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-primary/70 via-primary to-accent/70" data-ai-hint="abstract gradient default banner"></div>
          )}
        </div>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6 px-6 pb-6 border-b">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
              <AvatarImage src={photoURL || undefined} alt={displayName || "User profile picture"} data-ai-hint="profile picture other user" />
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
                <span className="flex items-center"><Users size={14} className="mr-1.5" /> {followersCount} Followers</span>
                <span className="flex items-center"><Users size={14} className="mr-1.5" /> {followingCount} Following</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-center md:self-end">
              {currentUserId && currentUserId !== targetUserId && (
                <>
                  <FollowButtonClient
                    targetUserId={targetUserId}
                    targetUserProfile={{ displayName: profileToDisplay.displayName }}
                    initialIsFollowing={initialIsFollowing}
                  />
                  <Button variant="outline" asChild>
                    <Link href={`/messages/new?userId=${targetUserId}`}>
                        <MessageSquare size={16} className="mr-2" /> Message
                    </Link>
                  </Button>
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
                    <Badge key={tech} variant="default" className="text-sm font-medium">{tech}</Badge>
                  ))}
                </div>
              </>
            )}
            {!bio && (!techStack || techStack.length === 0) && (
              <p className="text-muted-foreground text-center py-4">This user hasn't added a bio or tech stack yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 bg-muted/50">
          <TabsTrigger value="posts" className="text-base"><FileText className="mr-2 h-5 w-5" />Posts ({userPosts.length})</TabsTrigger>
          <TabsTrigger value="communities" className="text-base"><Users className="mr-2 h-5 w-5" />Joined Communities ({joinedCommunities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6 space-y-4">
          {userPosts.length > 0 ? userPosts.map(post => {
            const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();
            return (
              <Card key={post.id} className="shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out bg-card">
                 <CardContent className="p-4 relative">
                    {/* PostCardOptionsMenu might be restricted to post author only, check its logic */}
                    {currentUserId === post.authorId && (
                        <div className="absolute top-1 right-1 z-10">
                            <PostCardOptionsMenu post={post} />
                        </div>
                    )}
                    <Link href={`/posts/${post.id}`}>
                        <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-1 line-clamp-2 font-headline pr-8">{post.title}</h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mb-3">
                        {post.communityId && post.communityName ? (
                        <>Posted in <Link href={`/communities/${post.communityId}`} className="text-primary/90 hover:text-primary font-medium">{post.communityName}</Link> &bull; </>
                        ) : "General Post &bull; "}
                        {formatDistanceToNowStrict(postCreatedAt, {addSuffix: true})}
                    </p>
                    {post.description && (
                        <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                        {post.description}
                        </p>
                    )}
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="sm" showText={false} />
                        <Link href={`/posts/${post.id}#comments`} className="flex items-center text-xs hover:text-primary transition-colors">
                            <MessageIcon size={14} className="mr-1"/>
                            <span>{post.commentsCount || 0}</span>
                        </Link>
                    </div>
                 </CardContent>
              </Card>
            );
          }) : (
            <p className="text-center text-muted-foreground py-8">This user hasn't created any posts yet.</p>
          )}
        </TabsContent>
        <TabsContent value="communities" className="mt-6 space-y-4">
           {joinedCommunities.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {joinedCommunities.map(community => (
                <Card key={community.id} className="shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out bg-card">
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
            <p className="col-span-full text-center text-muted-foreground py-8">This user hasn't joined any communities yet.</p>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
