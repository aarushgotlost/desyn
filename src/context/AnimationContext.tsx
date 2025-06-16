
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useContext, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { loadAllFrames, saveFrame as saveFrameToDb, getProjectMetadata } from '@/lib/animationUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Define types for context values
export interface Frame {
  id: string; 
  dataUrl: string | null; 
  layers: Layer[]; 
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  data?: any[]; 
}

interface AnimationContextType {
  frames: Frame[];
  setFrames: Dispatch<SetStateAction<Frame[]>>; 
  activeFrameIndex: number; 
  setActiveFrameIndex: Dispatch<SetStateAction<number>>;
  layers: Layer[]; 
  setLayers: Dispatch<SetStateAction<Layer[]>>; // This will manage layers for the active frame or a global template
  currentTool: string; 
  setCurrentTool: Dispatch<SetStateAction<string>>;
  projectId: string | null;
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  isLoadingProject: boolean;
  currentColor: string;
  setCurrentColor: Dispatch<SetStateAction<string>>;
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  fps: number;
  setFps: Dispatch<SetStateAction<number>>;

  undoDrawing: () => void;
  redoDrawing: () => void;
  canUndoDrawing: boolean;
  canRedoDrawing: boolean;
  
  saveActiveFrameManually: () => Promise<void>;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

const defaultInitialLayers: Layer[] = [{ id: `layer-0-${Date.now()}`, name: 'Layer 1', visible: true, data: [] }];

export const AnimationProvider = ({ children, projectId: routeProjectId }: { children: ReactNode, projectId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [frames, _setFramesInternal] = useState<Frame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  // Global/template layers, or layers of the active frame. For now, simpler global/template.
  const [layers, setLayers] = useState<Layer[]>([...defaultInitialLayers]); 
  const [currentTool, setCurrentTool] = useState<string>('brush'); 
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(12);
  const [projectName, setProjectName] = useState<string>("Untitled Animation");

  const [drawingHistory, setDrawingHistory] = useState<(string | null)[]>([]);
  const [drawingHistoryPointer, setDrawingHistoryPointer] = useState<number>(-1);

  useEffect(() => {
    if (routeProjectId) {
      setIsLoadingProject(true);
      setLayers([...defaultInitialLayers]); // Reset layers panel for new project
      Promise.all([
        getProjectMetadata(routeProjectId),
        loadAllFrames(routeProjectId)
      ]).then(([metadata, loadedFrames]) => {
        if (metadata) {
          setProjectName(metadata.name);
          setFps(metadata.fps || 12);
        } else {
          setProjectName(`Untitled Project ${routeProjectId.substring(routeProjectId.length - 6)}`);
        }

        let initialFramesToSet: Frame[];
        if (loadedFrames && loadedFrames.length > 0) {
          initialFramesToSet = loadedFrames.map((f, index) => ({
            id: f.id || `frame-${index}-${Date.now()}`,
            dataUrl: f.dataUrl || null,
            layers: f.layers && f.layers.length > 0 ? f.layers : [...defaultInitialLayers.map(l => ({...l, id: `layer-${index}-${l.id}-${Date.now()}`}))] 
          }));
        } else {
          initialFramesToSet = [{ 
            id: `frame-0-${Date.now()}`, 
            dataUrl: null, 
            layers: [...defaultInitialLayers.map(l => ({...l, id: `layer-initial-0-${l.id}-${Date.now()}`}))] 
          }];
        }
        _setFramesInternal(initialFramesToSet);
        setActiveFrameIndex(0);

        if (initialFramesToSet.length > 0 && initialFramesToSet[0]) {
          setDrawingHistory([initialFramesToSet[0].dataUrl]);
          setDrawingHistoryPointer(0);
           // If active frame has layers, set them to the global layers for the panel
          if (initialFramesToSet[0].layers && initialFramesToSet[0].layers.length > 0) {
            setLayers(initialFramesToSet[0].layers);
          } else {
            setLayers([...defaultInitialLayers]);
          }
        } else {
          setDrawingHistory([null]);
          setDrawingHistoryPointer(0);
          setLayers([...defaultInitialLayers]);
        }
      }).catch(error => {
        console.error("Failed to load project data:", error);
        const fallbackFrames: Frame[] = [{ 
            id: `frame-fallback-0-${Date.now()}`, 
            dataUrl: null, 
            layers: [...defaultInitialLayers.map(l => ({...l, id: `layer-fallback-0-${l.id}-${Date.now()}`}))] 
        }];
        _setFramesInternal(fallbackFrames);
        setActiveFrameIndex(0);
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        setLayers([...defaultInitialLayers]);
      }).finally(() => {
        setIsLoadingProject(false);
      });
    }
  }, [routeProjectId]);

  useEffect(() => {
    if (frames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < frames.length) {
      const currentFrame = frames[activeFrameIndex];
      setDrawingHistory([currentFrame?.dataUrl]); 
      setDrawingHistoryPointer(0);
      // Update the global layers panel to reflect the active frame's layers
      if (currentFrame?.layers && currentFrame.layers.length > 0) {
        setLayers(currentFrame.layers);
      } else {
        // If active frame has no layers (should not happen if initialized correctly), reset panel to default
        const defaultLayersForActiveFrame = [...defaultInitialLayers.map(l => ({...l, id: `layer-active-${activeFrameIndex}-${l.id}-${Date.now()}`}))];
        setLayers(defaultLayersForActiveFrame);
        // Optionally, update the frame itself if it was missing layers
         _setFramesInternal(prev => {
            const newFrames = [...prev];
            if(newFrames[activeFrameIndex] && (!newFrames[activeFrameIndex].layers || newFrames[activeFrameIndex].layers.length === 0)) {
                newFrames[activeFrameIndex] = {...newFrames[activeFrameIndex], layers: defaultLayersForActiveFrame};
            }
            return newFrames;
        });
      }
    } else if (frames.length === 0) { 
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        setLayers([...defaultInitialLayers]);
    }
  }, [activeFrameIndex]); // Only run when activeFrameIndex changes, frames dependency removed to avoid loop with _setFramesInternal

  const setFrames: Dispatch<SetStateAction<Frame[]>> = (valueOrFn) => {
    _setFramesInternal(prevFrames => {
        const newFrames = typeof valueOrFn === 'function' ? valueOrFn(prevFrames) : valueOrFn;
        // When frames array is structurally changed (add/delete),
        // ensure the active frame's layers are reflected in the panel.
        if (newFrames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < newFrames.length) {
            const currentActiveFrame = newFrames[activeFrameIndex];
            if (currentActiveFrame && currentActiveFrame.layers && currentActiveFrame.layers.length > 0) {
                setLayers(currentActiveFrame.layers);
            } else {
                 // If the new active frame somehow has no layers, reset panel
                setLayers([...defaultInitialLayers.map(l => ({...l, id: `layer-newstruct-${activeFrameIndex}-${l.id}-${Date.now()}`}))]);
            }
            // Also reset drawing history for the current frame as its data might be new
            setDrawingHistory([currentActiveFrame?.dataUrl || null]);
            setDrawingHistoryPointer(0);
        } else if (newFrames.length === 0) {
            setActiveFrameIndex(0); // Reset to 0 if all frames are gone
            setLayers([...defaultInitialLayers]);
            setDrawingHistory([null]);
            setDrawingHistoryPointer(0);
        }
        return newFrames;
    });
  };

  const updateActiveFrameDrawing = (newDataUrl: string | null) => {
    _setFramesInternal(prevFrames => {
      const newFrames = [...prevFrames];
      if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
        newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: newDataUrl };
      }
      return newFrames;
    });

    const newHistory = drawingHistory.slice(0, drawingHistoryPointer + 1);
    newHistory.push(newDataUrl);
    while (newHistory.length > 30) { newHistory.shift(); }
    setDrawingHistory(newHistory);
    setDrawingHistoryPointer(newHistory.length - 1);
  };

  const undoDrawing = useCallback(() => {
    if (drawingHistoryPointer > 0) {
      const newPointer = drawingHistoryPointer - 1;
      setDrawingHistoryPointer(newPointer);
      const restoredDataUrl = drawingHistory[newPointer];
      _setFramesInternal(prevFrames => {
        const newFrames = [...prevFrames];
        if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
          newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: restoredDataUrl };
        }
        return newFrames;
      });
    }
  }, [drawingHistory, drawingHistoryPointer, activeFrameIndex]);

  const redoDrawing = useCallback(() => {
    if (drawingHistoryPointer < drawingHistory.length - 1) {
      const newPointer = drawingHistoryPointer + 1;
      setDrawingHistoryPointer(newPointer);
      const restoredDataUrl = drawingHistory[newPointer];
       _setFramesInternal(prevFrames => {
        const newFrames = [...prevFrames];
        if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
          newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: restoredDataUrl };
        }
        return newFrames;
      });
    }
  }, [drawingHistory, drawingHistoryPointer, activeFrameIndex]);

  const canUndoDrawing = drawingHistoryPointer > 0;
  const canRedoDrawing = drawingHistoryPointer < drawingHistory.length - 1;

  const saveActiveFrameManually = async () => {
    if (!routeProjectId || activeFrameIndex < 0 || activeFrameIndex >= frames.length) {
      toast({ title: "Error", description: "Cannot save frame. No project or frame selected.", variant: "destructive" });
      return;
    }
    const frameToSave = frames[activeFrameIndex];
    if (frameToSave && frameToSave.dataUrl !== null) { // Ensure there's something to save
      try {
        toast({ title: "Saving...", description: `Saving frame ${activeFrameIndex + 1}...` });
        await saveFrameToDb(routeProjectId, activeFrameIndex, frameToSave.dataUrl, user?.uid);
        toast({ title: "Frame Saved!", description: `Frame ${activeFrameIndex + 1} has been saved to your project.` });
      } catch (error) {
        console.error("Manual save failed:", error);
        toast({ title: "Save Failed", description: "Could not save the frame. Please try again.", variant: "destructive" });
      }
    } else {
      toast({ title: "Nothing to Save", description: "Current frame is empty or has no changes.", variant: "default" });
    }
  };

  const contextValue: AnimationContextType = {
    frames,
    setFrames,
    activeFrameIndex,
    setActiveFrameIndex,
    layers, // This is now intended to be the layers of the active frame for the panel
    setLayers: (newLayersOrFn) => { // Custom setter for layers to update the active frame
        _setFramesInternal(prevFrames => {
            const newFrames = [...prevFrames];
            if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
                const currentFrame = newFrames[activeFrameIndex];
                const updatedLayers = typeof newLayersOrFn === 'function' 
                    ? newLayersOrFn(currentFrame.layers || []) 
                    : newLayersOrFn;
                newFrames[activeFrameIndex] = { ...currentFrame, layers: updatedLayers };
                setLayers(updatedLayers); // Also update the panel's view immediately
            }
            return newFrames;
        });
    },
    currentTool,
    setCurrentTool,
    projectId: routeProjectId || null,
    projectName,
    setProjectName,
    isLoadingProject,
    currentColor,
    setCurrentColor,
    brushSize,
    setBrushSize,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    undoDrawing,
    redoDrawing,
    canUndoDrawing,
    canRedoDrawing,
    saveActiveFrameManually,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = (): AnimationContextType & { _updateActiveFrameDrawing: (newDataUrl: string | null) => void } => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  // Expose internal _updateActiveFrameDrawing for canvas.tsx
  return {
    ...context,
    _updateActiveFrameDrawing: (context as any).updateActiveFrameDrawing || ((newDataUrl: string | null) => {
        // Fallback if updateActiveFrameDrawing is not directly on context type
        // This assumes 'updateActiveFrameDrawing' is a method made available by the provider logic,
        // not directly on the context type itself for external use, but canvas needs it.
        // A cleaner way would be to add it to AnimationContextType if it's meant to be part of the public API from useAnimation.
        // For now, this cast allows canvas.tsx to call the internal method.
        const internalContext = context as unknown as { updateActiveFrameDrawing: (newDataUrl: string | null) => void };
        if (internalContext.updateActiveFrameDrawing) {
            internalContext.updateActiveFrameDrawing(newDataUrl);
        } else {
            console.error("_updateActiveFrameDrawing is not available on context. This is a bug.");
        }
    }),
  };
};

