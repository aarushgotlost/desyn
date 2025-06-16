
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useContext, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { loadAllFrames, saveFrame as saveFrameToDb, getProjectMetadata } from '@/lib/animationUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Define types for context values
interface Frame {
  id: string; 
  dataUrl: string | null; 
  layers: Layer[]; 
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  data?: any[]; 
}

interface AnimationContextType {
  frames: Frame[];
  setFrames: Dispatch<SetStateAction<Frame[]>>; // This will be the history-aware setter
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

  // Undo/Redo for drawing
  undoDrawing: () => void;
  redoDrawing: () => void;
  canUndoDrawing: boolean;
  canRedoDrawing: boolean;
  
  // Manual Save
  saveActiveFrameManually: () => Promise<void>;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider = ({ children, projectId: routeProjectId }: { children: ReactNode, projectId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [frames, _setFramesInternal] = useState<Frame[]>([]); // Internal state for frames
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-0', name: 'Layer 1', visible: true, data: [] }
  ]);
  const [currentTool, setCurrentTool] = useState<string>('brush'); 
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(12);
  const [projectName, setProjectName] = useState<string>("Untitled Animation");


  // State for active frame's drawing history (Undo/Redo)
  const [drawingHistory, setDrawingHistory] = useState<(string | null)[]>([]);
  const [drawingHistoryPointer, setDrawingHistoryPointer] = useState<number>(-1);

  // Load project data (metadata and frames)
  useEffect(() => {
    if (routeProjectId) {
      setIsLoadingProject(true);
      Promise.all([
        getProjectMetadata(routeProjectId),
        loadAllFrames(routeProjectId)
      ]).then(([metadata, loadedFrames]) => {
        if (metadata) {
          setProjectName(metadata.name);
          setFps(metadata.fps || 12);
        } else {
          setProjectName(`Untitled Animation ${routeProjectId.substring(routeProjectId.length - 6)}`);
        }

        let initialFrames: Frame[];
        if (loadedFrames && loadedFrames.length > 0) {
          initialFrames = loadedFrames.map((f, index) => ({
            id: f.id || `frame-${index}-${Date.now()}`, // Ensure unique ID
            dataUrl: f.dataUrl || null,
            layers: f.layers || [{ id: 'default-layer-0', name: 'Layer 1', visible: true, data: [] }] 
          }));
        } else {
          // Ensure at least one frame exists by default
          initialFrames = [{ id: `frame-0-${Date.now()}`, dataUrl: null, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true, data: [] }] }];
        }
        _setFramesInternal(initialFrames);
        setActiveFrameIndex(0);

        // Initialize drawing history for the first active frame
        if (initialFrames.length > 0 && initialFrames[0]) {
          setDrawingHistory([initialFrames[0].dataUrl]);
          setDrawingHistoryPointer(0);
        } else {
          // This case should ideally not be hit if initialFrames is always populated
          setDrawingHistory([null]); 
          setDrawingHistoryPointer(0);
        }
      }).catch(error => {
        console.error("Failed to load project data:", error);
        // Fallback: ensure at least one frame exists even on error
        const defaultFrameId = `frame-0-${Date.now()}`;
        _setFramesInternal([{ id: defaultFrameId, dataUrl: null, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true, data: [] }] }]);
        setActiveFrameIndex(0);
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
      }).finally(() => {
        setIsLoadingProject(false);
      });
    }
  }, [routeProjectId]);

  // Effect to reset/update drawing history when activeFrameIndex changes
  useEffect(() => {
    if (frames.length > 0 && activeFrameIndex >= 0 && activeFrameIndex < frames.length) {
      const activeFrameDataUrl = frames[activeFrameIndex]?.dataUrl;
      setDrawingHistory([activeFrameDataUrl]); // Start history for new active frame
      setDrawingHistoryPointer(0);
    } else if (frames.length === 0) { // Handle case where all frames might be deleted
        setDrawingHistory([null]);
        setDrawingHistoryPointer(0);
    }
  }, [activeFrameIndex, frames]);


  // Wrapper for _setFramesInternal that consumers will use (not for history management, direct state update)
  const setFrames: Dispatch<SetStateAction<Frame[]>> = (newFramesValue) => {
    // This setFrames is for structural changes like adding/deleting frames, not drawing updates.
    // Drawing updates should use updateActiveFrameDrawing.
    _setFramesInternal(newFramesValue);
    // If a structural change happens, drawing history for the *current* active frame might be invalidated or become complex to manage.
    // For now, we'll reset it for simplicity when setFrames is called directly.
    // A more sophisticated approach would be needed for undoing add/delete frames.
    if (frames.length > 0 && activeFrameIndex < frames.length && frames[activeFrameIndex]) {
        setDrawingHistory([frames[activeFrameIndex].dataUrl]);
        setDrawingHistoryPointer(0);
    }
  };


  // Function to update active frame's drawing, managing its history
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
    // Limit history size (e.g., 30 steps)
    while (newHistory.length > 30) {
        newHistory.shift();
    }
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
    if (frameToSave && frameToSave.dataUrl !== null) {
      try {
        toast({ title: "Saving...", description: `Saving frame ${activeFrameIndex + 1}...` });
        await saveFrameToDb(routeProjectId, activeFrameIndex, frameToSave.dataUrl, user?.uid);
        toast({ title: "Frame Saved!", description: `Frame ${activeFrameIndex + 1} has been saved to your project.` });
      } catch (error) {
        console.error("Manual save failed:", error);
        toast({ title: "Save Failed", description: "Could not save the frame. Please try again.", variant: "destructive" });
      }
    } else {
      toast({ title: "Nothing to Save", description: "Current frame is empty.", variant: "default" });
    }
  };


  const contextValue: AnimationContextType = {
    frames,
    setFrames, // Note: For drawing, canvas.tsx should call updateActiveFrameDrawing
    _updateActiveFrameDrawing: updateActiveFrameDrawing, // Exposed for canvas.tsx
    activeFrameIndex,
    setActiveFrameIndex,
    layers,
    setLayers,
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

// Custom hook to use the context
export const useAnimation = (): AnimationContextType & { _updateActiveFrameDrawing: (newDataUrl: string | null) => void } => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context as AnimationContextType & { _updateActiveFrameDrawing: (newDataUrl: string | null) => void };
};
