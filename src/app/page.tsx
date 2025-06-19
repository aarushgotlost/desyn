
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MessageCircle, ThumbsUp } from "lucide-react"; 
import { getRecentPosts, getCurrentUserId } from "@/services/firestoreService";
import type { Post } from "@/types/data";
import Link from "next/link";
import { formatDistanceToNowStrict } from 'date-fns';
import { LikeButton } from "@/components/posts/LikeButton";
import { unstable_noStore as noStore } from 'next/cache';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { PostCardOptionsMenu } from "@/components/posts/PostCardOptionsMenu";
import { FollowButtonClient } from "@/components/profile/FollowButtonClient";

export default async function HomePage() {
  noStore();
  const [posts, currentUserId] = await Promise.all([
    getRecentPosts(),
    getCurrentUserId()
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Home Feed</h1>
      <p className="text-muted-foreground">Recent posts from all communities.</p>
      
      {posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {posts.map((post) => {
            const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();
            return (
              <Card key={post.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out group bg-card border rounded-xl">
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-center space-x-3">
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <FollowButtonClient 
                            targetUserId={post.authorId} 
                            targetUserProfile={{ displayName: post.authorName }}
                          />
                        <p className="text-sm font-semibold text-foreground truncate">
                          <Link href={`/profile/${post.authorId}`} className="hover:text-primary transition-colors">{post.authorName}</Link>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {post.communityId && post.communityName && (
                            <>Posted in <Link href={`/communities/${post.communityId}`} className="text-primary/90 hover:text-primary font-medium">{post.communityName}</Link> &bull; </>
                        )}
                        {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                      </p>
                    </div>
                    {currentUserId === post.authorId && (
                      <div className="ml-auto flex-shrink-0">
                        <PostCardOptionsMenu post={post} />
                      </div>
                    )}
                  </div>
                </CardHeader>

                {post.imageURL && (
                  <Link href={`/posts/${post.id}`} className="block">
                    <div className="aspect-video overflow-hidden relative bg-muted border-y group-hover:opacity-95 transition-opacity">
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

                <CardContent className="p-4 sm:p-5">
                  <Link href={`/posts/${post.id}`}>
                    <CardTitle className="text-lg sm:text-xl font-bold font-headline hover:text-primary transition-colors mb-2 leading-tight group-hover:text-primary">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-foreground/80 mb-3 line-clamp-3 group-hover:text-primary/80 transition-colors">
                      {post.description}
                    </CardDescription>
                  </Link>

                  {post.codeSnippet && (
                    <pre className="bg-muted/60 p-3 rounded-md text-xs overflow-x-auto font-code mb-3 max-h-48 border">
                      <code>{post.codeSnippet.substring(0, 250)}{post.codeSnippet.length > 250 && '... (click to see more)'}</code>
                    </pre>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 mb-0">
                      {post.tags.slice(0, 4).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">{tag}</Badge>
                      ))}
                      {post.tags.length > 4 && <Badge variant="outline" className="text-xs px-2 py-0.5">+{post.tags.length - 4}</Badge>}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="p-4 sm:p-5 border-t bg-muted/20">
                  <div className="flex w-full justify-between items-center text-muted-foreground">
                    <div className="flex space-x-3">
                      <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="sm" />
                      <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-muted-foreground text-xs hover:text-primary" asChild>
                        <Link href={`/posts/${post.id}#comments`}>
                          <MessageCircle size={14} /> <span>{post.commentsCount || 0} Comments</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
         <p className="text-muted-foreground col-span-full text-center py-10">No posts found yet. Be the first to create one!</p>
      )}
    </div>
  );
}
