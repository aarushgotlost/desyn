
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
  layers: Layer[]; // Layers for the active frame, for the panel
  setLayers: Dispatch<SetStateAction<Layer[]>>; // Setter for the active frame's layers
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

// Stable default initial layers template. Ensure IDs are unique when instances are created.
const defaultInitialLayersTemplate: Omit<Layer, 'id'>[] = [{ name: 'Layer 1', visible: true, data: [] }];
const createDefaultLayers = (): Layer[] =>
  defaultInitialLayersTemplate.map((layer, index) => ({
    ...layer,
    id: `layer-default-${index}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  }));


export const AnimationProvider = ({ children, projectId: routeProjectId }: { children: ReactNode, projectId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [frames, _setFramesInternal] = useState<Frame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [layers, _setPanelLayers] = useState<Layer[]>(createDefaultLayers()); // State for the Layers panel (active frame's layers)
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
      // Reset all relevant states before loading new project data
      setProjectName("Loading...");
      setFps(12);
      setActiveFrameIndex(0);
      _setFramesInternal([]);
      _setPanelLayers(createDefaultLayers());
      setDrawingHistory([null]);
      setDrawingHistoryPointer(0);

      Promise.all([
        getProjectMetadata(routeProjectId),
        loadAllFrames(routeProjectId)
      ]).then(([metadata, loadedFramesDb]) => {
        setProjectName(metadata?.name || `Untitled Project ${routeProjectId.substring(routeProjectId.length - 6)}`);
        setFps(metadata?.fps || 12);

        let initialFramesToSet: Frame[];
        if (loadedFramesDb && loadedFramesDb.length > 0) {
          initialFramesToSet = loadedFramesDb.map((fDb, index) => ({
            id: fDb.id || `frame-loaded-${index}-${Date.now()}`,
            dataUrl: fDb.dataUrl || null,
            layers: (fDb.layers && fDb.layers.length > 0
              ? fDb.layers
              : createDefaultLayers()
            ).map(layer => ({ ...layer, id: layer.id || `layer-db-${index}-${Date.now()}-${Math.random()}` })) // Ensure layer IDs
          }));
        } else {
          initialFramesToSet = [{
            id: `frame-new-0-${Date.now()}`,
            dataUrl: null,
            layers: createDefaultLayers()
          }];
        }
        _setFramesInternal(initialFramesToSet);

        const newActiveIndex = 0;
        setActiveFrameIndex(newActiveIndex);

        if (initialFramesToSet.length > 0 && initialFramesToSet[newActiveIndex]) {
          const activeFrameData = initialFramesToSet[newActiveIndex];
          setDrawingHistory([activeFrameData.dataUrl]);
          setDrawingHistoryPointer(0);
          _setPanelLayers(activeFrameData.layers); // Populate panel layers from the first active frame
        } else {
           // This case should ideally not be hit if initialFramesToSet always has one frame
          setDrawingHistory([null]);
          setDrawingHistoryPointer(0);
          _setPanelLayers(createDefaultLayers());
        }
      }).catch(error => {
        console.error("Failed to load project data:", error);
        toast({title: "Load Error", description: "Failed to load animation project.", variant: "destructive"});
        const fallbackFrames: Frame[] = [{
          id: `frame-fallback-0-${Date.now()}`,
          dataUrl: null,
          layers: createDefaultLayers()
        }];
        _setFramesInternal(fallbackFrames);
        setActiveFrameIndex(0);
        setProjectName(`Untitled Project (Error)`);
        setFps(12);
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        _setPanelLayers(fallbackFrames[0].layers);
      }).finally(() => {
        setIsLoadingProject(false);
      });
    } else {
        // No routeProjectId, or it's invalid. Reset to a non-loading, clean state.
        setIsLoadingProject(false);
        _setFramesInternal([]);
        setActiveFrameIndex(0);
        _setPanelLayers(createDefaultLayers());
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        setProjectName("No Project Loaded");
        setFps(12);
    }
  }, [routeProjectId, toast]); // Removed user from deps, auth is handled by save functions

  // Effect to sync panel states (drawingHistory, layers for panel) when activeFrameIndex or frames array changes
  useEffect(() => {
    if (isLoadingProject) return; // Don't run while main data is loading

    if (frames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < frames.length) {
      const currentFrame = frames[activeFrameIndex];
      if (currentFrame) {
        setDrawingHistory([currentFrame.dataUrl]); // Reset drawing history for the new active frame
        setDrawingHistoryPointer(0);
        _setPanelLayers(currentFrame.layers); // Sync panel's layer view to the active frame's layers
      }
    } else if (frames.length === 0 && !isLoadingProject) {
      // If project is loaded but has no frames (e.g., after an error or if deletion of last frame was somehow possible)
      // Re-initialize to a single default blank frame state for the UI to remain functional.
      const defaultFrameForEmpty: Frame = {
          id: `frame-empty-default-0-${Date.now()}`, dataUrl: null, layers: createDefaultLayers()
      };
      _setFramesInternal([defaultFrameForEmpty]); // This will re-trigger this effect
      setActiveFrameIndex(0); // activeFrameIndex will be 0
      // setDrawingHistory and _setPanelLayers will be correctly set in the subsequent run of this effect.
    }
  }, [activeFrameIndex, frames, isLoadingProject]);


  // Exposed setFrames: ensures new frames always have layers.
  const setFramesDispatch: Dispatch<SetStateAction<Frame[]>> = (valueOrFn) => {
    _setFramesInternal(prevFrames => {
        const newFramesRaw = typeof valueOrFn === 'function' ? valueOrFn(prevFrames) : valueOrFn;
        // Ensure every frame in the new array has a valid layers property
        const newFramesWithLayers = newFramesRaw.map((frame, index) => {
            if (frame.layers && frame.layers.length > 0) {
                return frame;
            }
            return {
                ...frame,
                layers: createDefaultLayers().map(l => ({...l, id: `layer-dispatch-${index}-${l.id}-${Date.now()}`}))
            };
        });
        return newFramesWithLayers;
    });
  };

  // Exposed setLayers: updates panel's layer state AND the active frame's layers in the main frames array.
  const setLayersForActiveFrameAndPanel = useCallback((newLayersOrFn: SetStateAction<Layer[]>) => {
    // Update the local `layers` state for the panel immediately
    const newResolvedLayers = typeof newLayersOrFn === 'function' ? newLayersOrFn(layers) : newLayersOrFn;
    _setPanelLayers(newResolvedLayers);

    // Update the layers property of the active frame in the main `frames` state
    _setFramesInternal(prevFrames => {
        const updatedFrames = [...prevFrames];
        if (activeFrameIndex >= 0 && activeFrameIndex < updatedFrames.length && updatedFrames[activeFrameIndex]) {
            updatedFrames[activeFrameIndex] = { ...updatedFrames[activeFrameIndex], layers: newResolvedLayers };
        }
        return updatedFrames;
    });
  }, [activeFrameIndex, layers]); // `layers` is needed if newLayersOrFn is a function using prev state


  const updateActiveFrameDrawing = (newDataUrl: string | null) => {
    _setFramesInternal(prevFrames => {
      const newFrames = [...prevFrames];
      if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
        newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: newDataUrl };
      }
      return newFrames;
    });

    // Update drawing history for undo/redo
    const newHistory = drawingHistory.slice(0, drawingHistoryPointer + 1);
    newHistory.push(newDataUrl);
    while (newHistory.length > 30) { newHistory.shift(); } // Limit history size
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
    // Allow saving empty frames (dataUrl === null) to persist their state or order.
    // if (frameToSave.dataUrl === null) {
    //     toast({ title: "Nothing to Save", description: "Current frame is empty. Draw something first!", variant: "default" });
    //     return;
    // }

    if (!user?.uid) {
        toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
        return;
    }

    toast({ title: "Saving Frame...", description: `Frame ${activeFrameIndex + 1} of "${projectName}" is being saved.`, duration: 2000 });
    try {
      // Pass the layers of the frame to be saved as well.
      await saveFrameToDb(routeProjectId, activeFrameIndex, frameToSave.dataUrl, user.uid, frameToSave.layers);
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
    layers, // This is the _panelLayers state
    setLayers: setLayersForActiveFrameAndPanel, // This is the new combined setter
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

  // Expose updateActiveFrameDrawing which is internal to the provider
  const internalUpdateDrawing = (context as any).updateActiveFrameDrawing || ((newDataUrl: string | null) => {
    const internalContext = context as unknown as { updateActiveFrameDrawing: (newDataUrl: string | null) => void };
    if (internalContext.updateActiveFrameDrawing) {
        internalContext.updateActiveFrameDrawing(newDataUrl);
    } else {
        // Fallback, should ideally not be needed if `updateActiveFrameDrawing` is correctly exposed or context structure changes
        context.setFrames(prevFrames => {
            const newFrames = [...prevFrames];
            if (context.activeFrameIndex >= 0 && context.activeFrameIndex < newFrames.length && newFrames[context.activeFrameIndex]) {
                newFrames[context.activeFrameIndex] = { ...newFrames[context.activeFrameIndex], dataUrl: newDataUrl };
            }
            return newFrames;
        });
    }
  });

  return {
    ...context,
    _updateActiveFrameDrawing: internalUpdateDrawing,
  };
};

