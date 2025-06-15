
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
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
import { PostCardOptionsMenu } from "@/components/posts/PostCardOptionsMenu";

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  noStore();
  const { userId: targetUserId } = params;

  const [profileToDisplay, currentUserId] = await Promise.all([
    getUserProfile(targetUserId),
    getCurrentUserId()
  ]);
  
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
                    targetUserProfile={{ displayName: profileToDisplay.displayName || '' }}
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
        <TabsContent value="posts" className="mt-6 space-y-6">
          {userPosts.length > 0 ? userPosts.map(post => {
            const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();
            return (
              <Card key={post.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out group bg-card">
                <CardHeader className="p-4 md:p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <Link href={`/profile/${profileToDisplay.uid}`} className="flex-shrink-0">
                        <Avatar className="h-10 w-10 border group-hover:border-primary/30 transition-colors">
                          <AvatarImage
                            src={profileToDisplay.photoURL || undefined}
                            alt={profileToDisplay.displayName ? `${profileToDisplay.displayName}'s avatar` : 'User avatar'}
                            data-ai-hint="user avatar small"
                          />
                          <AvatarFallback>{getInitials(profileToDisplay.displayName)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            <Link href={`/profile/${profileToDisplay.uid}`} className="hover:text-primary transition-colors">
                              {profileToDisplay.displayName}
                            </Link>
                          </p>
                          {/* Follow button for the profile owner (author of these posts) */}
                          {currentUserId && profileToDisplay.uid !== currentUserId && (
                            <FollowButtonClient
                              targetUserId={profileToDisplay.uid} 
                              targetUserProfile={{ displayName: profileToDisplay.displayName || '' }}
                              initialIsFollowing={initialIsFollowing} 
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Posted {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                          {post.communityId && post.communityName && (
                            <> &bull; in <Link href={`/communities/${post.communityId}`} className="text-primary/90 hover:text-primary font-medium">{post.communityName}</Link></>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* PostCardOptionsMenu for the post itself. Visible if current user is the author of the post. */}
                    {currentUserId === post.authorId && ( 
                      <div>
                        <PostCardOptionsMenu post={post} />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5 pt-0">
                  <Link href={`/posts/${post.id}`}>
                    <CardTitle className="text-xl lg:text-2xl font-bold font-headline hover:text-primary transition-colors mb-3 leading-tight">
                      {post.title}
                    </CardTitle>
                  </Link>
                  {post.imageURL && (
                    <Link href={`/posts/${post.id}`} className="block mb-3">
                      <div className="overflow-hidden rounded-md aspect-video relative border group-hover:opacity-90 transition-opacity">
                        <Image
                          src={post.imageURL}
                          alt={post.title || "Post image"}
                          layout="fill"
                          objectFit="cover"
                          className="transition-transform duration-300 group-hover:scale-105"
                          data-ai-hint="post image content"
                        />
                      </div>
                    </Link>
                  )}
                   <Link href={`/posts/${post.id}`}>
                    <CardDescription className="text-sm text-foreground/80 mb-3.5 line-clamp-3 hover:text-primary/80 transition-colors">
                      {post.description}
                    </CardDescription>
                  </Link>
                  {post.codeSnippet && (
                    <pre className="bg-muted/70 p-3 rounded-md text-xs overflow-x-auto font-code mb-3.5 max-h-40">
                        <code>{post.codeSnippet.substring(0,200)}{post.codeSnippet.length > 200 && '...'}</code>
                    </pre>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3.5">
                      {post.tags.slice(0, 5).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 md:p-5 pt-0 flex justify-between items-center border-t">
                  <div className="flex space-x-2 text-muted-foreground">
                    <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="sm" />
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-muted-foreground text-xs" asChild>
                        <Link href={`/posts/${post.id}#comments`}>
                        <MessageIcon size={14} /> <span>{post.commentsCount || 0}</span>
                        </Link>
                    </Button>
                  </div>
                </CardFooter>
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
    
