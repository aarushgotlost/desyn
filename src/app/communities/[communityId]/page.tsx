
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { MessageCircle, ThumbsUp, CheckCircle, Users, PlusCircle, MessageSquareTextIcon } from "lucide-react";
import Link from "next/link";
import { getCommunityDetails, getPostsForCommunity, getCurrentUserId } from "@/services/firestoreService"; 
import type { Community, Post } from "@/types/data";
import { formatDistanceToNowStrict } from 'date-fns';
import { CommunityJoinButton } from '@/components/communities/CommunityJoinButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityChatInterface } from "@/components/communities/CommunityChatInterface";
import { PostCard } from '@/components/posts/PostCard'; // Assuming you'll create/use this

export default async function CommunityPage({ params }: { params: { communityId: string } }) {
  const community: Community | null = await getCommunityDetails(params.communityId);
  const posts: Post[] = await getPostsForCommunity(params.communityId);
  const currentUserId = await getCurrentUserId(); // This is a placeholder

  if (!community) {
    return <div className="text-center py-10">Community not found.</div>;
  }

  const initialIsJoined = currentUserId ? community.members?.includes(currentUserId) || false : false;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Image 
              src={community.iconURL || "https://placehold.co/100x100.png?text=No+Icon"} 
              alt={`${community.name} icon`} 
              width={100} 
              height={100} 
              className="rounded-xl border object-cover"
              data-ai-hint="community logo"
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
                  <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{tag}</span>
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
            {posts.length > 0 ? posts.map((post) => (
                // Using PostCard directly here for brevity
                <Card key={post.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                        <div className="flex items-center space-x-3 mb-2">
                        <Image 
                            src={post.authorAvatar || "https://placehold.co/40x40.png?text=N/A"} 
                            alt={post.authorName} 
                            width={40} 
                            height={40} 
                            className="rounded-full object-cover"
                            data-ai-hint="profile avatar"
                        />
                        <div>
                            <CardTitle className="text-lg font-headline hover:text-primary">
                            <Link href={`/posts/${post.id}`}>{post.title}</Link>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                            Posted by {post.authorName} &bull; {post.createdAt ? formatDistanceToNowStrict(new Date(post.createdAt as any), { addSuffix: true }) : 'N/A'}
                            </p>
                        </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {post.imageURL && (
                        <div className="mb-3 overflow-hidden rounded-md">
                            <Image 
                            src={post.imageURL} 
                            alt={post.title} 
                            width={600} 
                            height={300} 
                            className="w-full h-auto object-cover" 
                            data-ai-hint="post image"
                            />
                        </div>
                        )}
                        <CardDescription className="mb-3 text-foreground/80 text-sm">
                        {post.description.substring(0,150)}{post.description.length > 150 && '...'}
                        </CardDescription>
                        {post.codeSnippet && (
                        <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto font-code mb-3">
                            <code>{post.codeSnippet.substring(0,100)}{post.codeSnippet.length > 100 && '...'}</code>
                        </pre>
                        )}
                        <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map(tag => (
                            <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <div className="flex space-x-3 text-muted-foreground">
                        {/* LikeButton would go here, passing postId and initialLikesCount */}
                        <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-xs" disabled> 
                            <ThumbsUp size={14} /> <span>{post.likes || 0}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-xs" asChild>
                           <Link href={`/posts/${post.id}#comments`}>
                             <MessageCircle size={14} /> <span>{post.commentsCount || 0}</span>
                           </Link>
                        </Button>
                        </div>
                        {/* MarkAsSolvedButton would go here */}
                         {post.isSolved ? (
                            <div className="flex items-center text-green-600 text-xs">
                            <CheckCircle size={14} className="mr-1" /> Solved
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" className="text-xs" disabled>
                            Mark as Solved
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )) : (
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
