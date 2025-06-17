
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAnimationProjects } from '@/services/firestoreService';
import type { AnimationProject } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { PlusCircle, Loader2, Clapperboard, Eye } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

export default function AnimationDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<AnimationProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoadingProjects(false);
      // Optional: redirect to login or show login prompt
      return;
    }

    setIsLoadingProjects(true);
    getUserAnimationProjects(user.uid)
      .then(fetchedProjects => {
        setProjects(fetchedProjects);
      })
      .catch(error => {
        console.error("Error fetching animation projects:", error);
        // Handle error (e.g., show toast)
      })
      .finally(() => {
        setIsLoadingProjects(false);
      });
  }, [user, authLoading]);

  if (authLoading || (isLoadingProjects && user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your animations...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <Clapperboard className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Welcome to Tearix 2D</h2>
        <p className="text-muted-foreground mb-6">Log in or sign up to create and manage your 2D animations.</p>
        <div className="space-x-4">
            <Button asChild><Link href="/login">Login</Link></Button>
            <Button asChild variant="outline"><Link href="/signup">Sign Up</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold font-headline flex items-center">
            <Clapperboard className="mr-3 w-8 h-8 text-primary"/> Tearix 2D Animations
        </h1>
        <Button asChild>
          <Link href="/animation/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Animation
          </Link>
        </Button>
      </div>

      {isLoadingProjects ? (
         <div className="text-center py-10"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Clapperboard className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Animations Yet!</h3>
          <p className="text-muted-foreground mb-6">
            Click "Create New Animation" to start your first masterpiece.
          </p>
          <Button asChild>
            <Link href="/animation/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Get Started
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map(project => (
            <Card key={project.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out group flex flex-col bg-card">
              <Link href={`/animation/${project.id}`} className="block">
                <AspectRatio ratio={16 / 9} className="bg-muted overflow-hidden">
                  {project.thumbnailUrl ? (
                    <Image
                      src={project.thumbnailUrl}
                      alt={project.title || "Animation thumbnail"}
                      layout="fill"
                      objectFit="cover"
                      className="group-hover:scale-105 transition-transform duration-300"
                      data-ai-hint="animation project thumbnail"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Clapperboard className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                </AspectRatio>
              </Link>
              <CardHeader className="p-4">
                <Link href={`/animation/${project.id}`}>
                  <CardTitle className="text-lg font-semibold hover:text-primary transition-colors truncate group-hover:text-primary">
                    {project.title || "Untitled Animation"}
                  </CardTitle>
                </Link>
                <CardDescription className="text-xs">
                  Last updated {formatDistanceToNowStrict(new Date(project.updatedAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-0 mt-auto">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/animation/${project.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View/Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
