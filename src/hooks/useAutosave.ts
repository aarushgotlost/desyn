
import { useEffect, useRef, useCallback } from 'react';

export function useAutosave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  interval: number = 5000 // Default to 5 seconds
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T>(data);
  const latestOnSaveRef = useRef(onSave);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    latestOnSaveRef.current = onSave;
  }, [onSave]);

  const save = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      await latestOnSaveRef.current(latestDataRef.current);
      // console.log("Autosaved data:", latestDataRef.current);
    } catch (error) {
      console.error("Autosave failed:", error);
      // Optionally, handle save errors (e.g., notify user)
    }
  }, []);

  useEffect(() => {
    if (interval > 0) {
      timeoutRef.current = setTimeout(save, interval);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Optionally, save on unmount/cleanup
        // save(); 
      };
    }
  }, [interval, save, data]); // Re-run effect if data changes, effectively resetting the timer

  return { forceSave: save }; // Expose a function to trigger save manually if needed
}
