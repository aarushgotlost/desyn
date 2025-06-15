
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { MessageCircle, Users, PlusCircle, MessageSquareTextIcon, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { getCommunityDetails, getPostsForCommunity, getCurrentUserId } from "@/services/firestoreService"; 
import type { Community, Post } from "@/types/data";
import { formatDistanceToNowStrict } from 'date-fns';
import { CommunityJoinButton } from '@/components/communities/CommunityJoinButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityChatInterface } from "@/components/communities/CommunityChatInterface";
import { LikeButton } from "@/components/posts/LikeButton";
import { unstable_noStore as noStore } from 'next/cache';
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { PostCardOptionsMenu } from "@/components/posts/PostCardOptionsMenu";
import { FollowButtonClient } from "@/components/profile/FollowButtonClient";

export default async function CommunityPage({ params }: { params: { communityId: string } }) {
  noStore();
  const community: Community | null = await getCommunityDetails(params.communityId);
  const posts: Post[] = await getPostsForCommunity(params.communityId);
  const currentUserId = await getCurrentUserId(); 

  if (!community) {
    return <div className="text-center py-10">Community not found.</div>;
  }

  const initialIsJoined = currentUserId ? community.members?.includes(currentUserId) || false : false;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-lg bg-card">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Image 
              src={community.iconURL || "https://placehold.co/100x100.png"} 
              alt={`${community.name} community icon`} 
              width={100} 
              height={100} 
              className="rounded-xl border object-cover"
              data-ai-hint="community icon large"
            />
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold font-headline mb-1">{community.name}</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Users size={16} className="mr-1.5" /> {community.memberCount?.toLocaleString() || 0} members
              </div>
              <CardDescription className="text-base text-foreground/80 mb-3">
                {community.description}
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                {community.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-col md:items-end space-y-2 md:space-y-0 md:space-x-2 md:flex-row self-start pt-2">
              <CommunityJoinButton 
                communityId={community.id} 
                initialIsJoined={initialIsJoined} 
                memberCount={community.memberCount || 0}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts"><Users className="mr-2 h-4 w-4" />Community Posts</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquareTextIcon className="mr-2 h-4 w-4" />Community Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold font-headline">Posts</h2>
            <Button asChild>
              <Link href={`/posts/create?communityId=${community.id}`}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Post
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {posts.length > 0 ? posts.map((post) => {
              const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();
              return (
                <Card key={post.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out group bg-card">
                  <CardHeader className="p-4 md:p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3"> 
                        <Link href={`/profile/${post.authorId}`} className="flex-shrink-0"> 
                          <Avatar className="h-10 w-10 border group-hover:border-primary/30 transition-colors">
                            <AvatarImage 
                              src={post.authorAvatar || undefined} 
                              alt={post.authorName ? `${post.authorName}'s avatar` : 'User avatar'}
                              data-ai-hint="user avatar small" 
                            />
                            <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center space-x-2">
                            <p className="text-sm font-semibold text-foreground truncate">
                              <Link href={`/profile/${post.authorId}`} className="hover:text-primary transition-colors">{post.authorName}</Link>
                            </p>
                            <FollowButtonClient 
                                targetUserId={post.authorId} 
                                targetUserProfile={{ displayName: post.authorName }}
                            />
                           </div>
                          <p className="text-xs text-muted-foreground">
                             Posted {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                       {/* Post options menu - only visible to post author */}
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
                            <MessageCircle size={14} /> <span>{post.commentsCount || 0}</span>
                          </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            }) : (
              <p className="text-muted-foreground col-span-full text-center py-10">No posts in this community yet. Be the first to create one!</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="chat" className="mt-6">
           <h2 className="text-2xl font-semibold font-headline mb-4">Community Chat</h2>
          <CommunityChatInterface communityId={community.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
