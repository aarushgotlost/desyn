
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare, ArrowLeft, Edit, Trash2 } from "lucide-react"; 
import { getPostDetails, getCurrentUserId } from "@/services/firestoreService"; 
import type { Post } from "@/types/data";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { LikeButton } from "@/components/posts/LikeButton";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { Separator } from "@/components/ui/separator";
import { unstable_noStore as noStore } from 'next/cache';
import { getInitials } from "@/lib/utils";


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
  const isAuthor = false; 

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <article>
        <header className="mb-8">
          {post.communityId && post.communityName && (
            <div className="mb-4">
              <Link href={`/communities/${post.communityId}`} className="text-sm text-primary hover:underline font-medium">
                {post.communityName}
              </Link>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight text-foreground mb-4">
            {post.title}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-6">
            <Link href={`/profile/${post.authorId}`} className="flex items-center space-x-2 hover:text-primary group"> 
              <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/50 transition-colors">
                <AvatarImage 
                  src={post.authorAvatar || undefined} 
                  alt={post.authorName ? `${post.authorName}'s avatar` : 'User avatar'}
                  data-ai-hint="author avatar medium"
                />
                <AvatarFallback className="text-base">{getInitials(post.authorName)}</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{post.authorName}</span>
                <p className="text-xs">
                  Posted {formatDistanceToNowStrict(postCreatedAt, { addSuffix: true })}
                  {/* Add updatedAt logic if you implement post editing and an updatedAt field */}
                </p>
              </div>
            </Link>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </header>

        {post.imageURL && (
          <div className="mb-8 overflow-hidden rounded-lg shadow-md aspect-video relative">
            <Image 
              src={post.imageURL} 
              alt={post.title || "Post image"} 
              layout="fill"
              objectFit="cover"
              priority
              className="transition-transform duration-300 hover:scale-105"
              data-ai-hint="post image large detail"
            />
          </div>
        )}

        <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none space-y-6 mb-8 text-foreground/90">
          <p className="text-lg leading-relaxed">{post.description}</p>
          {post.codeSnippet && (
            <div>
              <h3 className="font-semibold mb-2 text-foreground text-base">Code Example:</h3>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto font-code text-foreground/90 shadow-inner">
                <code>{post.codeSnippet}</code>
              </pre>
            </div>
          )}
        </div>

        <Separator className="my-8" />

        <footer className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-3">
            <LikeButton postId={post.id} initialLikesCount={post.likes || 0} size="default" />
            <Button variant="outline" size="default" className="flex items-center space-x-1.5 text-muted-foreground" asChild>
                <Link href="#comments">
                    <MessageSquare size={18} /> <span>{post.commentsCount || 0} Comments</span>
                </Link>
            </Button>
          </div>
          {isAuthor && ( 
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/posts/${post.id}/edit`}> <Edit size={14} className="mr-1.5" /> Edit</Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => alert('Delete action')}>
                 <Trash2 size={14} className="mr-1.5" /> Delete
              </Button>
            </div>
          )}
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
