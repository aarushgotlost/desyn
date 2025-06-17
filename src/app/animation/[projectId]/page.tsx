
"use client";
import React, { useRef, useEffect, useState } from 'react';
import { useAnimation } from '@/context/AnimationContext';
import { Loader2, Play, Pause, Square, Palette, Eraser, Brush, Undo, Redo, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import AnimationToolbar from './toolbar';
import AnimationTimeline from './timeline';
import ShareProjectDialog from './share-dialog';
import ProjectSettingsDialog from './project-settings-dialog';

// Canvas Component (Simplified)
const AnimationCanvas = () => {
  const {
    canvasWidth, canvasHeight, activeFrameDataUrl, updateFrameDataUrl, activeFrameId,
    selectedTool, brushColor, brushSize,
    drawingHistory, setDrawingHistory,
    drawingHistoryPointer, setDrawingHistoryPointer,
    undo, redo, project
  } = useAnimation();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [tempCanvas, setTempCanvas] = useState<HTMLCanvasElement | null>(null);


  // Initialize temp canvas for undo/redo history
  useEffect(() => {
    const tc = document.createElement('canvas');
    tc.width = canvasWidth;
    tc.height = canvasHeight;
    setTempCanvas(tc);
  }, [canvasWidth, canvasHeight]);

  // Function to save current canvas state to history
  const saveToHistory = useCallback(() => {
    if (!canvasRef.current || !tempCanvas) return;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Create a new canvas element for the history state
    const historyCanvas = document.createElement('canvas');
    historyCanvas.width = canvasWidth;
    historyCanvas.height = canvasHeight;
    const historyCtx = historyCanvas.getContext('2d');
    if (historyCtx) {
        historyCtx.drawImage(canvasRef.current, 0, 0);
    }
    
    setDrawingHistory(prev => {
        const newHistory = prev.slice(0, drawingHistoryPointer + 1);
        newHistory.push(historyCanvas);
        // Limit history size if needed
        // const MAX_HISTORY = 20;
        // if (newHistory.length > MAX_HISTORY) newHistory.shift();
        return newHistory;
    });
    setDrawingHistoryPointer(prev => prev + 1);
  }, [canvasWidth, canvasHeight, tempCanvas, drawingHistoryPointer, setDrawingHistory, setDrawingHistoryPointer]);


  // Load active frame data or history state onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = project?.backgroundColor || '#FFFFFF'; // Use project background or default white
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    const historyStateToDraw = drawingHistory[drawingHistoryPointer];

    if (historyStateToDraw) {
        ctx.drawImage(historyStateToDraw, 0, 0);
    } else if (activeFrameDataUrl) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
        // After loading initial frame, save it as the first history state
        if (drawingHistory.length === 0 || drawingHistoryPointer === -1) {
           saveToHistory();
        }
      };
      image.src = activeFrameDataUrl;
    } else {
      // If no dataUrl and no history, it's a blank frame. Save it as initial state.
      if (drawingHistory.length === 0 || drawingHistoryPointer === -1) {
         saveToHistory();
      }
    }
  }, [activeFrameDataUrl, canvasWidth, canvasHeight, project?.backgroundColor, drawingHistory, drawingHistoryPointer, saveToHistory]);


  const getMousePos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const pos = getMousePos(e);
    if (!pos) return;
    isDrawingRef.current = true;
    lastPosRef.current = pos;

    // For single click/tap drawing
    const ctx = canvasRef.current?.getContext('2d');
    if(ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        // Draw a small dot
        ctx.fillStyle = selectedTool === 'pen' ? brushColor : (project?.backgroundColor || '#FFFFFF');
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

  }, [brushColor, brushSize, selectedTool, project?.backgroundColor]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const pos = getMousePos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!pos || !ctx || !lastPosRef.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    
    if (selectedTool === 'pen') {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    } else if (selectedTool === 'eraser') {
      // Eraser draws with background color, or can use clearRect if more sophisticated layering is used
      ctx.strokeStyle = project?.backgroundColor || '#FFFFFF'; // Simulate erasing by drawing background color
      ctx.lineWidth = brushSize * 2; // Eraser typically larger
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out'; // This properly erases to transparent
                                                        // but requires handling background separately.
                                                        // For single layer simplicity, drawing with background color is easier.
                                                        // Let's use 'source-over' and draw background color.
      // ctx.globalCompositeOperation = 'source-over';
      // ctx.strokeStyle = project?.backgroundColor || '#FFFFFF';
    }
    ctx.stroke();
    lastPosRef.current = pos;
  }, [selectedTool, brushColor, brushSize, project?.backgroundColor]);

  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    if (canvasRef.current && activeFrameId) {
      saveToHistory(); // Save state after drawing stroke
      const dataUrl = canvasRef.current.toDataURL('image/png');
      updateFrameDataUrl(activeFrameId, dataUrl);
    }
  }, [activeFrameId, updateFrameDataUrl, saveToHistory]);

  return (
    <div className="bg-muted/30 border border-input rounded-md shadow-inner overflow-hidden touch-none flex items-center justify-center"
         style={{ width: '100%', aspectRatio: `${canvasWidth}/${canvasHeight}` }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="cursor-crosshair"
        style={{ backgroundColor: project?.backgroundColor || '#FFFFFF', width: '100%', height: '100%', objectFit: 'contain' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing} // End drawing if mouse leaves canvas
        onTouchStart={(e) => { e.preventDefault(); startDrawing(e);}}
        onTouchMove={(e) => {e.preventDefault(); draw(e);}}
        onTouchEnd={(e) => {e.preventDefault(); endDrawing();}}
      />
    </div>
  );
};


export default function AnimationEditorPage() {
  const { project, isLoadingProject, frames, activeFrameIndex, isPlaying, togglePlay, fps } = useAnimation();

  if (isLoadingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Animation Project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Clapperboard className="h-20 w-20 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Project Not Found or Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          The animation project could not be loaded. It might have been deleted, or you may not have permission to view it.
        </p>
        <Button asChild variant="outline">
          <Link href="/animation">Back to Animations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
      {/* Left Panel (Toolbar & Layers - Layers simplified for now) */}
      <div className="w-full md:w-64 lg:w-72 p-3 border-r bg-card flex-shrink-0 overflow-y-auto">
        <AnimationToolbar />
        {/* Layers Panel Placeholder - would go here */}
      </div>

      {/* Center Panel (Canvas & Playback Controls) */}
      <main className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <h2 className="text-xl font-semibold truncate" title={project.title}>{project.title}</h2>
          <div className="flex items-center gap-2">
            <ProjectSettingsDialog />
            <ShareProjectDialog />
            <Button onClick={togglePlay} variant="outline" size="sm">
              {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
            <AnimationCanvas />
        </div>

        <div className="pt-2 md:pt-4">
          <p className="text-xs text-muted-foreground text-center mb-1">
            Frame {activeFrameIndex + 1} of {frames.length} @ {fps} FPS
          </p>
          {/* Playback progress/scrubber can be added here */}
        </div>
      </main>

      {/* Right Panel (Timeline) */}
      <div className="w-full md:w-72 lg:w-80 p-3 border-l bg-card flex-shrink-0 overflow-y-auto">
        <AnimationTimeline />
      </div>
    </div>
  );
}

// Helper hook from Radix for useCallback with ref dependencies
// https://github.com/radix-ui/primitives/blob/main/packages/core/primitive/src/primitive.tsx
function useCallbackRef<T extends (...args: any[]) => any>(callback: T | undefined): T {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  });

  // https://github.com/facebook/react/issues/19240
  return React.useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, []);
}

