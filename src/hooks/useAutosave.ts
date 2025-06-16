
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAnimation } from '@/context/AnimationContext';
import { saveFrame } from '@/lib/animationUtils';

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
  
  // Use a ref to store the latest frames data to avoid stale closures in debounced function
  const framesRef = useRef(frames);
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  const debouncedSaveFrame = useCallback(
    debounce(async (pId: string, frameIdx: number, frameDataUrl: string | null) => {
      if (pId && frameDataUrl !== null && frameIdx >= 0) {
        // console.log(`Autosaving frame ${frameIdx} for project ${pId}...`);
        try {
          await saveFrame(pId, frameIdx, frameDataUrl);
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
      if (activeFrameData && activeFrameData.dataUrl) { // Only save if dataUrl exists
        debouncedSaveFrame(projectId, activeFrameIndex, activeFrameData.dataUrl);
      }
    }
    // This effect depends on activeFrameIndex and projectId to trigger saves
    // It uses framesRef.current to get the latest frame data inside the debounced function.
  }, [activeFrameIndex, projectId, debouncedSaveFrame, frames]); // frames is added to re-trigger if the actual content that needs saving changes

  // The hook can return manual save functions or status if needed
  return {
    // manualSave: () => { ... } // Example
  };
};
