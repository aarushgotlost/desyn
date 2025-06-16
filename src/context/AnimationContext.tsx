
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useContext, useEffect, Dispatch, SetStateAction, useCallback, useMemo, useRef } from 'react';
import { loadAllFrames, saveFrameToDb, saveAllFramesToDb, getProjectMetadata } from '@/lib/animationUtils';
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
  layers: Layer[]; // Represents layers of the active frame for the panel
  setLayers: (newLayersOrFn: SetStateAction<Layer[]>) => void; // Updates panel and active frame's layers
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

  updateActiveFrameDrawing: (newDataUrl: string | null) => void;
  undoDrawing: () => void;
  redoDrawing: () => void;
  canUndoDrawing: boolean;
  canRedoDrawing: boolean;

  saveActiveFrameManually: () => Promise<void>;
  saveAllFramesManually: () => Promise<void>;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

const defaultInitialLayersTemplate: Omit<Layer, 'id'>[] = [{ name: 'Layer 1', visible: true, data: [] }];
const createDefaultLayers = (frameIdPrefix: string = 'default'): Layer[] =>
  defaultInitialLayersTemplate.map((layer, index) => ({
    ...layer,
    id: `layer-${frameIdPrefix}-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  }));


export const AnimationProvider = ({ children, projectId: routeProjectId }: { children: ReactNode, projectId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [_framesInternal, _setFramesInternal] = useState<Frame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [_panelLayers, _setPanelLayersInternal] = useState<Layer[]>(createDefaultLayers('panel-initial'));
  const [currentTool, setCurrentTool] = useState<string>('brush');
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(12);
  const [projectName, setProjectName] = useState<string>("Untitled Animation");

  const [drawingHistory, setDrawingHistory] = useState<(string | null)[]>([]);
  const [drawingHistoryPointer, setDrawingHistoryPointer] = useState<number>(-1);

  const framesRef = useRef(_framesInternal);
  useEffect(() => {
    framesRef.current = _framesInternal;
  }, [_framesInternal]);

  const activeFrameIndexRef = useRef(activeFrameIndex);
  useEffect(() => {
    activeFrameIndexRef.current = activeFrameIndex;
  }, [activeFrameIndex]);


  useEffect(() => {
    // This effect runs when the routeProjectId (from URL) changes
    if (!routeProjectId) {
      setIsLoadingProject(false);
      setProjectName("No Project Loaded");
      setFps(12);
      setActiveFrameIndex(0);
      const defaultNoProjFrame: Frame = { id: `frame-no-project-0-${Date.now()}`, dataUrl: null, layers: createDefaultLayers('no-proj') };
      _setFramesInternal([defaultNoProjFrame]);
      _setPanelLayersInternal(defaultNoProjFrame.layers);
      setDrawingHistory([null]);
      setDrawingHistoryPointer(0);
      return;
    }
    
    setIsLoadingProject(true);
    // Reset state for the new project
    setProjectName("Loading..."); 
    setFps(12); 
    setActiveFrameIndex(0); 
    _setFramesInternal([]); 
    _setPanelLayersInternal(createDefaultLayers('loading')); 
    setDrawingHistory([null]); 
    setDrawingHistoryPointer(0);

    Promise.all([
      getProjectMetadata(routeProjectId),
      loadAllFrames(routeProjectId)
    ]).then(([metadata, loadedFramesDb]) => {
      setProjectName(metadata?.name || `Project ${routeProjectId.substring(routeProjectId.length - 4)}`);
      setFps(metadata?.fps || 12);

      let initialFramesToSet: Frame[];
      if (loadedFramesDb && loadedFramesDb.length > 0) {
        initialFramesToSet = loadedFramesDb.map((fDb, index) => ({
          id: fDb.id || `frame-loaded-${index}-${Date.now()}`,
          dataUrl: fDb.dataUrl || null,
          layers: (fDb.layers && fDb.layers.length > 0
            ? fDb.layers
            : createDefaultLayers(`loaded-${index}`)
          ).map((layer, lIdx) => ({ ...layer, id: layer.id || `layer-db-${index}-${lIdx}-${Date.now()}-${Math.random().toString(36).substring(2,7)}` }))
        }));
      } else {
        const newFrameId = `frame-new-0-${Date.now()}`;
        initialFramesToSet = [{
          id: newFrameId, 
          dataUrl: null, 
          layers: createDefaultLayers(newFrameId)
        }];
      }
      _setFramesInternal(initialFramesToSet);

      const newActiveIndex = 0; // Always start at the first frame for a newly loaded project
      setActiveFrameIndex(newActiveIndex);

      if (initialFramesToSet.length > 0 && initialFramesToSet[newActiveIndex]) {
        const activeFrameData = initialFramesToSet[newActiveIndex];
        setDrawingHistory([activeFrameData.dataUrl]);
        setDrawingHistoryPointer(0);
        _setPanelLayersInternal(activeFrameData.layers || createDefaultLayers(`active-init-${activeFrameData.id}`));
      } else {
        // Fallback if initialFramesToSet somehow ends up empty (should ideally not happen)
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
        _setPanelLayersInternal(createDefaultLayers('fallback-empty'));
      }
    }).catch(error => {
      toast({title: "Load Error", description: `Failed to load animation project: ${error.message}`, variant: "destructive"});
      const fallbackFrameId = `frame-fallback-0-${Date.now()}`;
      const fallbackFrames: Frame[] = [{
        id: fallbackFrameId,
        dataUrl: null,
        layers: createDefaultLayers(fallbackFrameId)
      }];
      _setFramesInternal(fallbackFrames);
      setActiveFrameIndex(0);
      setProjectName(`Untitled Project (Error)`);
      setFps(12);
      setDrawingHistory([null]);
      setDrawingHistoryPointer(0);
      _setPanelLayersInternal(fallbackFrames[0]?.layers || createDefaultLayers('fallback-error'));
    }).finally(() => {
      setIsLoadingProject(false);
    });
  }, [routeProjectId, toast]);


  useEffect(() => {
    if (isLoadingProject || _framesInternal.length === 0) return;

    const currentFrame = _framesInternal[activeFrameIndex];
    if (currentFrame) {
      if (drawingHistoryPointer === -1 || drawingHistory[drawingHistoryPointer] !== currentFrame.dataUrl) {
        setDrawingHistory([currentFrame.dataUrl]);
        setDrawingHistoryPointer(0);
      }
      _setPanelLayersInternal(currentFrame.layers || createDefaultLayers(`sync-${currentFrame.id}`));
    } else if (_framesInternal.length > 0 && (activeFrameIndex < 0 || activeFrameIndex >= _framesInternal.length)) {
        // Active index is out of bounds, reset to 0
        setActiveFrameIndex(0); 
        // The effect will re-run with the new activeFrameIndex to sync layers and history
    }
     // If _framesInternal becomes empty AND not loading, it indicates an issue, main effect should handle reset.
  }, [activeFrameIndex, _framesInternal, isLoadingProject, drawingHistory, drawingHistoryPointer]);


  const setFramesDispatch: Dispatch<SetStateAction<Frame[]>> = useCallback((valueOrFn) => {
    _setFramesInternal(prevFrames => {
        const newFramesRaw = typeof valueOrFn === 'function' ? valueOrFn(prevFrames) : valueOrFn;
        return newFramesRaw.map((frame, index) => {
            const frameId = frame.id || `frame-dispatch-${index}-${Date.now()}`;
            return {
                ...frame,
                id: frameId,
                layers: (frame.layers && frame.layers.length > 0
                    ? frame.layers
                    : createDefaultLayers(frameId)
                  ).map((l, lIdx) => ({...l, id: l.id || `layer-dispatch-${frameId}-${lIdx}-${Date.now()}`}))
            };
        });
    });
  }, []);

  const setLayersForActiveFrameAndPanel = useCallback((newLayersOrFn: SetStateAction<Layer[]>) => {
    _setPanelLayersInternal(prevPanelLayers => {
        const resolvedNewLayers = typeof newLayersOrFn === 'function' ? newLayersOrFn(prevPanelLayers) : newLayersOrFn;
        
        _setFramesInternal(prevFrames => {
            const updatedFrames = [...prevFrames];
            const currentActiveFrameIndex = activeFrameIndexRef.current; // Use ref for current index
            if (currentActiveFrameIndex >= 0 && currentActiveFrameIndex < updatedFrames.length && updatedFrames[currentActiveFrameIndex]) {
                updatedFrames[currentActiveFrameIndex] = { 
                    ...updatedFrames[currentActiveFrameIndex], 
                    layers: resolvedNewLayers 
                };
            }
            return updatedFrames;
        });
        return resolvedNewLayers; 
    });
  }, []); // activeFrameIndexRef ensures stability if activeFrameIndex changes during this callback's lifecycle


  const updateActiveFrameDrawing = useCallback((newDataUrl: string | null) => {
    _setFramesInternal(prevFrames => {
      const newFrames = [...prevFrames];
      const currentActiveFrameIndex = activeFrameIndexRef.current;
      if (currentActiveFrameIndex >= 0 && currentActiveFrameIndex < newFrames.length && newFrames[currentActiveFrameIndex]) {
        newFrames[currentActiveFrameIndex] = { ...newFrames[currentActiveFrameIndex], dataUrl: newDataUrl };
      }
      return newFrames;
    });

    setDrawingHistory(prevHistory => {
        const newHistorySlice = prevHistory.slice(0, drawingHistoryPointer + 1);
        newHistorySlice.push(newDataUrl);
        // Limit history size
        const limitedHistory = newHistorySlice.slice(-30);
        setDrawingHistoryPointer(limitedHistory.length - 1);
        return limitedHistory;
    });
  }, [drawingHistoryPointer]); // Removed activeFrameIndexRef as it's not directly used for deps here

  const undoDrawing = useCallback(() => {
    if (drawingHistoryPointer > 0) {
      const newPointer = drawingHistoryPointer - 1;
      const restoredDataUrl = drawingHistory[newPointer];
      _setFramesInternal(prevFrames => {
        const newFrames = [...prevFrames];
        const currentActiveFrameIndex = activeFrameIndexRef.current;
        if (currentActiveFrameIndex >= 0 && currentActiveFrameIndex < newFrames.length && newFrames[currentActiveFrameIndex]) {
          newFrames[currentActiveFrameIndex] = { ...newFrames[currentActiveFrameIndex], dataUrl: restoredDataUrl };
        }
        return newFrames;
      });
      setDrawingHistoryPointer(newPointer);
    }
  }, [drawingHistory, drawingHistoryPointer]);

  const redoDrawing = useCallback(() => {
    if (drawingHistoryPointer < drawingHistory.length - 1) {
      const newPointer = drawingHistoryPointer + 1;
      const restoredDataUrl = drawingHistory[newPointer];
       _setFramesInternal(prevFrames => {
        const newFrames = [...prevFrames];
        const currentActiveFrameIndex = activeFrameIndexRef.current;
        if (currentActiveFrameIndex >= 0 && currentActiveFrameIndex < newFrames.length && newFrames[currentActiveFrameIndex]) {
          newFrames[currentActiveFrameIndex] = { ...newFrames[currentActiveFrameIndex], dataUrl: restoredDataUrl };
        }
        return newFrames;
      });
       setDrawingHistoryPointer(newPointer);
    }
  }, [drawingHistory, drawingHistoryPointer]);

  const canUndoDrawing = drawingHistoryPointer > 0;
  const canRedoDrawing = drawingHistoryPointer < drawingHistory.length - 1;

  const saveActiveFrameManually = useCallback(async () => {
    if (routeProjectId === null || routeProjectId === undefined || routeProjectId.trim() === "") {
      toast({ title: "Save Error", description: "Project ID is not available.", variant: "destructive" });
      return;
    }
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    
    const currentActiveFrameIndex = activeFrameIndexRef.current;
    const currentFrames = framesRef.current;

    if (currentActiveFrameIndex < 0 || currentActiveFrameIndex >= currentFrames.length) {
      toast({ title: "Save Error", description: "Invalid active frame selected.", variant: "destructive" });
      return;
    }
    const frameToSave = currentFrames[currentActiveFrameIndex];
    if (!frameToSave) {
        toast({ title: "Save Error", description: "Active frame data is missing.", variant: "destructive" });
        return;
    }

    const currentProjectNameForToast = projectName || "Untitled Project";
    const { id: savingToastId } = toast({
      title: "Saving Frame...",
      description: `Frame ${currentActiveFrameIndex + 1} of "${currentProjectNameForToast}" is being saved.`,
      duration: 100000, 
    });

    try {
      await saveFrameToDb(routeProjectId, currentActiveFrameIndex, frameToSave.dataUrl, user.uid, frameToSave.layers);
      toast.dismiss(savingToastId);
      toast({
        title: "Frame Saved!",
        description: `Frame ${currentActiveFrameIndex + 1} for "${currentProjectNameForToast}" has been successfully saved.`,
        duration: 3000,
      });
    } catch (error: any) {
      toast.dismiss(savingToastId);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save the frame. Please try again.",
        variant: "destructive",
        duration: 7000,
      });
    }
  }, [routeProjectId, user, toast, projectName]);


  const saveAllFramesManually = useCallback(async () => {
    if (routeProjectId === null || routeProjectId === undefined || routeProjectId.trim() === "") {
      toast({ title: "Save All Error", description: "Project ID is not available.", variant: "destructive" });
      return;
    }
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to save all frames.", variant: "destructive" });
      return;
    }

    const currentFrames = framesRef.current;
    if (currentFrames.length === 0) {
      toast({ title: "Save All Error", description: "No frames to save.", variant: "default" });
      return;
    }

    const currentProjectNameForToast = projectName || "Untitled Project";
    const currentFpsForSave = fps || 12;
    const { id: savingAllToastId } = toast({
      title: "Saving All Frames...",
      description: `All ${currentFrames.length} frames for "${currentProjectNameForToast}" are being saved.`,
      duration: 100000, 
    });

    try {
      await saveAllFramesToDb(routeProjectId, currentFrames, user.uid, currentProjectNameForToast, currentFpsForSave);
      toast.dismiss(savingAllToastId);
      toast({
        title: "All Frames Saved!",
        description: `All ${currentFrames.length} frames for "${currentProjectNameForToast}" have been successfully saved.`,
        duration: 4000,
      });
    } catch (error: any) {
      toast.dismiss(savingAllToastId);
      toast({
        title: "Save All Failed",
        description: error.message || "Could not save all frames. Please try again.",
        variant: "destructive",
        duration: 7000,
      });
    }
  }, [routeProjectId, user, toast, projectName, fps]);


  const contextValue: AnimationContextType = useMemo(() => ({
    frames: _framesInternal,
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
    updateActiveFrameDrawing,
    undoDrawing,
    redoDrawing,
    canUndoDrawing,
    canRedoDrawing,
    saveActiveFrameManually,
    saveAllFramesManually,
  }), [
    _framesInternal, setFramesDispatch, activeFrameIndex, 
    _panelLayers, setLayersForActiveFrameAndPanel, currentTool, 
    routeProjectId, projectName, isLoadingProject, currentColor, brushSize,
    isPlaying, fps, updateActiveFrameDrawing, undoDrawing, redoDrawing,
    canUndoDrawing, canRedoDrawing, saveActiveFrameManually, saveAllFramesManually
  ]);

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};
