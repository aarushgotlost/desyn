
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAnimation } from '@/context/AnimationContext';
import { saveFrame } from '@/lib/animationUtils';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

export const useAutosave = () => {
  const { projectId, frames, activeFrameIndex } = useAnimation();
  const { user } = useAuth(); // Get current user
  
  // Use a ref to store the latest frames data to avoid stale closures in debounced function
  const framesRef = useRef(frames);
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  const debouncedSaveFrame = useCallback(
    debounce(async (pId: string, frameIdx: number, frameDataUrl: string | null, currentUserId?: string | null) => {
      if (pId && frameDataUrl !== null && frameIdx >= 0) {
        // console.log(`Autosaving frame ${frameIdx} for project ${pId}...`);
        try {
          await saveFrame(pId, frameIdx, frameDataUrl, currentUserId); // Pass userId
          // console.log(`Frame ${frameIdx} autosaved successfully for project ${pId}.`);
        } catch (error) {
          console.error('Autosave failed:', error);
          // Optionally, provide user feedback here (e.g., toast notification)
        }
      }
    }, 2500), // Autosave after 2.5 seconds of inactivity/change
    [] // No dependencies for useCallback as it uses refs or passed-in values
  );

  useEffect(() => {
    if (projectId && framesRef.current.length > 0 && activeFrameIndex < framesRef.current.length) {
      const activeFrameData = framesRef.current[activeFrameIndex];
      // Only trigger autosave if there's actual dataUrl content.
      // Initial null dataUrl for new frames shouldn't trigger a save until drawn upon.
      if (activeFrameData && activeFrameData.dataUrl) { 
        debouncedSaveFrame(projectId, activeFrameIndex, activeFrameData.dataUrl, user?.uid);
      }
    }
    // This effect depends on activeFrameIndex and projectId to trigger saves
    // It uses framesRef.current to get the latest frame data inside the debounced function.
    // Adding 'frames' (or specifically frames[activeFrameIndex]?.dataUrl) ensures it re-evaluates when the data to save actually changes.
  }, [activeFrameIndex, projectId, debouncedSaveFrame, frames, user?.uid]); // Added user.uid

  // The hook can return manual save functions or status if needed
  return {
    // manualSave: () => { ... } // Example
  };
};
