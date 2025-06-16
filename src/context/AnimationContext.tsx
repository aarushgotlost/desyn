
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useContext, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { loadAllFrames, saveFrameToDb, getProjectMetadata } from '@/lib/animationUtils';
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
  const [_panelLayers, _setPanelLayersInternal] = useState<Layer[]>(createDefaultLayers()); // Internal state for panel
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
      _setFramesInternal([]); // Clear frames
      _setPanelLayersInternal(createDefaultLayers()); // Reset panel layers
      setDrawingHistory([null]); // Reset drawing history
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
            ).map(layer => ({ ...layer, id: layer.id || `layer-db-${index}-${Date.now()}-${Math.random()}` }))
          }));
        } else {
          initialFramesToSet = [{
            id: `frame-new-0-${Date.now()}`,
            dataUrl: null,
            layers: createDefaultLayers()
          }];
        }
        _setFramesInternal(initialFramesToSet); // Set the main frames array

        const newActiveIndex = 0; // Always start with the first frame
        setActiveFrameIndex(newActiveIndex);

        // Initialize panel layers and drawing history based on the (new) active frame
        if (initialFramesToSet.length > 0 && initialFramesToSet[newActiveIndex]) {
          const activeFrameData = initialFramesToSet[newActiveIndex];
          setDrawingHistory([activeFrameData.dataUrl]);
          setDrawingHistoryPointer(0);
          _setPanelLayersInternal(activeFrameData.layers);
        } else {
          // This fallback should ideally not be reached if initialFramesToSet is always populated
          setDrawingHistory([null]);
          setDrawingHistoryPointer(0);
          _setPanelLayersInternal(createDefaultLayers());
        }
      }).catch(error => {
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
        _setPanelLayersInternal(fallbackFrames[0].layers);
      }).finally(() => {
        setIsLoadingProject(false);
      });
    } else {
        setIsLoadingProject(false);
        _setFramesInternal([]);
        setActiveFrameIndex(0);
        _setPanelLayersInternal(createDefaultLayers());
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        setProjectName("No Project Loaded");
        setFps(12);
    }
  }, [routeProjectId, toast]);


  // Effect to sync panel states (drawingHistory, panel's layers) when activeFrameIndex changes or frames array updates.
  useEffect(() => {
    if (isLoadingProject) return; // Don't run while main data is loading

    if (frames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < frames.length) {
      const currentFrame = frames[activeFrameIndex];
      if (currentFrame) {
        if (drawingHistory[drawingHistoryPointer] !== currentFrame.dataUrl) {
            setDrawingHistory([currentFrame.dataUrl]);
            setDrawingHistoryPointer(0);
        }
        _setPanelLayersInternal(currentFrame.layers); 
      }
    } else if (frames.length === 0 && !isLoadingProject) {
      const defaultFrameForEmpty: Frame = {
          id: `frame-empty-default-0-${Date.now()}`, dataUrl: null, layers: createDefaultLayers()
      };
      _setFramesInternal([defaultFrameForEmpty]); 
      setActiveFrameIndex(0);
    }
  }, [activeFrameIndex, frames, isLoadingProject, drawingHistory, drawingHistoryPointer]);


  const setFramesDispatch: Dispatch<SetStateAction<Frame[]>> = useCallback((valueOrFn) => {
    _setFramesInternal(prevFrames => {
        const newFramesRaw = typeof valueOrFn === 'function' ? valueOrFn(prevFrames) : valueOrFn;
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
  }, []);

  const setLayersForActiveFrameAndPanel = useCallback((newLayersOrFn: SetStateAction<Layer[]>) => {
    _setPanelLayersInternal(newLayersOrFn); 

    _setFramesInternal(prevFrames => {
        const updatedFrames = [...prevFrames];
        if (activeFrameIndex >= 0 && activeFrameIndex < updatedFrames.length && updatedFrames[activeFrameIndex]) {
            const resolvedNewLayers = typeof newLayersOrFn === 'function' ? newLayersOrFn(updatedFrames[activeFrameIndex].layers) : newLayersOrFn;
            updatedFrames[activeFrameIndex] = { ...updatedFrames[activeFrameIndex], layers: resolvedNewLayers };
        }
        return updatedFrames;
    });
  }, [activeFrameIndex]);


  const updateActiveFrameDrawing = (newDataUrl: string | null) => {
    _setFramesInternal(prevFrames => {
      const newFrames = [...prevFrames];
      if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
        newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: newDataUrl };
      }
      return newFrames;
    });

    setDrawingHistory(prevHistory => {
        const newHistorySlice = prevHistory.slice(0, drawingHistoryPointer + 1);
        newHistorySlice.push(newDataUrl);
        while (newHistorySlice.length > 30) { newHistorySlice.shift(); }
        setDrawingHistoryPointer(newHistorySlice.length - 1);
        return newHistorySlice;
    });
  };

  const undoDrawing = useCallback(() => {
    if (drawingHistoryPointer > 0) {
      const newPointer = drawingHistoryPointer - 1;
      const restoredDataUrl = drawingHistory[newPointer];
      _setFramesInternal(prevFrames => {
        const newFrames = [...prevFrames];
        if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
          newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: restoredDataUrl };
        }
        return newFrames;
      });
      setDrawingHistoryPointer(newPointer); 
    }
  }, [drawingHistory, drawingHistoryPointer, activeFrameIndex]);

  const redoDrawing = useCallback(() => {
    if (drawingHistoryPointer < drawingHistory.length - 1) {
      const newPointer = drawingHistoryPointer + 1;
      const restoredDataUrl = drawingHistory[newPointer];
       _setFramesInternal(prevFrames => {
        const newFrames = [...prevFrames];
        if (activeFrameIndex >= 0 && activeFrameIndex < newFrames.length && newFrames[activeFrameIndex]) {
          newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl: restoredDataUrl };
        }
        return newFrames;
      });
       setDrawingHistoryPointer(newPointer); 
    }
  }, [drawingHistory, drawingHistoryPointer, activeFrameIndex]);

  const canUndoDrawing = drawingHistoryPointer > 0;
  const canRedoDrawing = drawingHistoryPointer < drawingHistory.length - 1;

  const saveActiveFrameManually = async () => {
    if (!routeProjectId) {
      toast({ title: "Save Error", description: "Project ID is not available.", variant: "destructive" });
      return;
    }
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    if (activeFrameIndex < 0 || activeFrameIndex >= frames.length) {
      toast({ title: "Save Error", description: "Invalid active frame selected or frame index is out of bounds.", variant: "destructive" });
      return;
    }
    const frameToSave = frames[activeFrameIndex];
    if (!frameToSave) {
        toast({ title: "Save Error", description: "Active frame data is missing.", variant: "destructive" });
        return;
    }

    const { id: savingToastId } = toast({
      title: "Saving Frame...",
      description: `Frame ${activeFrameIndex + 1} of "${projectName || 'Untitled Project'}" is being saved.`,
      duration: 100000, 
    });

    try {
      await saveFrameToDb(routeProjectId, activeFrameIndex, frameToSave.dataUrl, user.uid, frameToSave.layers);
      
      toast({ 
        id: savingToastId,
        title: "Frame Saved!",
        description: `Frame ${activeFrameIndex + 1} for "${projectName || 'Untitled Project'}" has been successfully saved.`,
        variant: "default",
        open: false, 
      });
      toast({
        title: "Frame Saved!",
        description: `Frame ${activeFrameIndex + 1} for "${projectName || 'Untitled Project'}" has been successfully saved.`,
        duration: 3000,
      });

    } catch (error: any) {
      toast({ 
        id: savingToastId,
        title: "Save Failed",
        description: error.message || "Could not save the frame. Please try again.",
        variant: "destructive",
        open: false, 
      });
      toast({
        title: "Save Failed",
        description: error.message || "Could not save the frame. Please try again.",
        variant: "destructive",
        duration: 7000,
      });
    }
  };

  const contextValue: AnimationContextType = {
    frames,
    setFrames: setFramesDispatch,
    activeFrameIndex,
    setActiveFrameIndex,
    layers: _panelLayers,
    setLayers: setLayersForActiveFrameAndPanel,
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
  
  const _updateActiveFrameDrawing = (context as any).updateActiveFrameDrawing || ((newDataUrl: string | null) => {
    const { setFrames: _setFrames, activeFrameIndex: _activeIndex, drawingHistory: _hist, drawingHistoryPointer: _histPtr, setDrawingHistory: _setHist, setDrawingHistoryPointer: _setHistPtr } = context as any;

    _setFrames((prevFrames: Frame[]) => {
      const newFrames = [...prevFrames];
      if (_activeIndex >= 0 && _activeIndex < newFrames.length && newFrames[_activeIndex]) {
        newFrames[_activeIndex] = { ...newFrames[_activeIndex], dataUrl: newDataUrl };
      }
      return newFrames;
    });

    if (_setHist && _setHistPtr) { 
        _setHist((prevHistory: (string | null)[]) => {
            const newHistorySlice = prevHistory.slice(0, _histPtr + 1);
            newHistorySlice.push(newDataUrl);
            while (newHistorySlice.length > 30) { newHistorySlice.shift(); }
            _setHistPtr(newHistorySlice.length - 1);
            return newHistorySlice;
        });
    }
  });


  return {
    ...context,
    _updateActiveFrameDrawing,
  };
};

