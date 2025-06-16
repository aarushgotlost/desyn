
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
  setLayers: Dispatch<SetStateAction<Layer[]>>;
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
      setLayers([...defaultInitialLayers.map(l => ({...l, id: `layer-reset-${l.id}-${Date.now()}`}))]); 
      setActiveFrameIndex(0); // Reset active frame index for new project
      _setFramesInternal([]); // Clear previous project frames
      setDrawingHistory([null]); // Reset drawing history
      setDrawingHistoryPointer(0);

      Promise.all([
        getProjectMetadata(routeProjectId),
        loadAllFrames(routeProjectId)
      ]).then(([metadata, loadedFrames]) => {
        if (metadata) {
          setProjectName(metadata.name);
          setFps(metadata.fps || 12);
        } else {
          setProjectName(`Untitled Project ${routeProjectId.substring(routeProjectId.length - 6)}`);
          setFps(12); // Default FPS if no metadata
        }

        let initialFramesToSet: Frame[];
        if (loadedFrames && loadedFrames.length > 0) {
          initialFramesToSet = loadedFrames.map((f, index) => ({
            id: f.id || `frame-${index}-${Date.now()}`,
            dataUrl: f.dataUrl || null,
            layers: f.layers && f.layers.length > 0 ? f.layers : [...defaultInitialLayers.map(l => ({...l, id: `layer-loaded-${index}-${l.id}-${Date.now()}`}))] 
          }));
        } else {
          // This is the critical path for new/empty projects
          initialFramesToSet = [{ 
            id: `frame-0-${Date.now()}`, 
            dataUrl: null, 
            layers: [...defaultInitialLayers.map(l => ({...l, id: `layer-initial-0-${l.id}-${Date.now()}`}))] 
          }];
        }
        _setFramesInternal(initialFramesToSet);
        // setActiveFrameIndex(0) is already set, but confirming it after frames are set is fine.
        // If initialFramesToSet has items, 0 is a valid index.
        const newActiveIndex = 0; // Always start at frame 0 for a newly loaded/created project
        setActiveFrameIndex(newActiveIndex); 

        if (initialFramesToSet.length > 0 && initialFramesToSet[newActiveIndex]) {
          setDrawingHistory([initialFramesToSet[newActiveIndex].dataUrl]);
          setDrawingHistoryPointer(0);
          if (initialFramesToSet[newActiveIndex].layers && initialFramesToSet[newActiveIndex].layers.length > 0) {
            setLayers(initialFramesToSet[newActiveIndex].layers);
          } else {
            setLayers([...defaultInitialLayers.map(l => ({...l, id: `layer-fallbacklayers-${newActiveIndex}-${l.id}-${Date.now()}`}))]);
          }
        } else { 
          // This case should ideally not be reached if initialFramesToSet always gets at least one frame.
          setDrawingHistory([null]);
          setDrawingHistoryPointer(0);
          setLayers([...defaultInitialLayers.map(l => ({...l, id: `layer-emptylogic-${l.id}-${Date.now()}`}))]);
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
        setProjectName(`Untitled Project ${routeProjectId.substring(routeProjectId.length - 6)}`);
        setFps(12);
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        setLayers([...defaultInitialLayers.map(l => ({...l, id: `layer-catch-${l.id}-${Date.now()}`}))]);
      }).finally(() => {
        setIsLoadingProject(false);
      });
    }
  }, [routeProjectId]); // Only run when routeProjectId changes

  useEffect(() => {
    // This effect updates drawing history and layers panel when activeFrameIndex changes
    // or when the frames array itself is entirely replaced (e.g., new project loaded).
    if (frames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < frames.length) {
      const currentFrame = frames[activeFrameIndex];
      setDrawingHistory([currentFrame?.dataUrl]); 
      setDrawingHistoryPointer(0);
      if (currentFrame?.layers && currentFrame.layers.length > 0) {
        setLayers(currentFrame.layers);
      } else {
        const defaultLayersForActiveFrame = [...defaultInitialLayers.map(l => ({...l, id: `layer-active-${activeFrameIndex}-${l.id}-${Date.now()}`}))];
        setLayers(defaultLayersForActiveFrame);
        // Ensure the frame object in state also has these default layers if it was missing them
        _setFramesInternal(prev => {
            const newFrames = [...prev];
            if(newFrames[activeFrameIndex] && (!newFrames[activeFrameIndex].layers || newFrames[activeFrameIndex].layers.length === 0)) {
                newFrames[activeFrameIndex] = {...newFrames[activeFrameIndex], layers: defaultLayersForActiveFrame};
            }
            return newFrames;
        });
      }
    } else if (frames.length === 0 && !isLoadingProject) { 
        // This case might occur if a project is cleared or an error happens after initial load.
        // Ensure a default state is maintained for the UI.
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        setLayers([...defaultInitialLayers.map(l => ({...l, id: `layer-emptyframes-${l.id}-${Date.now()}`}))]);
    }
  }, [activeFrameIndex, frames, isLoadingProject]);


  const setFramesDispatch: Dispatch<SetStateAction<Frame[]>> = (valueOrFn) => {
    _setFramesInternal(prevFrames => {
        const newFrames = typeof valueOrFn === 'function' ? valueOrFn(prevFrames) : valueOrFn;
        if (newFrames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < newFrames.length) {
            const currentActiveFrame = newFrames[activeFrameIndex];
            if (currentActiveFrame && currentActiveFrame.layers && currentActiveFrame.layers.length > 0) {
                // Do not call setLayers here directly to avoid loops.
                // The useEffect listening to 'frames' and 'activeFrameIndex' will handle updating the layers panel.
            } else {
                // If the active frame has no layers (e.g., after a delete/add operation),
                // the useEffect above will reset the panel.
            }
        } else if (newFrames.length === 0) {
            setActiveFrameIndex(0); 
            // The useEffect above will handle resetting layers and drawing history for empty frames.
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
    if (!frameToSave) {
        toast({ title: "Error", description: "Active frame data is missing.", variant: "destructive" });
        return;
    }
    if (frameToSave.dataUrl === null) {
        toast({ title: "Nothing to Save", description: "Current frame is empty. Draw something first!", variant: "default" });
        return;
    }

    if (!user?.uid) {
        toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
        return;
    }

    toast({ title: "Saving Frame...", description: `Frame ${activeFrameIndex + 1} of "${projectName}" is being saved.`, duration: 2000 });
    try {
      await saveFrameToDb(routeProjectId, activeFrameIndex, frameToSave.dataUrl, user.uid);
      toast({ title: "Frame Saved!", description: `Frame ${activeFrameIndex + 1} for "${projectName}" has been successfully saved.`, duration: 3000 });
    } catch (error: any) {
      console.error("Manual save failed:", error);
      toast({ title: "Save Failed", description: error.message || "Could not save the frame. Please try again.", variant: "destructive", duration: 5000 });
    }
  };

  const contextValue: AnimationContextType = {
    frames,
    setFrames: setFramesDispatch,
    activeFrameIndex,
    setActiveFrameIndex,
    layers, 
    setLayers: (newLayersOrFn) => { 
        _setFramesInternal(prevFrames => {
            const newFrames = [...prevFrames];
            if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
                const currentFrame = newFrames[activeFrameIndex];
                const updatedLayers = typeof newLayersOrFn === 'function' 
                    ? newLayersOrFn(currentFrame.layers || []) 
                    : newLayersOrFn;
                newFrames[activeFrameIndex] = { ...currentFrame, layers: updatedLayers };
                // The actual update to the panel's `layers` state is now handled by the useEffect
                // that listens to `frames` and `activeFrameIndex`.
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
  
  // Expose internal updateActiveFrameDrawing for canvas.tsx
  // This is a bit of a workaround for direct access. A more formal way might be needed if this pattern grows.
  const internalUpdate = (context as any).updateActiveFrameDrawing || ((newDataUrl: string | null) => {
    const internalContext = context as unknown as { updateActiveFrameDrawing: (newDataUrl: string | null) => void };
    if (internalContext.updateActiveFrameDrawing) {
        internalContext.updateActiveFrameDrawing(newDataUrl);
    } else {
        // Fallback to modifying frames directly if the specific method isn't found (should not happen)
        context.setFrames(prevFrames => {
            const newFrames = [...prevFrames];
            if (context.activeFrameIndex >= 0 && context.activeFrameIndex < newFrames.length && newFrames[context.activeFrameIndex]) {
                newFrames[context.activeFrameIndex] = { ...newFrames[context.activeFrameIndex], dataUrl: newDataUrl };
            }
            return newFrames;
        });
        console.warn("_updateActiveFrameDrawing was not directly available, used fallback setFrames.");
    }
  });


  return {
    ...context,
    _updateActiveFrameDrawing: internalUpdate,
  };
};
