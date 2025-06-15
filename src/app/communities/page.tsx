
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { PlusCircle, Search, Users, Compass } from "lucide-react";
import { getCommunities, getCurrentUserId } from "@/services/firestoreService";
import type { Community } from "@/types/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDiscoveryList } from "@/components/discover/UserDiscoveryList"; // New component
import { unstable_noStore as noStore } from 'next/cache';

export default async function DiscoverPage() { // Renamed component
  noStore();
  const [communities, currentUserId] = await Promise.all([
    getCommunities(),
    getCurrentUserId()
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Compass className="mr-3 w-8 h-8 text-primary" /> {/* Changed icon */}
            Discover
          </h1>
          <p className="text-muted-foreground">Explore communities and connect with other developers.</p>
        </div>
        {/* "Create Community" button might be better placed only on the Communities tab or contextually */}
      </div>

      <Tabs defaultValue="communities" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="communities"><Users className="mr-2 h-4 w-4" />Communities</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
        </TabsList>

        <TabsContent value="communities" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold font-headline">Community Explorer</h2>
             <Button asChild>
              <Link href="/communities/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Community
              </Link>
            </Button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search communities or filter by tags..." className="pl-10 pr-4 py-2 text-base" />
            {/* Add client-side filtering logic here if needed */}
          </div>
          
          {communities.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {communities.map((community) => (
                <Card key={community.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-start space-x-4 p-4">
                    <Image 
                      src={community.iconURL || "https://placehold.co/60x60.png?text=Icon"} 
                      alt={`${community.name} community icon`} 
                      width={60} 
                      height={60} 
                      className="rounded-lg object-cover"
                      data-ai-hint="community icon small"
                    />
                    <div className="flex-1">
                      <Link href={`/communities/${community.id}`}>
                        <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">{community.name}</CardTitle>
                      </Link>
                      <p className="text-xs text-muted-foreground">{community.memberCount?.toLocaleString() || 0} members</p>
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
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/communities/${community.id}`}>View Community</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">No communities found. Why not create one?</p>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <h2 className="text-2xl font-semibold font-headline mb-6">Discover Users</h2>
          <UserDiscoveryList currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
