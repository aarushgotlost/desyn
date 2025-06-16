
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
    // setFrames, // Direct setFrames is less safe with history; use specialized updaters
    _updateActiveFrameDrawing, // Use this for drawing updates
    currentColor, 
    brushSize 
  } = useAnimation();
  
  useAutosave(); 

  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const redrawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "white"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const currentFrameDataUrl = frames[activeFrameIndex]?.dataUrl;
    if (currentFrameDataUrl) {
      const image = new Image();
      image.onload = () => {
        const hRatio = canvas.width / image.width;
        const vRatio = canvas.height / image.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - image.width * ratio) / 2;
        const centerShift_y = (canvas.height - image.height * ratio) / 2;  
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before drawing new image
        ctx.fillStyle = "white"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, image.width, image.height,
                      centerShift_x, centerShift_y, image.width * ratio, image.height * ratio);
      };
      image.onerror = () => console.error("Error loading image for frame " + activeFrameIndex);
      image.src = currentFrameDataUrl;
    } else {
        // Ensure white background if frame has no dataUrl
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [activeFrameIndex, frames]);


  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if(tempCtx && canvas.width > 0 && canvas.height > 0){
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    
    redrawCurrentFrame(); // Redraw after resize

    if(tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0){
        const ctx = canvas.getContext('2d');
        if(ctx) {
            // This part needs to be smarter about scaling the old content.
            // For now, let's just redraw the current frame based on its dataUrl (done by redrawCurrentFrame)
            // A more complex solution would scale tempCtx content onto the new canvas.
            // For simplicity, we rely on redrawCurrentFrame to handle it.
        }
    }

  }, [redrawCurrentFrame]); 

  useEffect(() => {
    resizeCanvas(); 
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);


  useEffect(() => {
    redrawCurrentFrame();
  }, [activeFrameIndex, frames, redrawCurrentFrame]); 

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

    // Store current canvas state for potential undo (if not handled by history push on stopDrawing)
    // This is relevant if we want undo to work mid-stroke, but current plan is on stroke end.

    if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        // For brush, draw a dot. For eraser, it prepares for the path.
        if (currentTool === 'brush') {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = currentColor;
          ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else { // Eraser
          ctx.globalCompositeOperation = 'destination-out'; 
          // No initial dot for eraser to avoid immediate clear if it's just a click
        }
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
    if (!isDrawing) return;
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
    // Use the context function that manages drawing history
    _updateActiveFrameDrawing(dataUrl); 
  };
  
  return (
    <div className="flex-1 flex items-center justify-center bg-muted p-2 overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="bg-white border border-foreground/20 shadow-lg" 
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing} // Also stop drawing if mouse leaves canvas
        style={{ touchAction: 'none', display: 'block', width: '100%', height: '100%' }} 
      />
    </div>
  );
}

