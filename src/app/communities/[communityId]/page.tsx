import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { MessageCircle, ThumbsUp, CheckCircle, Users, Settings, PlusCircle } from "lucide-react";
import Link from "next/link";

// Mock data for a single community and its posts - replace with actual data fetching
const mockCommunity = {
  id: "1",
  name: "Next.js Developers",
  icon: "https://placehold.co/100x100.png",
  description: "A vibrant community for Next.js enthusiasts. Share your projects, ask questions, and stay updated with the latest in Next.js development. We cover everything from Server Components to Vercel deployments.",
  memberCount: 1250,
  tags: ["nextjs", "react", "vercel", "ssr", "frontend"],
  isJoined: true, // Assuming the current user has joined
};

const mockPosts = [
   {
    id: "1",
    title: "Optimizing Images in Next.js 14",
    author: "Alice Wonderland",
    authorAvatar: "https://placehold.co/40x40.png",
    description: "Learn best practices for using next/image and other techniques to optimize images for performance in your Next.js apps.",
    image: "https://placehold.co/600x300.png",
    likes: 85,
    comments: 12,
    isSolved: false,
    tags: ["nextjs", "images", "performance"],
    timestamp: "1d ago"
  },
  {
    id: "2",
    title: "Understanding Route Handlers",
    author: "Bob The Builder",
    authorAvatar: "https://placehold.co/40x40.png",
    description: "A deep dive into Next.js Route Handlers for creating API endpoints within the App Router.",
    codeSnippet: "export async function GET(request: Request) {\n  return Response.json({ message: 'Hello from API!' });\n}",
    likes: 150,
    comments: 22,
    isSolved: true,
    tags: ["nextjs", "api", "app-router"],
    timestamp: "3d ago"
  }
];


export default function CommunityPage({ params }: { params: { communityId: string } }) {
  // In a real app, fetch community data using params.communityId
  const community = mockCommunity;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Image src={community.icon} alt={`${community.name} icon`} width={100} height={100} className="rounded-xl border" data-ai-hint="community logo" />
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold font-headline mb-1">{community.name}</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Users size={16} className="mr-1.5" /> {community.memberCount.toLocaleString()} members
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
              <Button variant={community.isJoined ? "outline" : "default"}>
                {community.isJoined ? "Leave Community" : "Join Community"}
              </Button>
              {/* Placeholder for community settings if admin/mod */}
              {/* <Button variant="ghost" size="icon"><Settings size={20} /></Button> */}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold font-headline">Community Posts</h2>
        <Button asChild>
          <Link href={`/posts/create?communityId=${community.id}`}> {/* Or specific route like /communities/[id]/posts/create */}
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Post
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        {mockPosts.length > 0 ? mockPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
             <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <Image src={post.authorAvatar} alt={post.author} width={40} height={40} className="rounded-full" data-ai-hint="profile avatar"/>
                <div>
                  <CardTitle className="text-lg font-headline hover:text-primary">
                    <Link href={`/posts/${post.id}`}>{post.title}</Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Posted by {post.author} &bull; {post.timestamp}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {post.image && (
                <div className="mb-3 overflow-hidden rounded-md">
                  <Image src={post.image} alt={post.title} width={600} height={300} className="w-full h-auto object-cover" data-ai-hint="technology code"/>
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
                <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-xs">
                  <ThumbsUp size={14} /> <span>{post.likes}</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-xs">
                  <MessageCircle size={14} /> <span>{post.comments}</span>
                </Button>
              </div>
              {post.isSolved ? (
                <div className="flex items-center text-green-600 text-xs">
                  <CheckCircle size={14} className="mr-1" /> Solved
                </div>
              ) : (
                <Button variant="outline" size="sm" className="text-xs">
                  Mark as Solved
                </Button>
              )}
            </CardFooter>
          </Card>
        )) : (
          <p className="text-muted-foreground col-span-full text-center py-10">No posts in this community yet. Be the first to create one!</p>
        )}
      </div>
    </div>
  );
}
