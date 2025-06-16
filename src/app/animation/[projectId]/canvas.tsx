
"use client";

import { useRef, useEffect, useState, MouseEvent as ReactMouseEvent, useCallback } from 'react';
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
  
  useAutosave(); 

  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    // Set canvas drawing surface size to match its displayed size
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    // Redraw the current frame after resize
    redrawCurrentFrame();
  }, [frames, activeFrameIndex]); // Add dependencies that might require redraw on resize

  useEffect(() => {
    resizeCanvas(); // Initial resize
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);


  const redrawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "white"; // Ensure canvas background is white for new/empty frames
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentFrameData = frames[activeFrameIndex]?.dataUrl;
    if (currentFrameData) {
      const image = new Image();
      image.onload = () => {
        // Draw the image, maintaining aspect ratio and fitting within the canvas
        const hRatio = canvas.width / image.width;
        const vRatio = canvas.height / image.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - image.width * ratio) / 2;
        const centerShift_y = (canvas.height - image.height * ratio) / 2;  
        ctx.drawImage(image, 0, 0, image.width, image.height,
                      centerShift_x, centerShift_y, image.width * ratio, image.height * ratio);
      };
      image.onerror = () => console.error("Error loading image for frame " + activeFrameIndex);
      image.src = currentFrameData;
    }
  }, [activeFrameIndex, frames]);


  useEffect(() => {
    redrawCurrentFrame();
  }, [activeFrameIndex, frames, redrawCurrentFrame]); // Redraw when active frame or its data changes

  const getMousePos = (e: ReactMouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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

    if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        if (currentTool === 'brush') {
          ctx.fillStyle = currentColor;
          ctx.globalCompositeOperation = 'source-over';
        } else { // Eraser
          ctx.fillStyle = 'white'; // For eraser, effectively drawing white
          ctx.globalCompositeOperation = 'destination-out'; // This "erases"
        }
        ctx.fill();
        ctx.closePath();
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
      ctx.globalCompositeOperation = 'destination-out'; 
      ctx.strokeStyle = 'rgba(0,0,0,1)'; // Color doesn't matter for destination-out stroke
      ctx.lineWidth = brushSize;
    } else {
      ctx.closePath();
      return; 
    }
    
    ctx.lineTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();

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

    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
    }

    const dataUrl = canvas.toDataURL('image/png');
    setFrames(prevFrames => {
      const newFrames = [...prevFrames];
      if (newFrames[activeFrameIndex]) {
        newFrames[activeFrameIndex] = { ...newFrames[activeFrameIndex], dataUrl };
      } else if (newFrames.length === 0 && activeFrameIndex === 0) { // Case for the very first frame
         newFrames.push({ id: `frame-0-${Date.now()}`, dataUrl, layers: [{ id: 'layer-0', name: 'Layer 1', visible: true }] });
      }
      return newFrames;
    });
  };
  
  return (
    <div className="flex-1 flex items-center justify-center bg-muted p-2 overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="bg-white border border-foreground/20 shadow-lg" 
        // Removed fixed width and height, will be set by JS
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{ touchAction: 'none', display: 'block', width: '100%', height: '100%' }} // Make canvas element fill parent
      />
    </div>
  );
}
