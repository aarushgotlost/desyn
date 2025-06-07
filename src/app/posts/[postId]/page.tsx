
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getPostDetails } from "@/services/firestoreService"; 
import type { Post } from "@/types/data";
import { formatDistanceToNowStrict } from 'date-fns';
import { LikeButton } from "@/components/posts/LikeButton";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { unstable_noStore as noStore } from 'next/cache';


export default async function PostDetailsPage({ params }: { params: { postId: string } }) {
  noStore(); 
  const post: Post | null = await getPostDetails(params.postId);

  if (!post) {
    return <div className="text-center py-10">Post not found.</div>;
  }

  const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader>
          <div className="mb-3">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="mr-2 mb-1">{tag}</Badge>
            ))}
          </div>
          <CardTitle className="text-3xl lg:text-4xl font-bold font-headline">{post.title}</CardTitle>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
            <Link href={`/profile/${post.authorId}`} className="flex items-center space-x-2 hover:text-primary"> 
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={post.authorAvatar || undefined} 
                  alt={post.authorName ? `${post.authorName}'s avatar` : 'User avatar'}
                  data-ai-hint="user avatar small"
                />
                <AvatarFallback>{post.authorName?.substring(0,1).toUpperCase() || 'A'}</AvatarFallback>
              </Avatar>
              <span>{post.authorName}</span>
            </Link>
            <span>&bull;</span>
            <span>Posted in <Link href={`/communities/${post.communityId}`} className="hover:text-primary">{post.communityName}</Link></span>
            <span>&bull;</span>
            <span>{formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}</span>
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none space-y-6">
          {post.imageURL && (
            <div className="my-6 overflow-hidden rounded-lg shadow-md">
              <Image 
                src={post.imageURL} 
                alt={post.title || "Post image"} 
                width={800} 
                height={400} 
                className="w-full h-auto object-cover" 
                data-ai-hint="post image content large"
              />
            </div>
          )}
          <p className="text-foreground/80">{post.description}</p>
          {post.codeSnippet && (
            <div>
              <h3 className="font-semibold mb-1 text-foreground">Code Example:</h3>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto font-code text-foreground/90">
                <code>{post.codeSnippet}</code>
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6 border-t">
          <div className="flex space-x-2 text-muted-foreground">
            <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="default" />
            <Button variant="outline" size="default" className="flex items-center space-x-1.5 text-muted-foreground" asChild>
                <Link href="#comments">
                    <MessageSquare size={18} /> <span>{post.commentsCount || 0} Comments</span>
                </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Card className="shadow-lg" id="comments">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Comments ({post.commentsCount || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CommentList postId={post.id} />
        </CardContent>
        <CommentForm postId={post.id} /> 
      </Card>
    </div>
  );
}
