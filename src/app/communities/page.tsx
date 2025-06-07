
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { PlusCircle, Search, Users } from "lucide-react";

// Mock data for communities - replace with actual data fetching
const mockCommunities = [
  { id: "1", name: "Next.js Developers", members: 1250, icon: "https://placehold.co/80x80.png", description: "All things Next.js, Vercel, and modern web development.", tags: ["nextjs", "react", "vercel"] },
  { id: "2", name: "Firebase Experts", members: 870, icon: "https://placehold.co/80x80.png", description: "Discussions on Firebase services, best practices, and new features.", tags: ["firebase", "nosql", "backend"] },
  { id: "3", name: "Frontend Wizards", members: 2100, icon: "https://placehold.co/80x80.png", description: "Share your frontend magic: CSS, JavaScript frameworks, UI/UX.", tags: ["css", "javascript", "ui-ux", "react", "vue", "angular"] },
  { id: "4", name: "AI & Machine Learning", members: 1500, icon: "https://placehold.co/80x80.png", description: "Explore the world of AI, machine learning, and data science.", tags: ["ai", "ml", "python", "datascience"] },
  { id: "5", name: "DevOps & Infrastructure", members: 700, icon: "https://placehold.co/80x80.png", description: "Talk about CI/CD, Docker, Kubernetes, cloud platforms, and more.", tags: ["devops", "docker", "kubernetes", "aws", "gcp", "azure"] },
];


export default function CommunitiesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center"><Users className="mr-3 w-8 h-8 text-primary" />Community Explorer</h1>
          <p className="text-muted-foreground">Find and join communities that match your interests.</p>
        </div>
        <Button asChild>
          <Link href="/communities/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Community
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Search communities or filter by tags..." className="pl-10 pr-4 py-2 text-base" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockCommunities.map((community) => (
          <Card key={community.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-start space-x-4 p-4">
              <Image src={community.icon} alt={`${community.name} icon`} width={60} height={60} className="rounded-lg" data-ai-hint="community logo"/>
              <div className="flex-1">
                <Link href={`/communities/${community.id}`}>
                  <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">{community.name}</CardTitle>
                </Link>
                <p className="text-xs text-muted-foreground">{community.members.toLocaleString()} members</p>
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-4 pt-0">
              <CardDescription className="text-sm mb-3 h-16 overflow-hidden text-ellipsis">
                {community.description}
              </CardDescription>
              <div className="flex flex-wrap gap-1 mb-3">
                {community.tags.slice(0,3).map(tag => (
                  <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tag}</span>
                ))}
                {community.tags.length > 3 && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">+{community.tags.length - 3} more</span>}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 border-t mt-auto">
              <Button className="w-full" variant="outline">Join Community</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <div className="text-center mt-8">
        <Button variant="outline">Load More Communities</Button>
      </div>
    </div>
  );
}
