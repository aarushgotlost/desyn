
"use client";

import { useRef, useEffect } from 'react';
import { useAnimation } from '@/context/AnimationContext';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tool, activeFrame, frames, setFrames } = useAnimation(); // Added frames, setFrames for potential updates

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    // Drawing logic for the active frame
    // This is a placeholder. Actual drawing would happen based on user input and frame data.
    // console.log(`Drawing on canvas for tool: ${tool}, activeFrame: ${activeFrame}`);
    
    // Example: Load image if dataUrl exists for current frame
    const currentFrameData = frames[activeFrame]?.dataUrl;
    if (currentFrameData) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
      };
      image.src = currentFrameData;
    }


    // Placeholder drawing
    ctx.fillStyle = 'red';
    ctx.fillRect(10 + activeFrame * 10, 10, 50, 50);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(`Frame: ${activeFrame}, Tool: ${tool}`, 10, 80);


  // Simulate saving canvas state to dataURL after drawing (example)
  // This should ideally be triggered by drawing actions
  // const dataUrl = canvas.toDataURL();
  // if (frames[activeFrame] && frames[activeFrame].dataUrl !== dataUrl) {
  //   const updatedFrames = [...frames];
  //   updatedFrames[activeFrame] = { ...updatedFrames[activeFrame], dataUrl };
  //   setFrames(updatedFrames);
  // }


  }, [activeFrame, tool, frames, setFrames]); // Add frames, setFrames to dependency if canvas updates frame data

  // Ensure canvas has a defined size, either via CSS or attributes
  return (
    <canvas
      ref={canvasRef}
      className="flex-1 bg-white border border-muted" // Added border for visibility
      width={1280} // Default width
      height={720}  // Default height
    />
  );
}
