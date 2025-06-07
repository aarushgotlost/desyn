
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import Link from "next/link";
import { ThumbsUp, MessageSquare, CheckCircle, Send, CornerDownRight } from "lucide-react";
import { getPostDetails } from "@/services/firestoreService";
import type { Post } from "@/types/data";
import { formatDistanceToNowStrict } from 'date-fns';

// Mock comments until comment functionality is implemented
const mockComments = [
  { 
    id: "c1", 
    author: { name: "Bob The Commenter", avatar: "https://placehold.co/32x32.png?text=BC", profileLink: "/profile/bob" }, 
    text: "Great tutorial! Server actions are a game changer.", 
    timestamp: "1h ago",
    replies: [
      {id: "r1", author: { name: "Alice Wonderland", avatar: "https://placehold.co/32x32.png?text=AW", profileLink: "/profile/alice" }, text: "Thanks Bob! Glad you found it helpful.", timestamp: "30m ago"}
    ]
  },
];

export default async function PostDetailsPage({ params }: { params: { postId: string } }) {
  const post: Post | null = await getPostDetails(params.postId);

  if (!post) {
    return <div className="text-center py-10">Post not found.</div>;
  }

  // Placeholder for user-specific interactions
  const isLikedByUser = false; 

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
            {/* TODO: Link to actual user profile page based on post.authorId */}
            <div className="flex items-center space-x-2 hover:text-primary">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={post.authorAvatar || "https://placehold.co/40x40.png?text=N/A"} 
                  alt={post.authorName} 
                  data-ai-hint="user avatar"
                />
                <AvatarFallback>{post.authorName?.substring(0,1).toUpperCase() || 'A'}</AvatarFallback>
              </Avatar>
              <span>{post.authorName}</span>
            </div>
            <span>&bull;</span>
            <span>Posted in <Link href={`/communities/${post.communityId}`} className="hover:text-primary">{post.communityName}</Link></span>
            <span>&bull;</span>
            <span>{post.createdAt ? formatDistanceToNowStrict(post.createdAt.toDate(), { addSuffix: true }) : 'N/A'}</span>
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none space-y-6">
          {post.imageURL && (
            <div className="my-6 overflow-hidden rounded-lg shadow-md">
              <Image 
                src={post.imageURL} 
                alt={post.title} 
                width={800} 
                height={400} 
                className="w-full h-auto object-cover" 
                data-ai-hint="post image content"
              />
            </div>
          )}
          {/* Using dangerouslySetInnerHTML for description if it might contain markdown later. For now, simple text. */}
          <p>{post.description}</p>
          {post.codeSnippet && (
            <div>
              <h3 className="font-semibold mb-1">Code Example:</h3>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto font-code">
                <code>{post.codeSnippet}</code>
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6 border-t">
          <div className="flex space-x-4 text-muted-foreground">
            <Button variant={isLikedByUser ? "default" : "outline"} size="sm" className="flex items-center space-x-1.5" disabled> {/* Like functionality pending */}
              <ThumbsUp size={18} /> <span>{post.likes}</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5" disabled> {/* Comment count functionality pending */}
              <MessageSquare size={18} /> <span>{post.commentsCount} Comments</span>
            </Button>
          </div>
          {post.isSolved ? (
            <div className="flex items-center text-green-500 font-medium">
              <CheckCircle size={20} className="mr-1.5" /> Solved
            </div>
          ) : (
            <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" disabled> {/* Mark as solved functionality pending */}
              <CheckCircle size={18} className="mr-1.5" /> Mark as Solved
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Comments Section - Still uses mock data */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Comments ({post.commentsCount})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3">
            <Avatar>
              <AvatarImage src="https://placehold.co/40x40.png?text=U" alt="Current User" data-ai-hint="current user avatar"/>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea placeholder="Add a comment..." rows={3} disabled /> {/* Comment submission pending */}
              <Button size="sm" disabled>
                <Send size={16} className="mr-2" /> Post Comment
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            {mockComments.map(comment => (
              <div key={comment.id} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Link href={comment.author.profileLink}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.avatar} alt={comment.author.name} data-ai-hint="commenter avatar"/>
                      <AvatarFallback>{comment.author.name.substring(0,1)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <Link href={comment.author.profileLink} className="font-semibold text-foreground hover:text-primary">{comment.author.name}</Link>
                      <span className="text-muted-foreground">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-foreground/90">{comment.text}</p>
                  </div>
                </div>
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-8 pl-3 border-l-2 border-muted space-y-3">
                    {comment.replies.map(reply => (
                       <div key={reply.id} className="flex items-start space-x-3">
                         <Link href={reply.author.profileLink}>
                           <Avatar className="h-6 w-6">
                             <AvatarImage src={reply.author.avatar} alt={reply.author.name} data-ai-hint="replier avatar"/>
                             <AvatarFallback>{reply.author.name.substring(0,1)}</AvatarFallback>
                           </Avatar>
                         </Link>
                         <div className="flex-1 bg-muted/30 p-2 rounded-lg">
                           <div className="flex items-center justify-between text-xs mb-0.5">
                             <Link href={reply.author.profileLink} className="font-semibold text-foreground hover:text-primary text-xs">{reply.author.name}</Link>
                             <span className="text-muted-foreground text-xs">{reply.timestamp}</span>
                           </div>
                           <p className="text-xs text-foreground/90">{reply.text}</p>
                         </div>
                       </div>
                    ))}
                  </div>
                )}
                 <Button variant="ghost" size="sm" className="ml-11 text-xs text-muted-foreground hover:text-primary" disabled>
                    <CornerDownRight size={12} className="mr-1"/> Reply
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
