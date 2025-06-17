
import type { AnimationFrameData } from '@/types/data';

export const DEFAULT_FPS = 12;
export const DEFAULT_CANVAS_WIDTH = 640;
export const DEFAULT_CANVAS_HEIGHT = 360;
export const DEFAULT_BRUSH_COLOR = '#000000';
export const DEFAULT_BRUSH_SIZE = 5;

export const createNewFrame = (projectId: string, frameNumber: number): AnimationFrameData => {
  const now = new Date().toISOString();
  return {
    id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    projectId,
    frameNumber,
    dataUrl: null, // Blank canvas initially
    createdAt: now,
    updatedAt: now,
  };
};

// Debounce function
export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
