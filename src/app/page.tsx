
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MessageCircle, ThumbsUp } from "lucide-react"; 
import { getRecentPosts } from "@/services/firestoreService";
import type { Post } from "@/types/data";
import Link from "next/link";
import { formatDistanceToNowStrict } from 'date-fns';
import { LikeButton } from "@/components/posts/LikeButton";
import { unstable_noStore as noStore } from 'next/cache';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";


export default async function HomePage() {
  noStore();
  const posts: Post[] = await getRecentPosts();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Home Feed</h1>
      <p className="text-muted-foreground">Recent posts from all communities.</p>
      
      {posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {posts.map((post) => {
            const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();
            return (
              <Card key={post.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out group bg-card">
                <CardHeader className="p-4 md:p-5">
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        <Link href={`/profile/${post.authorId}`} className="hover:text-primary transition-colors">{post.authorName}</Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.communityId && post.communityName && (
                            <>Posted in <Link href={`/communities/${post.communityId}`} className="text-primary/90 hover:text-primary font-medium">{post.communityName}</Link> &bull; </>
                        )}
                        {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-5 pt-0">
                  <Link href={`/posts/${post.id}`}>
                    <h2 className="text-xl lg:text-2xl font-bold font-headline hover:text-primary transition-colors mb-3 leading-tight">
                      {post.title}
                    </h2>
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
                    <p className="text-sm text-foreground/80 mb-3.5 line-clamp-3 hover:text-primary/80 transition-colors">
                      {post.description}
                    </p>
                  </Link>
                  {post.codeSnippet && (
                    <pre className="bg-muted/70 p-3 rounded-md text-xs overflow-x-auto font-code mb-3.5 max-h-40">
                      <code>{post.codeSnippet.substring(0, 200)}{post.codeSnippet.length > 200 && '...'}</code>
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
          })}
        </div>
      ) : (
         <p className="text-muted-foreground col-span-full text-center py-10">No posts found yet. Be the first to create one!</p>
      )}
    </div>
  );
}
