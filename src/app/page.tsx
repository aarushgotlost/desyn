import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { MessageCircle, ThumbsUp, CheckCircle } from "lucide-react";

// Mock data for posts - replace with actual data fetching
const mockPosts = [
  {
    id: "1",
    title: "Getting Started with Next.js 14 Server Actions",
    community: "Next.js Developers",
    author: "Alice Wonderland",
    authorAvatar: "https://placehold.co/40x40.png",
    description: "A quick guide on how to implement server actions for form submissions and data mutations in Next.js 14. No more API routes needed for simple cases!",
    image: "https://placehold.co/600x400.png",
    likes: 120,
    comments: 15,
    isSolved: false,
    tags: ["nextjs", "server-actions", "react"],
    timestamp: "2h ago"
  },
  {
    id: "2",
    title: "Best Practices for Firebase Firestore Security Rules",
    community: "Firebase Experts",
    author: "Bob The Builder",
    authorAvatar: "https://placehold.co/40x40.png",
    description: "Dive deep into securing your Firestore database. We'll cover common pitfalls and advanced techniques to protect your user data.",
    codeSnippet: "match /users/{userId} {\n  allow read, write: if request.auth != null && request.auth.uid == userId;\n}",
    likes: 250,
    comments: 30,
    isSolved: true,
    tags: ["firebase", "firestore", "security"],
    timestamp: "5h ago"
  },
  {
    id: "3",
    title: "Cool CSS Trick for Card Hover Effects",
    community: "Frontend Wizards",
    author: "Charlie Brown",
    authorAvatar: "https://placehold.co/40x40.png",
    description: "Learn a simple yet effective CSS trick to create engaging hover effects for your cards using transforms and transitions.",
    image: "https://placehold.co/600x400.png",
    likes: 90,
    comments: 8,
    isSolved: false,
    tags: ["css", "frontend", "ui-ux"],
    timestamp: "1d ago"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Home Feed</h1>
      <p className="text-muted-foreground">Posts from communities you've joined.</p>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        {mockPosts.map((post) => (
          <Card key={post.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <Image src={post.authorAvatar} alt={post.author} width={40} height={40} className="rounded-full" data-ai-hint="profile avatar" />
                <div>
                  <CardTitle className="text-xl font-headline">{post.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Posted by {post.author} in <a href="#" className="text-primary hover:underline">{post.community}</a> &bull; {post.timestamp}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {post.image && (
                <div className="mb-4 overflow-hidden rounded-md">
                  <Image src={post.image} alt={post.title} width={600} height={400} className="w-full h-auto object-cover" data-ai-hint="code programming" />
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
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <ThumbsUp size={16} /> <span>{post.likes} Likes</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <MessageCircle size={16} /> <span>{post.comments} Comments</span>
                </Button>
              </div>
              {post.isSolved ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle size={16} className="mr-1" /> Solved
                </div>
              ) : (
                <Button variant="outline" size="sm">
                  Mark as Solved
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
       <div className="text-center mt-8">
        <Button variant="outline">Load More Posts</Button>
      </div>
    </div>
  );
}
