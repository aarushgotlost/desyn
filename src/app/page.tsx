
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MessageCircle } from "lucide-react"; 
import { getRecentPosts } from "@/services/firestoreService";
import type { Post } from "@/types/data";
import Link from "next/link";
import { formatDistanceToNowStrict } from 'date-fns';
import { LikeButton } from "@/components/posts/LikeButton";
import { unstable_noStore as noStore } from 'next/cache';


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
              <Card key={post.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    <Link href={`/profile/${post.authorId}`} className="flex-shrink-0"> 
                      <Image 
                        src={post.authorAvatar || "https://placehold.co/40x40.png?text=User"} 
                        alt={post.authorName ? `${post.authorName}'s avatar` : 'User avatar'}
                        width={40} 
                        height={40} 
                        className="rounded-full object-cover"
                        data-ai-hint="user avatar small"
                      />
                    </Link>
                    <div>
                      <Link href={`/posts/${post.id}`}>
                        <CardTitle className="text-xl font-headline hover:text-primary">{post.title}</CardTitle>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Posted by <Link href={`/profile/${post.authorId}`} className="hover:text-primary font-medium">{post.authorName}</Link> in <Link href={`/communities/${post.communityId}`} className="text-primary hover:underline">{post.communityName}</Link> &bull; {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.imageURL && (
                    <div className="mb-4 overflow-hidden rounded-md">
                      <Link href={`/posts/${post.id}`}>
                        <Image 
                          src={post.imageURL} 
                          alt={post.title || "Post image"}
                          width={600} 
                          height={400} 
                          className="w-full h-auto object-cover"
                          data-ai-hint="post image content"
                        />
                      </Link>
                    </div>
                  )}
                  <CardDescription className="mb-4 text-foreground/80">
                     <Link href={`/posts/${post.id}`} className="hover:text-primary/80">
                        {post.description.substring(0, 200)}{post.description.length > 200 && '...'}
                     </Link>
                  </CardDescription>
                  {post.codeSnippet && (
                    <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto font-code mb-4">
                      <code>{post.codeSnippet.substring(0, 150)}{post.codeSnippet.length > 150 && '...'}</code>
                    </pre>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex space-x-2 text-muted-foreground">
                    <LikeButton postId={post.id} initialLikesCount={post.likes || 0} />
                    <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-muted-foreground text-xs" asChild>
                       <Link href={`/posts/${post.id}#comments`}>
                         <MessageCircle size={14} /> <span>{post.commentsCount || 0} Comments</span>
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
