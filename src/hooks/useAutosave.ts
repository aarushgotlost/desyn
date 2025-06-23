
import { useEffect, useRef, useCallback, useState } from 'react';

export function useAutosave<T>(
  data: T | null,
  onSave: (data: T) => Promise<void>,
  interval: number = 10000 // Default to 10 seconds
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T | null>(data);
  const latestOnSaveRef = useRef(onSave);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;

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

    setIsSaving(true);

    try {
      await latestOnSaveRef.current(latestDataRef.current);
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
        setIsSaving(false);
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

  return { isSaving, forceSave: save };
}
