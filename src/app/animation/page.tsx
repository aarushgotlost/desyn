
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCanvases } from '@/services/firestoreService';
import type { CanvasProject } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, PlusCircle, Clapperboard, AlertTriangle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { CreateCanvasDialog } from './create-canvas-dialog'; // Import the dialog

export default function AnimationDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [canvases, setCanvases] = useState<CanvasProject[]>([]);
  const [isLoadingCanvases, setIsLoadingCanvases] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchCanvases() {
      if (!user) {
        setCanvases([]);
        setIsLoadingCanvases(false);
        return;
      }
      setIsLoadingCanvases(true);
      setError(null);
      try {
        const userCanvases = await getUserCanvases(user.uid);
        setCanvases(userCanvases);
      } catch (err) {
        console.error("Error fetching canvases:", err);
        setError("Failed to load your animation canvases. Please try again.");
      } finally {
        setIsLoadingCanvases(false);
      }
    }

    if (!authLoading) {
      fetchCanvases();
    }
  }, [user, authLoading]);

  if (authLoading || isLoadingCanvases) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your animations...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
        <Clapperboard className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Welcome to Tearix 2D Animation!</h2>
        <p className="text-muted-foreground mb-6">Please log in to create and manage your animation canvases.</p>
        <Button asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }
  
  if (error) {
    return (
       <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Canvases</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Clapperboard className="mr-3 w-8 h-8 text-primary" />
            My Animation Canvases
          </h1>
          <p className="text-muted-foreground">Create, view, and manage your 2D animation projects.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Canvas
        </Button>
      </div>

      {canvases.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {canvases.map((canvas) => (
            <Card key={canvas.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out group">
              <Link href={`/animation/${canvas.id}`} className="block">
                <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                  {canvas._thumbnailUrl ? (
                    <Image
                      src={canvas._thumbnailUrl}
                      alt={`${canvas._title} thumbnail`}
                      layout="fill"
                      objectFit="cover"
                      className="group-hover:scale-105 transition-transform duration-300"
                      data-ai-hint="animation canvas thumbnail"
                    />
                  ) : (
                    <Clapperboard className="w-16 h-16 text-muted-foreground/50" />
                  )}
                </div>
              </Link>
              <CardHeader className="p-4">
                <Link href={`/animation/${canvas.id}`} className="block">
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                    {canvas._title}
                  </CardTitle>
                </Link>
                <CardDescription className="text-xs text-muted-foreground">
                  Last updated: {formatDistanceToNowStrict(new Date(canvas._updatedAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-0 mt-auto">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/animation/${canvas.id}`}>Open Canvas</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-muted-foreground/20 rounded-lg">
          <Clapperboard size={56} className="mx-auto text-muted-foreground mb-4 opacity-30" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Animation Canvases Yet</h3>
          <p className="text-muted-foreground mb-6">
            Click "Create New Canvas" to start your first 2D animation project.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Canvas
          </Button>
        </div>
      )}
      <CreateCanvasDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCanvasCreated={(newCanvasId) => {
          // Optionally, navigate to the new canvas or refresh the list
          // For now, just close dialog and let user open from list
          setIsCreateDialogOpen(false);
          // Trigger a re-fetch or optimistic update if needed
          // For simplicity, a page refresh could work or re-call fetchCanvases
          if (user) {
             getUserCanvases(user.uid).then(setCanvases).catch(err => console.error(err));
          }
        }}
      />
    </div>
  );
}
