
"use client";

import { useEffect, useRef } from 'react';
import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function Timeline() {
  const { 
    frames, 
    setFrames, 
    activeFrameIndex, 
    setActiveFrameIndex,
    isPlaying,
    fps 
  } = useAnimation();

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      playbackIntervalRef.current = setInterval(() => {
        setActiveFrameIndex(prevIndex => (prevIndex + 1) % frames.length);
      }, 1000 / fps);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, frames.length, fps, setActiveFrameIndex]);


  const addFrame = () => {
    const newFrame = { id: `frame-${frames.length}-${Date.now()}`, dataUrl: null, layers: [] };
    setFrames(prevFrames => [...prevFrames, newFrame]);
    setActiveFrameIndex(frames.length); // Activate the new frame (index will be current length before adding)
  };

  const selectFrame = (index: number) => {
    setActiveFrameIndex(index);
  };

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) {
      alert("Cannot delete the last frame.");
      return;
    }
    setFrames(prevFrames => prevFrames.filter((_, i) => i !== index));
    
    if (activeFrameIndex === index) {
      setActiveFrameIndex(Math.max(0, index - 1));
    } else if (activeFrameIndex > index) {
      setActiveFrameIndex(activeFrameIndex - 1);
    }
  };

  return (
    <div className="h-32 bg-card border-t p-2 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Timeline</span>
        <Button onClick={addFrame} size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Frame
        </Button>
      </div>
      <div className="flex-1 overflow-x-auto flex items-center space-x-2 pb-2">
        {frames.map((frame, index) => (
          <div
            key={frame.id || index}
            onClick={() => selectFrame(index)}
            className={`group relative flex-shrink-0 w-24 h-full border-2 rounded-md cursor-pointer flex flex-col items-center justify-center bg-muted hover:border-primary
                        ${index === activeFrameIndex ? 'border-primary ring-2 ring-primary' : 'border-muted-foreground/30'}`}
          >
            <img 
              src={frame.dataUrl || `https://placehold.co/96x54.png?text=F${index + 1}`} 
              alt={`Frame ${index + 1}`} 
              className="max-w-full max-h-[calc(100%-1.25rem)] object-contain rounded-sm" // Adjusted max-h for text
              data-ai-hint="animation frame small"
            />
            <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1 rounded-sm">{index + 1}</span>
             {frames.length > 1 && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-0 right-0 h-5 w-5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation(); 
                  deleteFrame(index);
                }}
                aria-label={`Delete frame ${index + 1}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        {frames.length === 0 && (
          <p className="text-sm text-muted-foreground">No frames yet. Click "Add Frame" to start.</p>
        )}
      </div>
    </div>
  );
}
