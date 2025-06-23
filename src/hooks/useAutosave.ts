
import { useEffect, useRef, useCallback } from 'react';

export function useAutosave<T>(
  data: T | null,
  onSave: (data: T) => Promise<void>,
  interval: number = 10000 // Default to 10 seconds
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T | null>(data);
  const latestOnSaveRef = useRef(onSave);
  const isSavingRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    latestOnSaveRef.current = onSave;
  }, [onSave]);

  const save = useCallback(async () => {
    if (isSavingRef.current || !latestDataRef.current) {
        return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    isSavingRef.current = true;

    try {
      await latestOnSaveRef.current(latestDataRef.current);
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
        isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (data && interval > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
          save();
      }, interval);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [interval, save, data]);

  // Save on unmount
  useEffect(() => {
      return () => {
          if (latestDataRef.current) {
              save();
          }
      }
  }, [save]);

  return { forceSave: save };
}
