import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import Link from "next/link";
import { Edit3, Mail, Users, FileText, Settings, CalendarDays, Link2 } from "lucide-react";

// Mock data for user profile - replace with actual data fetching from AuthContext or Firestore
const mockUserProfile = {
  name: "Alex Johnson",
  username: "alexj",
  avatarUrl: "https://placehold.co/120x120.png",
  bio: "Full-stack developer passionate about open-source, AI, and building cool stuff with Next.js and Firebase. Always learning and exploring new technologies.",
  email: "alex.johnson@example.com",
  joinedDate: "Joined October 2023",
  website: "https://alexj.dev",
  techStack: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Firebase", "Python", "Docker"],
  joinedCommunities: [
    { id: "1", name: "Next.js Developers", icon: "https://placehold.co/40x40.png" },
    { id: "2", name: "AI & Machine Learning", icon: "https://placehold.co/40x40.png" },
    { id: "3", name: "Open Source Contributors", icon: "https://placehold.co/40x40.png" },
  ],
  createdPosts: [
    { id: "p1", title: "My Journey into AI with Python", community: "AI & Machine Learning", date: "3 days ago", likes: 45, comments: 7 },
    { id: "p2", title: "Building a Scalable App with Next.js", community: "Next.js Developers", date: "1 week ago", likes: 102, comments: 15 },
  ],
};

export default function ProfilePage() {
  // In a real app, you would get the user's profile from AuthContext or fetch if viewing another user's profile
  const user = mockUserProfile;

  // This function would be different if viewing another user's profile
  const isCurrentUser = true; 

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl">
        <div className="relative h-40 md:h-56 bg-gradient-to-r from-primary to-accent">
           {/* Optional: Cover Image */}
           {/* <Image src="https://placehold.co/1200x300" alt="Cover image" layout="fill" objectFit="cover" /> */}
        </div>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6 px-6 pb-6 border-b">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile picture"/>
              <AvatarFallback className="text-4xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold font-headline">{user.name}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              <div className="mt-1 flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center"><Mail size={14} className="mr-1" /> {user.email}</span>
                <span className="flex items-center"><CalendarDays size={14} className="mr-1" /> {user.joinedDate}</span>
                {user.website && <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline"><Link2 size={14} className="mr-1"/> {user.website.replace('https://','')}</a>}
              </div>
            </div>
            {isCurrentUser && (
              <Button variant="outline">
                <Edit3 size={16} className="mr-2" /> Edit Profile
              </Button>
            )}
          </div>
          
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-1">Bio</h2>
            <p className="text-foreground/80 mb-6">{user.bio}</p>

            <h2 className="text-lg font-semibold mb-2">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {user.techStack.map(tech => (
                <span key={tech} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">{tech}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 bg-muted/50">
          <TabsTrigger value="posts" className="text-base"><FileText className="mr-2 h-5 w-5" />My Posts</TabsTrigger>
          <TabsTrigger value="communities" className="text-base"><Users className="mr-2 h-5 w-5" />Joined Communities</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6 space-y-4">
          {user.createdPosts.length > 0 ? user.createdPosts.map(post => (
            <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Link href={`/posts/${post.id}`}>
                  <CardTitle className="text-lg hover:text-primary">{post.title}</CardTitle>
                </Link>
                <CardDescription className="text-xs">
                  In <Link href={`/communities/${post.community.toLowerCase().replace(/\s+/g, '-')}`} className="text-primary hover:underline">{post.community}</Link> &bull; {post.date}
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">
                <span>{post.likes} Likes &bull; {post.comments} Comments</span>
              </CardFooter>
            </Card>
          )) : (
            <p className="text-center text-muted-foreground py-8">No posts created yet.</p>
          )}
        </TabsContent>
        <TabsContent value="communities" className="mt-6 space-y-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {user.joinedCommunities.length > 0 ? user.joinedCommunities.map(community => (
              <Card key={community.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 flex items-center space-x-3">
                  <Image src={community.icon} alt={community.name} width={40} height={40} className="rounded-md" data-ai-hint="community logo" />
                  <div>
                    <Link href={`/communities/${community.id}`}>
                      <h3 className="font-semibold text-sm hover:text-primary">{community.name}</h3>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="col-span-full text-center text-muted-foreground py-8">Not a member of any communities yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
