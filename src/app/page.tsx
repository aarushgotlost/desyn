
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MessageCircle, ThumbsUp, CheckCircle } from "lucide-react";
import { getRecentPosts } from "@/services/firestoreService";
import type { Post } from "@/types/data";
import Link from "next/link";
import { formatDistanceToNowStrict } from 'date-fns';

export default async function HomePage() {
  const posts: Post[] = await getRecentPosts();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Home Feed</h1>
      <p className="text-muted-foreground">Recent posts from all communities.</p> {/* TODO: Filter by joined communities */}
      
      {posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                    <Link href={`/posts/${post.id}`}>
                      <CardTitle className="text-xl font-headline hover:text-primary">{post.title}</CardTitle>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Posted by {post.authorName} in <Link href={`/communities/${post.communityId}`} className="text-primary hover:underline">{post.communityName}</Link> &bull; {post.createdAt ? formatDistanceToNowStrict(post.createdAt, { addSuffix: true }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {post.imageURL && (
                  <div className="mb-4 overflow-hidden rounded-md">
                    <Image 
                      src={post.imageURL} 
                      alt={post.title} 
                      width={600} 
                      height={400} 
                      className="w-full h-auto object-cover"
                      data-ai-hint="post image"
                    />
                  </div>
                )}
                <CardDescription className="mb-4 text-foreground/80">
                  {post.description}
                </CardDescription>
                {post.codeSnippet && (
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto font-code mb-4">
                    <code>{post.codeSnippet}</code>
                  </pre>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="flex space-x-4 text-muted-foreground">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1" disabled> {/* Like functionality pending */}
                    <ThumbsUp size={16} /> <span>{post.likes} Likes</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1" disabled> {/* Comment functionality pending */}
                    <MessageCircle size={16} /> <span>{post.commentsCount} Comments</span>
                  </Button>
                </div>
                {post.isSolved ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle size={16} className="mr-1" /> Solved
                  </div>
                ) : (
                  <Button variant="outline" size="sm" disabled> {/* Mark as solved functionality pending */}
                    Mark as Solved
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
         <p className="text-muted-foreground col-span-full text-center py-10">No posts found yet. Be the first to create one!</p>
      )}
       {/* Placeholder for pagination or "load more" */}
       {/* <div className="text-center mt-8">
        <Button variant="outline">Load More Posts</Button>
      </div> */}
    </div>
  );
}
