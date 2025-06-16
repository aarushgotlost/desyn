
"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAnimation } from '@/context/AnimationContext';
import { saveFrameToDb } from '@/lib/animationUtils'; // Changed from saveFrame
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
    debounce(async (pId: string, frameIdx: number, frameDataUrl: string | null, layers: any[], currentUserId?: string | null) => { // Added layers
      if (pId && frameIdx >= 0 && currentUserId) { // Ensure userId is present for saving
        // We will save even if dataUrl is null, to update timestamps or mark a frame as intentionally blank
        try {
          await saveFrameToDb(pId, frameIdx, frameDataUrl, currentUserId, layers); // Changed from saveFrame, added layers
        } catch (error) {
          console.error('Autosave failed:', error);
          // Optionally, provide user feedback here (e.g., toast notification for critical failure)
          // For autosave, silent failure or minimal logging is often preferred to avoid pestering the user.
        }
      }
    }, 2500), // Autosave after 2.5 seconds of inactivity/change
    [] // No dependencies for useCallback as it uses refs or passed-in values
  );

  useEffect(() => {
    if (projectId && framesRef.current.length > 0 && activeFrameIndex < framesRef.current.length && activeFrameIndex >=0) {
      const activeFrameData = framesRef.current[activeFrameIndex];
      if (activeFrameData) { 
        debouncedSaveFrame(projectId, activeFrameIndex, activeFrameData.dataUrl, activeFrameData.layers, user?.uid); // Pass layers
      }
    }
  }, [activeFrameIndex, projectId, debouncedSaveFrame, frames, user?.uid]); // Added user.uid and ensure frames is a dependency

  return {};
};

