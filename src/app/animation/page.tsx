
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
import { PlusCircle, Loader2, Clapperboard, Eye, Users } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { CreateCanvasDialog } from './create-canvas-dialog'; // Renamed to match "canvas" terminology

export default function AnimationDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<AnimationProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      if (user) {
        setIsLoadingProjects(true);
        try {
          const userProjects = await getUserAnimationProjects(user.uid);
          setProjects(userProjects);
        } catch (error) {
          console.error("Failed to fetch animation projects:", error);
          // Optionally show a toast notification
        } finally {
          setIsLoadingProjects(false);
        }
      } else if (!authLoading) {
        // If not loading and no user, clear projects and stop loading
        setProjects([]);
        setIsLoadingProjects(false);
      }
    }
    fetchProjects();
  }, [user, authLoading]);

  if (authLoading || isLoadingProjects) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Animation Dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <Clapperboard className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mb-4">Please log in to view or create animation projects.</p>
        <Button asChild><Link href="/login">Log In</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold font-headline flex items-center justify-center md:justify-start">
            <Clapperboard className="mr-3 w-8 h-8 text-primary" />
            Tearix2D Animation Projects
          </h1>
          <p className="text-muted-foreground">Your personal and collaborative animation canvases.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Canvas
        </Button>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <Link href={`/animation/${project.id}`} className="block">
                <AspectRatio ratio={16 / 9} className="bg-muted">
                  <Image
                    src={project.thumbnailUrl || "https://placehold.co/600x338.png"}
                    alt={project.title || "Animation project thumbnail"}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:opacity-90 transition-opacity"
                    data-ai-hint="animation project abstract"
                  />
                </AspectRatio>
              </Link>
              <CardHeader className="p-4">
                <Link href={`/animation/${project.id}`}>
                  <CardTitle className="text-lg font-semibold hover:text-primary transition-colors truncate">
                    {project.title}
                  </CardTitle>
                </Link>
                <CardDescription className="text-xs text-muted-foreground">
                  Last updated: {project.updatedAt ? formatDistanceToNowStrict(new Date(project.updatedAt), { addSuffix: true }) : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-grow">
                 <p className="text-sm text-muted-foreground mb-1">Owner: {project.ownerName || project.ownerId}</p>
                 <div className="flex items-center text-sm text-muted-foreground">
                    <Users size={14} className="mr-1.5" /> {project.allowedUsers.length} Collaborator(s)
                 </div>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/animation/${project.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> Open Canvas
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Clapperboard className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-foreground">No Animation Projects Yet</h2>
          <p className="text-muted-foreground mb-6">Click "Create New Canvas" to start your first animation!</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Canvas
          </Button>
        </div>
      )}
      <CreateCanvasDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onProjectCreated={() => {
          // Re-fetch projects or optimistically add to list
          if (user) {
            setIsLoadingProjects(true);
            getUserAnimationProjects(user.uid).then(setProjects).finally(() => setIsLoadingProjects(false));
          }
      }} />
    </div>
  );
}
