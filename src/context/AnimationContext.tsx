
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useContext, useEffect, Dispatch, SetStateAction } from 'react';
import { loadAllFrames } from '@/lib/animationUtils'; // Removed saveFrame as it's not directly used here

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
  setFrames: Dispatch<SetStateAction<Frame[]>>;
  activeFrameIndex: number; 
  setActiveFrameIndex: Dispatch<SetStateAction<number>>;
  layers: Layer[]; 
  setLayers: Dispatch<SetStateAction<Layer[]>>;
  currentTool: string; 
  setCurrentTool: Dispatch<SetStateAction<string>>;
  projectId: string | null;
  isLoadingProject: boolean;
  currentColor: string;
  setCurrentColor: Dispatch<SetStateAction<string>>;
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  fps: number;
  setFps: Dispatch<SetStateAction<number>>;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider = ({ children, projectId }: { children: ReactNode, projectId: string }) => {
  const [frames, setFrames] = useState<Frame[]>([]);
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


  useEffect(() => {
    if (projectId) {
      setIsLoadingProject(true);
      loadAllFrames(projectId)
        .then(loadedFrames => {
          if (loadedFrames && loadedFrames.length > 0) {
            const processedFrames: Frame[] = loadedFrames.map((f, index) => ({
              id: f.id || `frame-${index}`,
              dataUrl: f.dataUrl || null,
              layers: f.layers || [{ id: 'default-layer-0', name: 'Layer 1', visible: true }] 
            }));
            setFrames(processedFrames);
            setActiveFrameIndex(0); 
          } else {
            // Ensure a default frame exists if no frames are loaded
            setFrames([{ id: `frame-0-${Date.now()}`, dataUrl: null, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true }] }]);
            setActiveFrameIndex(0);
          }
        })
        .catch(error => {
          console.error("Failed to load frames:", error);
          setFrames([{ id: `frame-0-${Date.now()}`, dataUrl: null, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true }] }]);
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
    currentColor,
    setCurrentColor,
    brushSize,
    setBrushSize,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
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
