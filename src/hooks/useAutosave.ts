
import { useEffect, useRef, useCallback } from 'react';
import { debounce } from '@/lib/animationUtils';

type SaveFunction<T> = (data: T) => Promise<void>;

export function useAutosave<T>(
  data: T | null,
  saveFunction: SaveFunction<T>,
  delay: number = 2000 // Default autosave delay of 2 seconds
) {
  const isMountedRef = useRef(false);
  const initialDataRef = useRef(data); // Store initial data to prevent saving on first load

  const debouncedSave = useCallback(
    debounce((currentData: T) => {
      saveFunction(currentData);
    }, delay),
    [saveFunction, delay]
  );

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      initialDataRef.current = data; // Update initial data ref if data changes before mount (unlikely but safe)
      return;
    }

    if (data !== null && data !== initialDataRef.current) {
      // console.log("Autosaving data:", data);
      debouncedSave(data);
      initialDataRef.current = data; // Update initial data after triggering save
    }
  }, [data, debouncedSave]);
}
