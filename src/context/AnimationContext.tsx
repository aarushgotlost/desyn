
"use client";

import type { ReactNode} from 'react';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createAnimationProject as createProjectFirestore,
  getAnimationProjectMetadata,
  saveAnimationFrame,
  loadAllAnimationFrames,
  deleteAnimationFrame as deleteFrameFirestore,
  updateAnimationProjectMetadata,
  updateAnimationFrameOrderBatch,
  getUserAnimationProjects as fetchUserProjects,
  callAddFriendToAnimationProject as callAddFriend,
  getCollaboratorProfiles as fetchCollaboratorProfiles,
} from '@/services/firestoreService';
import type { AnimationProject, AnimationFrameData, CollaboratorProfile } from '@/types/data';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_FPS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, createNewFrame, DEFAULT_BRUSH_COLOR, DEFAULT_BRUSH_SIZE } from '@/lib/animationUtils';
import { useAutosave } from '@/hooks/useAutosave';

export type DrawingTool = 'pen' | 'eraser';

interface AnimationContextType {
  // Project State
  project: AnimationProject | null;
  isLoadingProject: boolean;
  isSavingProjectMeta: boolean;
  projectName: string;
  setProjectName: (name: string) => void;
  fps: number;
  setFps: (fps: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  updateProjectMetadata: (data: Partial<Pick<AnimationProject, 'title' | 'fps' | 'width' | 'height'>>) => Promise<void>;

  // Frame State
  frames: AnimationFrameData[];
  activeFrameId: string | null;
  activeFrameIndex: number;
  activeFrameDataUrl: string | null; // Data URL of the currently active frame for drawing
  setActiveFrameIndex: (index: number) => void;
  addFrame: () => Promise<void>;
  deleteFrame: (frameId: string) => Promise<void>;
  duplicateFrame: (frameId: string) => Promise<void>;
  updateFrameDataUrl: (frameId: string, dataUrl: string | null) => void; // For canvas component to update context
  
  // Saving State
  isSavingFrame: boolean; // Saving the active frame
  saveActiveFrameManually: () => Promise<void>; // Exposed manual save for active frame

  // Drawing Tool State
  selectedTool: DrawingTool;
  setSelectedTool: (tool: DrawingTool) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;

  // Undo/Redo State (simple implementation for current frame)
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  drawingHistory: (HTMLCanvasElement | null)[]; // Stores canvas states for undo/redo
  drawingHistoryPointer: number;
  setDrawingHistory: React.Dispatch<React.SetStateAction<(HTMLCanvasElement | null)[]>>;
  setDrawingHistoryPointer: React.Dispatch<React.SetStateAction<number>>;


  // Playback State
  isPlaying: boolean;
  togglePlay: () => void;

  // Collaboration
  collaborators: CollaboratorProfile[];
  isLoadingCollaborators: boolean;
  addCollaborator: (email: string) => Promise<{success: boolean, message: string, collaborator?: CollaboratorProfile}>;

  // Route Project ID (from URL)
  routeProjectIdFromProp: string | null;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider = ({
  children,
  projectId: routeProjectIdFromProp, // Renamed for clarity
}: {
  children: ReactNode;
  projectId: string | null;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Project State
  const [project, setProject] = useState<AnimationProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSavingProjectMeta, setIsSavingProjectMeta] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT);
  
  // Internal Project ID state, set only after successful load/init
  const [internalProjectId, setInternalProjectId] = useState<string | null>(null);

  // Frame State
  const [frames, setFrames] = useState<AnimationFrameData[]>([]);
  const [activeFrameIndex, setActiveFrameIndexState] = useState(0);
  
  // Refs for immediate access in callbacks
  const framesRef = useRef(frames);
  const activeFrameIndexRef = useRef(activeFrameIndex);
  const projectRef = useRef(project);

  useEffect(() => { framesRef.current = frames; }, [frames]);
  useEffect(() => { activeFrameIndexRef.current = activeFrameIndex; }, [activeFrameIndex]);
  useEffect(() => { projectRef.current = project; }, [project]);


  // Saving State
  const [isSavingFrame, setIsSavingFrame] = useState(false);

  // Drawing Tool State
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('pen');
  const [brushColor, setBrushColor] = useState(DEFAULT_BRUSH_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);

  // Undo/Redo State
  const [drawingHistory, setDrawingHistory] = useState<(HTMLCanvasElement | null)[]>([]);
  const [drawingHistoryPointer, setDrawingHistoryPointer] = useState(-1);


  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Collaboration State
  const [collaborators, setCollaborators] = useState<CollaboratorProfile[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  
  // --- Effects ---

  // Load project metadata and frames when projectId changes
  useEffect(() => {
    setIsLoadingProject(true);
    setInternalProjectId(null); // Clear internal ID when route changes
    setProject(null);
    setFrames([]);
    setActiveFrameIndexState(0);
    setProjectName('');
    setFps(DEFAULT_FPS);
    setCanvasWidth(DEFAULT_CANVAS_WIDTH);
    setCanvasHeight(DEFAULT_CANVAS_HEIGHT);
    setDrawingHistory([]);
    setDrawingHistoryPointer(-1);
    setCollaborators([]);

    if (!routeProjectIdFromProp || !user) {
      setIsLoadingProject(false);
      if (routeProjectIdFromProp && !user) { // Trying to access a project URL but not logged in
        toast({ title: "Authentication Required", description: "Please log in to view this project.", variant: "destructive" });
      }
      return;
    }

    let isMounted = true;

    const loadProjectData = async () => {
      try {
        const metadata = await getAnimationProjectMetadata(routeProjectIdFromProp);
        if (!metadata || !metadata.allowedUsers.includes(user.uid)) {
          if (isMounted) {
            toast({ title: "Access Denied", description: "You do not have permission to view this project or it does not exist.", variant: "destructive" });
            setProject(null); // Ensure project is null
          }
          return;
        }
        
        if (isMounted) {
          setProject(metadata);
          setProjectName(metadata.title);
          setFps(metadata.fps);
          setCanvasWidth(metadata.width);
          setCanvasHeight(metadata.height);
          setInternalProjectId(routeProjectIdFromProp); // Set internal ID only after successful metadata load
        }

        const fetchedFrames = await loadAllAnimationFrames(routeProjectIdFromProp);
        if (isMounted) {
          if (fetchedFrames.length > 0) {
            setFrames(fetchedFrames.sort((a, b) => a.frameNumber - b.frameNumber));
            setActiveFrameIndexState(0);
          } else {
            // Create an initial blank frame if no frames exist
            const initialFrame = createNewFrame(routeProjectIdFromProp, 0);
            setFrames([initialFrame]);
            setActiveFrameIndexState(0);
            // Optionally save this initial frame immediately
            await saveAnimationFrame(routeProjectIdFromProp, initialFrame);
          }
        }
      } catch (error) {
        console.error("Error loading project data:", error);
        if (isMounted) {
          toast({ title: "Error Loading Project", description: "Could not load project data.", variant: "destructive" });
          setProject(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProject(false);
        }
      }
    };

    loadProjectData();
    return () => { isMounted = false; };
  }, [routeProjectIdFromProp, user, toast]);

  // Fetch collaborators when project changes
  useEffect(() => {
    if (project && project.allowedUsers) {
      setIsLoadingCollaborators(true);
      fetchCollaboratorProfiles(project.allowedUsers)
        .then(setCollaborators)
        .catch(err => {
          console.error("Error fetching collaborators:", err);
          toast({title: "Error", description: "Could not load collaborators.", variant: "destructive"})
        })
        .finally(() => setIsLoadingCollaborators(false));
    }
  }, [project, toast]);


  const activeFrameId = frames[activeFrameIndex]?.id || null;
  const activeFrameDataUrl = frames[activeFrameIndex]?.dataUrl || null;

  // Autosave for active frame's dataUrl
  useAutosave(
    activeFrameId && activeFrameDataUrl ? { frameId: activeFrameId, dataUrl: activeFrameDataUrl, projectId: internalProjectId } : null,
    async (dataToSave) => {
      if (!dataToSave || !dataToSave.projectId || !dataToSave.frameId) return;
      if (isSavingFrame) return; // Don't autosave if manual save is in progress

      // Find the frame to get its full data for saving
      const frameToSave = framesRef.current.find(f => f.id === dataToSave.frameId);
      if (frameToSave) {
        // console.log("Autosaving frame:", dataToSave.frameId);
        await saveAnimationFrame(dataToSave.projectId, { ...frameToSave, dataUrl: dataToSave.dataUrl });
      }
    },
    2500 // Autosave delay
  );

  const setActiveFrameIndex = useCallback((index: number) => {
    if (index >= 0 && index < framesRef.current.length) {
      setDrawingHistory([]); // Clear history for new frame
      setDrawingHistoryPointer(-1);
      setActiveFrameIndexState(index);
    }
  }, []);


  // --- Frame Operations ---
  const addFrame = useCallback(async () => {
    if (!internalProjectId) {
      toast({ title: "Error", description: "Project ID not available. Cannot add frame.", variant: "destructive" });
      return;
    }
    const newFrameNumber = framesRef.current.length;
    const newFrame = createNewFrame(internalProjectId, newFrameNumber);
    
    setFrames(prevFrames => {
      const updatedFrames = [...prevFrames, newFrame];
      framesRef.current = updatedFrames; // Immediately update ref
      return updatedFrames;
    });
    setActiveFrameIndexState(newFrameNumber); // Switch to the new frame
    activeFrameIndexRef.current = newFrameNumber; // Update ref

    try {
      await saveAnimationFrame(internalProjectId, newFrame);
      if (projectRef.current) {
         await updateAnimationProjectMetadata(internalProjectId, { totalFrames: framesRef.current.length });
      }
      toast({ title: "Frame Added", description: `Frame ${newFrameNumber + 1} created.` });
    } catch (error) {
      console.error("Error saving new frame:", error);
      toast({ title: "Save Error", description: "Could not save new frame.", variant: "destructive" });
      // Revert optimistic update if save fails
      setFrames(prevFrames => prevFrames.filter(f => f.id !== newFrame.id));
      setActiveFrameIndexState(Math.max(0, newFrameNumber -1));
    }
  }, [internalProjectId, toast]);

  const deleteFrame = useCallback(async (frameId: string) => {
    if (!internalProjectId || framesRef.current.length <= 1) {
      toast({ title: "Action Denied", description: "Cannot delete the last frame or project ID is missing.", variant: "destructive" });
      return;
    }
    
    const frameToDeleteIndex = framesRef.current.findIndex(f => f.id === frameId);
    if (frameToDeleteIndex === -1) return;

    const oldFrames = [...framesRef.current]; // Keep a copy for potential revert

    setFrames(prevFrames => {
      const newFrames = prevFrames.filter(f => f.id !== frameId)
        .map((f, idx) => ({ ...f, frameNumber: idx })); // Re-number frames
      framesRef.current = newFrames;
      return newFrames;
    });
    
    // Adjust active frame index
    if (activeFrameIndexRef.current >= frameToDeleteIndex) {
      const newActiveIndex = Math.max(0, activeFrameIndexRef.current - 1);
       setActiveFrameIndexState(newActiveIndex);
       activeFrameIndexRef.current = newActiveIndex;
    }


    try {
      await deleteFrameFirestore(internalProjectId, frameId);
      if (projectRef.current) {
        await updateAnimationProjectMetadata(internalProjectId, { totalFrames: framesRef.current.length });
      }
      toast({ title: "Frame Deleted" });
    } catch (error) {
      console.error("Error deleting frame:", error);
      toast({ title: "Delete Error", description: "Could not delete frame.", variant: "destructive" });
      setFrames(oldFrames); // Revert
      // Potentially revert activeFrameIndex as well if needed
    }
  }, [internalProjectId, toast]);

  const duplicateFrame = useCallback(async (frameId: string) => {
    if (!internalProjectId) return;
    const sourceFrame = framesRef.current.find(f => f.id === frameId);
    if (!sourceFrame) return;

    const newFrameNumber = activeFrameIndexRef.current + 1; // Insert after current
    const duplicatedFrame = {
      ...createNewFrame(internalProjectId, newFrameNumber), // Get new ID and timestamps
      dataUrl: sourceFrame.dataUrl, // Copy dataUrl
    };

    setFrames(prevFrames => {
      const updatedFrames = [
        ...prevFrames.slice(0, newFrameNumber),
        duplicatedFrame,
        ...prevFrames.slice(newFrameNumber).map((f, idx) => ({ ...f, frameNumber: newFrameNumber + 1 + idx }))
      ];
      framesRef.current = updatedFrames;
      return updatedFrames;
    });
    setActiveFrameIndexState(newFrameNumber);
    activeFrameIndexRef.current = newFrameNumber;

    try {
      await saveAnimationFrame(internalProjectId, duplicatedFrame);
      // Update frame numbers for subsequent frames in Firestore if necessary (complex batch update)
      // For simplicity, we might rely on client-side ordering and only update totalFrames
      if (projectRef.current) {
         await updateAnimationProjectMetadata(internalProjectId, { totalFrames: framesRef.current.length });
      }
      toast({ title: "Frame Duplicated" });
    } catch (error) {
      console.error("Error saving duplicated frame:", error);
      toast({ title: "Save Error", description: "Could not save duplicated frame.", variant: "destructive" });
      // Consider reverting optimistic update
    }
  }, [internalProjectId, toast]);

  const updateFrameDataUrl = useCallback((frameId: string, dataUrl: string | null) => {
    setFrames(prevFrames => {
        const newFrames = prevFrames.map(f => 
            f.id === frameId ? { ...f, dataUrl, updatedAt: new Date().toISOString() } : f
        );
        framesRef.current = newFrames;
        return newFrames;
    });
  }, []);

  // --- Manual Save ---
  const saveActiveFrameManually = useCallback(async () => {
    if (isLoadingProject) {
      toast({ title: "Wait", description: "Project is still loading. Please wait and try again.", variant: "default" });
      return;
    }
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    if (!internalProjectId || internalProjectId.trim() === "") {
      toast({ title: "Project Error", description: "Project ID is not available. Cannot save.", variant: "destructive" });
      return;
    }

    const frameToSave = framesRef.current[activeFrameIndexRef.current];
    if (!frameToSave) {
      toast({ title: "Error", description: "No active frame to save.", variant: "destructive" });
      return;
    }

    setIsSavingFrame(true);
    try {
      await saveAnimationFrame(internalProjectId, frameToSave);
      toast({ title: "Frame Saved!", description: `Frame ${frameToSave.frameNumber + 1} saved successfully.` });
    } catch (error) {
      console.error("Error saving frame manually:", error);
      toast({ title: "Save Error", description: "Could not save frame.", variant: "destructive" });
    } finally {
      setIsSavingFrame(false);
    }
  }, [user, toast, internalProjectId, isLoadingProject]);


  // --- Project Metadata Update ---
  const updateProjectMetadata = useCallback(async (data: Partial<Pick<AnimationProject, 'title' | 'fps' | 'width' | 'height'>>) => {
    if (!internalProjectId || !projectRef.current) return;
    setIsSavingProjectMeta(true);
    try {
      await updateAnimationProjectMetadata(internalProjectId, data);
      setProject(prev => prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null);
      if(data.title) setProjectName(data.title);
      if(data.fps) setFps(data.fps);
      if(data.width) setCanvasWidth(data.width);
      if(data.height) setCanvasHeight(data.height);
      toast({ title: "Project Updated", description: "Project settings saved." });
    } catch (error) {
      console.error("Error updating project metadata:", error);
      toast({ title: "Error", description: "Could not update project settings.", variant: "destructive" });
    } finally {
      setIsSavingProjectMeta(false);
    }
  }, [internalProjectId, toast]);

  // --- Playback ---
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const currentlyPlaying = !prev;
      if (currentlyPlaying) {
        if (framesRef.current.length > 0) {
          playbackIntervalRef.current = setInterval(() => {
            setActiveFrameIndexState(currentIdx => (currentIdx + 1) % framesRef.current.length);
          }, 1000 / fps);
        }
      } else {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
      }
      return currentlyPlaying;
    });
  }, [fps]);

  useEffect(() => {
    // Clear interval on unmount or if fps/frames change while playing
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [fps, frames]); // Re-evaluate if fps or frames list changes

  // --- Undo/Redo ---
  const undo = useCallback(() => {
    if (drawingHistoryPointer > 0) {
      setDrawingHistoryPointer(prev => prev - 1);
    }
  }, [drawingHistoryPointer]);

  const redo = useCallback(() => {
    if (drawingHistoryPointer < drawingHistory.length - 1) {
      setDrawingHistoryPointer(prev => prev + 1);
    }
  }, [drawingHistoryPointer, drawingHistory.length]);
  
  const canUndo = drawingHistoryPointer > 0;
  const canRedo = drawingHistoryPointer < drawingHistory.length - 1;


  // --- Collaboration ---
  const addCollaborator = useCallback(async (email: string) => {
    if (!internalProjectId || !projectRef.current || !user || user.uid !== projectRef.current.ownerId) {
        toast({ title: "Permission Denied", description: "Only the project owner can add collaborators or project not loaded.", variant: "destructive" });
        return { success: false, message: "Permission denied or project not loaded."};
    }
    try {
        const result = await callAddFriend(internalProjectId, email);
        if (result.success && result.collaborator) {
            setCollaborators(prev => [...prev, result.collaborator as CollaboratorProfile]);
            setProject(p => p ? ({...p, allowedUsers: [...p.allowedUsers, (result.collaborator as CollaboratorProfile).uid]}) : null);
        }
        toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive"});
        return result;
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to add collaborator.", variant: "destructive" });
        return { success: false, message: error.message || "Failed to add collaborator."};
    }
  }, [internalProjectId, user, toast]);


  const contextValue: AnimationContextType = {
    project,
    isLoadingProject,
    isSavingProjectMeta,
    projectName, setProjectName, // Direct state setter might be complex for autosave
    fps, setFps,
    canvasWidth, canvasHeight,
    updateProjectMetadata,

    frames,
    activeFrameId,
    activeFrameIndex,
    activeFrameDataUrl,
    setActiveFrameIndex,
    addFrame,
    deleteFrame,
    duplicateFrame,
    updateFrameDataUrl,
    
    isSavingFrame,
    saveActiveFrameManually,

    selectedTool, setSelectedTool,
    brushColor, setBrushColor,
    brushSize, setBrushSize,

    undo, redo,
    canUndo, canRedo,
    drawingHistory, setDrawingHistory,
    drawingHistoryPointer, setDrawingHistoryPointer,

    isPlaying, togglePlay,

    collaborators,
    isLoadingCollaborators,
    addCollaborator,

    routeProjectIdFromProp // Expose for debugging or direct use if needed
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};
