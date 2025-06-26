
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare, ArrowLeft } from "lucide-react"; 
import { getPostDetails, getCurrentUserId } from "@/services/firestoreService"; 
import type { Post } from "@/types/data";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { LikeButton } from "@/components/posts/LikeButton";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { Separator } from "@/components/ui/separator";
import { unstable_noStore as noStore } from 'next/cache';
import { getInitials } from "@/lib/utils";
import { PostActionsClient } from "@/components/posts/PostActionsClient";


export default async function PostDetailsPage({ params }: { params: { postId: string } }) {
  noStore(); 
  const post: Post | null = await getPostDetails(params.postId);
  const currentUserId = await getCurrentUserId();

  if (!post) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-6">The post you are looking for does not exist or may have been removed.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back Home
          </Link>
        </Button>
      </div>
    );
  }

  const postCreatedAt = post.createdAt ? new Date(post.createdAt) : new Date();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <article>
        <header className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {post.communityId && post.communityName ? (
                <Link href={`/communities/${post.communityId}`} className="inline-block">
                    <Badge variant="secondary" className="text-sm hover:bg-muted transition-colors">
                        {post.communityName}
                    </Badge>
                </Link>
            ) : (
                 <span className="text-sm text-muted-foreground">General Post</span>
            )}
             <PostActionsClient post={post} currentUserId={currentUserId} />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-foreground mb-3">
            {post.title}
          </h1>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <Link href={`/profile/${post.authorId}`} className="flex items-center space-x-2 hover:text-primary group"> 
              <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary/50 transition-colors">
                <AvatarImage 
                  src={post.authorAvatar || undefined} 
                  alt={post.authorName ? `${post.authorName}'s avatar` : 'User avatar'}
                  data-ai-hint="author avatar medium"
                />
                <AvatarFallback className="text-sm">{getInitials(post.authorName)}</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium text-foreground group-hover:text-primary transition-colors">{post.authorName}</span>
                <p className="text-xs">
                  Posted {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                  {post.updatedAt && new Date(post.updatedAt).getTime() > postCreatedAt.getTime() + 60000 && ( // Only show if updated significantly later
                     <> &bull; Edited {formatDistanceToNowStrict(new Date(post.updatedAt), { addSuffix: true })}</>
                  )}
                </p>
              </div>
            </Link>
          </div>
        </header>

        {post.imageURL && (
          <div className="mb-6 overflow-hidden rounded-lg shadow-md aspect-video relative border">
            <Image 
              src={post.imageURL} 
              alt={post.title || "Post image"} 
              fill
              className="object-cover"
              priority
              data-ai-hint="post image large detail"
            />
          </div>
        )}

        {post.description && (
            <div 
                className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none text-foreground/90 mb-6"
                dangerouslySetInnerHTML={{ __html: post.description.replace(/\n/g, '<br />') }} // Basic newline to <br> conversion
            />
        )}


        {post.codeSnippet && (
          <div className="mb-6">
            <h3 className="font-semibold mb-1.5 text-foreground text-base">Code Snippet:</h3>
            <pre className="bg-muted p-3.5 rounded-md text-sm overflow-x-auto font-code text-foreground/90 shadow-inner border">
              <code>{post.codeSnippet}</code>
            </pre>
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        <Separator className="my-6" />

        <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-3">
            <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="default" />
            <Button variant="outline" size="default" className="flex items-center space-x-1.5 text-muted-foreground" asChild>
                <Link href="#comments">
                    <MessageSquare size={18} /> <span>{post.commentsCount || 0} Comments</span>
                </Link>
            </Button>
          </div>
        </footer>
      </article>

      <Separator className="my-10" />

      <section id="comments" className="space-y-6">
        <h2 className="text-2xl font-bold font-headline text-foreground">
          Comments ({post.commentsCount || 0})
        </h2>
        <CommentForm postId={post.id} /> 
        <CommentList postId={post.id} />
      </section>
    </div>
  );
}
