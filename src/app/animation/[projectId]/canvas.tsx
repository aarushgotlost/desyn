
"use client";

import { useRef, useEffect, useState, MouseEvent as ReactMouseEvent } from 'react';
import { useAnimation } from '@/context/AnimationContext';
import { useAutosave } from '@/hooks/useAutosave';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    currentTool, 
    activeFrameIndex, 
    frames, 
    setFrames, 
    currentColor, 
    brushSize 
  } = useAnimation();
  
  useAutosave(); // Initialize autosave hook

  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);


  // Effect to clear and redraw canvas when active frame or its dataUrl changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white"; // Ensure canvas background is white for new/empty frames
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentFrameData = frames[activeFrameIndex]?.dataUrl;
    if (currentFrameData) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.onerror = () => {
        console.error("Error loading image for frame " + activeFrameIndex);
      }
      image.src = currentFrameData;
    }
  }, [activeFrameIndex, frames]); // Removed frames[activeFrameIndex]?.dataUrl to rely on frames for broader changes

  const getMousePos = (e: ReactMouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    // Consider devicePixelRatio for hidpi screens if needed for precision
    // const scaleX = canvasRef.current!.width / rect.width;    
    // const scaleY = canvasRef.current!.height / rect.height;  
    return {
      x: e.clientX - rect.left, // * scaleX,
      y: e.clientY - rect.top, // * scaleY
    };
  };

  const startDrawing = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getMousePos(e);
    lastPosRef.current = pos;

    // Initial dot for brush tool
    if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentTool === 'brush' ? currentColor : 'white'; // Eraser draws "white"
        if (currentTool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        if (currentTool === 'eraser') ctx.globalCompositeOperation = 'source-over'; // Reset
        ctx.closePath(); // Added closePath
    }
  };

  const draw = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPosRef.current) return;

    const pos = getMousePos(e);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    
    if (currentTool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'; // This makes subsequent drawing erase
      ctx.lineWidth = brushSize; // Eraser size
      // No strokeStyle needed for eraser with destination-out
    } else {
      ctx.closePath(); // Ensure path is closed if not drawing
      return; // Do nothing for other tools for now
    }
    
    ctx.lineTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath(); // Close the path after stroking

    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPosRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    // Reset composite operation after erasing
    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over';
    }


    const dataUrl = canvas.toDataURL('image/png'); // Save as PNG
    setFrames(prevFrames => {
      const newFrames = [...prevFrames];
      if (newFrames[activeFrameIndex]) {
        newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl };
      }
      return newFrames;
    });
  };
  
  return (
    <div className="flex-1 flex items-center justify-center bg-muted p-2 overflow-auto">
      <canvas
        ref={canvasRef}
        className="bg-white border border-foreground/20 shadow-lg" 
        width={1280} 
        height={720}  
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing} // Stop drawing if mouse leaves canvas
        style={{ touchAction: 'none' }} // Improves touch interaction
      />
    </div>
  );
}
