
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAnimation } from '@/contexts/AnimationContext';
import { getAnimationProjectDetailsRealtime, getAnimationFramesRealtime } from '@/services/firestoreService';
import type { AnimationProject, AnimationFrame } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Clapperboard, Share2, Info, Brush, Eraser, Layers, Play, Palette } from 'lucide-react';
import Link from 'next/link';
import { AnimationToolbar } from './toolbar';
import { AnimationTimeline } from './timeline';
import { ShareProjectDialog } from './project-settings-dialog'; // Renamed for clarity
import { Textarea } from '@/components/ui/textarea'; // For representing imageDataUrl

export default function AnimationProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    project,
    setProject,
    frames,
    setFrames,
    selectedFrame,
    setSelectedFrame,
    currentFrameData,
    setCurrentFrameData,
    addFrame,
    updateFrame,
    deleteFrame,
  } = useAnimation();

  const projectId = params.projectId as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setError("Project ID is missing.");
      setIsLoading(false);
      return;
    }
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    const unsubscribeProject = getAnimationProjectDetailsRealtime(projectId, (fetchedProject) => {
      if (fetchedProject) {
        if (!fetchedProject.allowedUsers.includes(user.uid)) {
          setError("Access Denied: You do not have permission to view this project.");
          setProject(null);
          setIsLoading(false);
        } else {
          setProject(fetchedProject);
          setError(null);
        }
      } else {
        setError("Animation project not found.");
        setProject(null);
      }
      // Initial loading will be set to false after frames are also attempted to load
    });

    const unsubscribeFrames = getAnimationFramesRealtime(projectId, (fetchedFrames) => {
      setFrames(fetchedFrames);
      if (fetchedFrames.length > 0 && !selectedFrame) {
        setSelectedFrame(fetchedFrames[0]);
        setCurrentFrameData(fetchedFrames[0].imageDataUrl);
      } else if (fetchedFrames.length === 0 && selectedFrame) {
        setSelectedFrame(null);
        setCurrentFrameData('');
      }
      setIsLoading(false); // Considered loaded after frames attempt
    });

    return () => {
      unsubscribeProject();
      unsubscribeFrames();
    };
  }, [projectId, user, authLoading, router, setProject, setFrames, setSelectedFrame, setCurrentFrameData, selectedFrame]);

  useEffect(() => {
    if (selectedFrame) {
      setCurrentFrameData(selectedFrame.imageDataUrl);
    } else {
      setCurrentFrameData('');
    }
  }, [selectedFrame, setCurrentFrameData]);

  const handleFrameDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentFrameData(e.target.value);
  };
  
  const handleSaveFrame = async () => {
    if (project && selectedFrame && currentFrameData !== selectedFrame.imageDataUrl) {
      await updateFrame(project.id, selectedFrame.id, currentFrameData);
    }
  };


  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading Animation Project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Clapperboard className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild variant="outline">
          <Link href="/animation">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    // This case should be covered by error state, but as a fallback:
    return <div className="p-4 text-center">Project not found or access denied.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="bg-background border-b p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/animation" aria-label="Back to projects">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold truncate font-headline">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
           {/* Placeholder for Play button */}
          <Button variant="outline" size="sm" disabled>
            <Play className="mr-2 h-4 w-4" /> Play
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Tools & Layers Placeholder */}
        <aside className="w-16 md:w-64 bg-background border-r p-4 space-y-4 hidden md:flex flex-col">
          <AnimationToolbar />
          <Card className="mt-auto">
            <CardHeader><CardTitle className="text-sm">Layers</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">Layer controls placeholder.</CardContent>
          </Card>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col p-4 overflow-y-auto">
          <Card className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-background shadow-inner">
             <div className="text-center p-8">
                <Palette size={64} className="mx-auto text-muted-foreground opacity-30 mb-4" />
                <h2 className="text-xl font-semibold text-muted-foreground">Animation Canvas Area</h2>
                <p className="text-sm text-muted-foreground mb-4">Drawing tools and canvas will be implemented here.</p>
                {selectedFrame && (
                  <>
                    <Label htmlFor="frameData" className="text-sm font-medium">Frame {selectedFrame.frameNumber} Data (Placeholder):</Label>
                    <Textarea
                      id="frameData"
                      value={currentFrameData}
                      onChange={handleFrameDataChange}
                      placeholder="Enter 'drawing' data for this frame..."
                      className="mt-2 font-mono text-xs h-32"
                    />
                    <Button onClick={handleSaveFrame} size="sm" className="mt-2">Save Frame Data</Button>
                  </>
                )}
                {!selectedFrame && <p className="text-muted-foreground mt-2">Select or add a frame to edit.</p>}
             </div>
          </Card>
           {/* AI Tools Placeholder */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" /> AI Tools (Future)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Placeholders for AI-powered tools like auto-inbetweening, cleanup, color fill, and pose suggestions will be here.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Bottom Panel - Timeline */}
      <footer className="bg-background border-t p-3 sticky bottom-0 z-10">
        <AnimationTimeline />
      </footer>

      <ShareProjectDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        project={project}
      />
    </div>
  );
}
