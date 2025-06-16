
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
    updateActiveFrameDrawing,  // Changed from _updateActiveFrameDrawing
    currentColor, 
    brushSize,
    isLoadingProject 
  } = useAnimation();
  
  useAutosave(); 

  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const redrawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLoadingProject) return; 
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "white"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentFrame = frames && frames[activeFrameIndex];
    const currentFrameDataUrl = currentFrame?.dataUrl;

    if (currentFrameDataUrl) {
      const image = new Image();
      image.onload = () => {
        const hRatio = canvas.width / image.width;
        const vRatio = canvas.height / image.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - image.width * ratio) / 2;
        const centerShift_y = (canvas.height - image.height * ratio) / 2;  
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.fillStyle = "white"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, image.width, image.height,
                      centerShift_x, centerShift_y, image.width * ratio, image.height * ratio);
      };
      image.onerror = () => console.error("Error loading image for frame " + activeFrameIndex);
      image.src = currentFrameDataUrl;
    } else {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [activeFrameIndex, frames, isLoadingProject]);


  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    
    redrawCurrentFrame(); 

  }, [redrawCurrentFrame]); 

  useEffect(() => {
    resizeCanvas(); 
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);


  useEffect(() => {
    if (!isLoadingProject) {
        redrawCurrentFrame();
    }
  }, [activeFrameIndex, frames, redrawCurrentFrame, isLoadingProject]); 

  const getMousePos = (e: ReactMouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (isLoadingProject) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getMousePos(e);
    lastPosRef.current = pos;

    if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        if (currentTool === 'brush') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = currentColor;
          ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else { 
          ctx.globalCompositeOperation = 'destination-out'; 
        }
        ctx.closePath();
    }
  };

  const draw = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isLoadingProject) return;
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
      ctx.strokeStyle = 'rgba(0,0,0,1)'; 
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
    if (!isDrawing || isLoadingProject) return;
    setIsDrawing(false);
    lastPosRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over'; 
    }

    const dataUrl = canvas.toDataURL('image/png');
    updateActiveFrameDrawing(dataUrl); // Changed from _updateActiveFrameDrawing
  };
  
  return (
    <div className="flex-1 flex items-center justify-center bg-muted p-2 overflow-hidden relative">
      {isLoadingProject ? (
        <p>Loading animation workspace...</p> 
      ) : (
        <canvas
          ref={canvasRef}
          className="bg-white border border-foreground/20 shadow-lg" 
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing} 
          style={{ touchAction: 'none', display: 'block', width: '100%', height: '100%' }} 
        />
      )}
    </div>
  );
}
