
"use client";

import type { AnimationProject, AnimationFrame } from '@/types/data';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { 
    addFrameToAnimationProject as addFrameService,
    updateFrameData as updateFrameService,
    deleteFrameFromAnimationProject as deleteFrameService
} from '@/services/firestoreService';
import { useToast } from '@/hooks/use-toast';

interface AnimationContextType {
  project: AnimationProject | null;
  setProject: (project: AnimationProject | null) => void;
  frames: AnimationFrame[];
  setFrames: (frames: AnimationFrame[]) => void;
  selectedFrame: AnimationFrame | null;
  setSelectedFrame: (frame: AnimationFrame | null) => void;
  currentFrameData: string; // Representing imageDataUrl as a string for now
  setCurrentFrameData: (data: string) => void;
  addFrame: () => Promise<void>;
  updateFrame: (projectId: string, frameId: string, imageDataUrl: string) => Promise<void>;
  deleteFrame: (projectId: string, frameId: string) => Promise<void>;
  isLoading: boolean; // General loading state for context operations
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  const [project, setProject] = useState<AnimationProject | null>(null);
  const [frames, setFrames] = useState<AnimationFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<AnimationFrame | null>(null);
  const [currentFrameData, setCurrentFrameData] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const addFrame = useCallback(async () => {
    if (!project) {
      toast({ title: "Error", description: "No project selected to add a frame.", variant: "destructive"});
      return;
    }
    setIsLoading(true);
    try {
      const newFrameNumber = frames.length > 0 ? Math.max(...frames.map(f => f.frameNumber)) + 1 : 1;
      await addFrameService(project.id, newFrameNumber);
      // Realtime listener in page.tsx should update frames state
      toast({ title: "Frame Added", description: `Frame ${newFrameNumber} created.`});
    } catch (error: any) {
      toast({ title: "Error Adding Frame", description: error.message, variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [project, frames, toast]);

  const updateFrame = useCallback(async (projectId: string, frameId: string, imageDataUrl: string) => {
    setIsLoading(true);
    try {
      await updateFrameService(projectId, frameId, imageDataUrl);
      // Optimistic update or rely on realtime listener
      setFrames(prevFrames => prevFrames.map(f => f.id === frameId ? {...f, imageDataUrl, updatedAt: new Date().toISOString()} : f));
      if (selectedFrame?.id === frameId) {
          setSelectedFrame(prev => prev ? {...prev, imageDataUrl, updatedAt: new Date().toISOString()} : null);
      }
      toast({ title: "Frame Saved", description: "Frame data has been saved." });
    } catch (error: any) {
      toast({ title: "Error Saving Frame", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFrame, toast]);
  
  const deleteFrame = useCallback(async (projectId: string, frameId: string) => {
    setIsLoading(true);
    try {
      await deleteFrameService(projectId, frameId);
      // Realtime listener should update, or:
      setFrames(prevFrames => prevFrames.filter(f => f.id !== frameId));
      if (selectedFrame?.id === frameId) {
        setSelectedFrame(frames.length > 1 ? frames.find(f => f.id !== frameId) || null : null);
      }
      toast({ title: "Frame Deleted" });
    } catch (error: any) {
      toast({ title: "Error Deleting Frame", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [frames, selectedFrame, toast]);


  return (
    <AnimationContext.Provider value={{
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
      isLoading
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};
