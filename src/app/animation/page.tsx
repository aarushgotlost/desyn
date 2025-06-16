
"use client"; // Make it a client component

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Film, PlusCircle, FolderKanban, Edit3, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getUserAnimationProjects } from "@/services/firestoreService";
import type { AnimationProject } from "@/types/data";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNowStrict } from 'date-fns';


export default function AnimationLandingPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<AnimationProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoadingProjects(true);
      getUserAnimationProjects(user.uid)
        .then(fetchedProjects => {
          setProjects(fetchedProjects);
        })
        .catch(error => {
          console.error("Error fetching animation projects:", error);
          // Handle error, e.g., show a toast
        })
        .finally(() => {
          setIsLoadingProjects(false);
        });
    } else if (!authLoading) { 
      setProjects([]);
      setIsLoadingProjects(false);
    }
  }, [user, authLoading]);

  const newProjectId = `new-project-${Date.now()}`;

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader className="text-center pb-4">
          <Film className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline">Tearix2D Animation</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your 2D animation projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end mb-6">
            <Button asChild size="lg">
              <Link href={`/animation/${newProjectId}`}>
                <PlusCircle className="mr-2 h-5 w-5" /> Create New Animation
              </Link>
            </Button>
          </div>

          {isLoadingProjects && user && (
             <div className="flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
             </div>
          )}

          {!isLoadingProjects && user && projects.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mb-4 text-left font-headline">Your Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Link href={`/animation/${project.id}`}>
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        {project.thumbnailURL ? (
                          <Image
                            src={project.thumbnailURL}
                            alt={project.name}
                            width={300}
                            height={169}
                            className="object-cover w-full h-full"
                            data-ai-hint="animation project thumbnail"
                          />
                        ) : (
                           <Image
                            src="https://placehold.co/300x169.png" 
                            alt={project.name || "Animation Project"}
                            width={300}
                            height={169}
                            className="object-cover w-full h-full"
                            data-ai-hint="animation placeholder thumbnail"
                          />
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <Link href={`/animation/${project.id}`}>
                        <CardTitle className="text-lg font-semibold hover:text-primary truncate">{project.name || "Untitled Project"}</CardTitle>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {formatDistanceToNowStrict(new Date(project.updatedAt), { addSuffix: true })}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                       <Button variant="outline" size="sm" asChild className="w-full">
                          <Link href={`/animation/${project.id}`}>
                            <Edit3 className="mr-2 h-4 w-4" /> Open Project
                          </Link>
                       </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}

          {!isLoadingProjects && user && projects.length === 0 && (
            <div className="text-center py-10">
              <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You haven't created any animation projects yet.</p>
              <p className="text-sm text-muted-foreground">Click "Create New Animation" to get started!</p>
            </div>
          )}

          {!isLoadingProjects && !user && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Please <Link href="/login" className="text-primary hover:underline">log in</Link> to see or create animation projects.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
