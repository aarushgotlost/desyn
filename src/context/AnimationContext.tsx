
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useContext, useEffect, Dispatch, SetStateAction } from 'react';
import { loadAllFrames, saveFrame } from '@/lib/animationUtils'; // Assuming saveFrame might be used from context

// Define types for context values
interface Frame {
  id: string; // Could be frame-${index} or a Firestore doc ID
  dataUrl: string | null; // Base64 data URL of the frame image
  layers: Layer[]; // Array of layer data for this frame
  // Add other frame-specific properties if needed
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  // Add other layer-specific properties (e.g., opacity, blend mode, drawing data)
  data?: any[]; // Placeholder for layer-specific drawing data
}

interface AnimationContextType {
  frames: Frame[];
  setFrames: Dispatch<SetStateAction<Frame[]>>;
  activeFrameIndex: number; // Renamed from activeFrame for clarity
  setActiveFrameIndex: Dispatch<SetStateAction<number>>;
  layers: Layer[]; // Global layers structure, or active frame's layers
  setLayers: Dispatch<SetStateAction<Layer[]>>;
  currentTool: string; // Renamed from tool
  setCurrentTool: Dispatch<SetStateAction<string>>;
  projectId: string | null;
  isLoadingProject: boolean;
  // Add other state and functions like addFrame, deleteFrame, selectTool, play, pause, etc.
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider = ({ children, projectId }: { children: ReactNode, projectId: string }) => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  // Layers could be global or per-frame. For simplicity, let's assume global for now,
  // or layers of the active frame. The user's example had a single `layers` state.
  const [layers, setLayers] = useState<Layer[]>([
    // Default initial layer
    { id: 'layer-0', name: 'Layer 1', visible: true, data: [] }
  ]);
  const [currentTool, setCurrentTool] = useState<string>('brush'); // Default tool
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);

  // Load frames from Firestore when projectId changes
  useEffect(() => {
    if (projectId) {
      setIsLoadingProject(true);
      loadAllFrames(projectId)
        .then(loadedFrames => {
          if (loadedFrames && loadedFrames.length > 0) {
            // Ensure loaded frames conform to Frame interface
            const processedFrames: Frame[] = loadedFrames.map((f, index) => ({
              id: f.id || `frame-${index}`,
              dataUrl: f.dataUrl || null,
              layers: f.layers || [{ id: 'default-layer-0', name: 'Layer 1', visible: true }] // Default layer if none
            }));
            setFrames(processedFrames);
            setActiveFrameIndex(0); // Reset to first frame
          } else {
            // Initialize with a single blank frame if no frames are loaded
            setFrames([{ id: 'frame-0', dataUrl: null, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true }] }]);
            setActiveFrameIndex(0);
          }
        })
        .catch(error => {
          console.error("Failed to load frames:", error);
          // Fallback to a single blank frame on error
          setFrames([{ id: 'frame-0', dataUrl: null, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true }] }]);
          setActiveFrameIndex(0);
        })
        .finally(() => {
          setIsLoadingProject(false);
        });
    }
  }, [projectId]);

  const contextValue: AnimationContextType = {
    frames,
    setFrames,
    activeFrameIndex,
    setActiveFrameIndex,
    layers,
    setLayers,
    currentTool,
    setCurrentTool,
    projectId: projectId || null,
    isLoadingProject,
  };

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
