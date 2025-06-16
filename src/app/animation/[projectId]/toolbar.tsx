
"use client";

import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Hand, Palette, Undo, Redo, Play, Pause, Save, Loader2, Disc3 } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast'; 
import { useState } from 'react';


const predefinedColors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#FFA500', '#800080', '#A52A2A'];

export default function Toolbar() {
  const { 
    currentTool, setCurrentTool, 
    currentColor, setCurrentColor, 
    isPlaying, setIsPlaying,
    undoDrawing, redoDrawing,
    canUndoDrawing, canRedoDrawing,
    saveActiveFrameManually,
    saveAllFramesManually, 
    isLoadingProject, // Get isLoadingProject from context
    projectId, // Also get projectId for direct checks if needed, though context save fns will re-check
  } = useAnimation();
  const { toast } = useToast();
  const [isSavingFrame, setIsSavingFrame] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);


  const tools = [
    { name: 'brush', icon: Pencil, label: 'Brush' },
    { name: 'eraser', icon: Eraser, label: 'Eraser' },
    // { name: 'hand', icon: Hand, label: 'Pan' }, // Pan tool not implemented yet
  ];

  const handleColorChange = () => {
    const currentIndex = predefinedColors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % predefinedColors.length;
    setCurrentColor(predefinedColors[nextIndex]);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleSaveFrame = async () => {
    setIsSavingFrame(true);
    try {
      await saveActiveFrameManually(); 
    } catch (error) {
      console.error("Toolbar save frame failed:", error); 
      // Context function should handle its own error toasts
    } finally {
      setIsSavingFrame(false);
    }
  };

  const handleSaveAllFrames = async () => {
    setIsSavingAll(true);
    try {
      await saveAllFramesManually();
    } catch (error) {
      console.error("Toolbar save all frames failed:", error);
      // Context function should handle its own error toasts
    } finally {
      setIsSavingAll(false);
    }
  };


  return (
    <div className="h-16 bg-card border-b p-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-1">
        {tools.map((toolItem) => (
          <Button
            key={toolItem.name}
            variant={currentTool === toolItem.name ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setCurrentTool(toolItem.name)}
            title={toolItem.label}
            aria-label={toolItem.label}
          >
            <toolItem.icon className="h-5 w-5" />
          </Button>
        ))}
         <Button
            variant={'ghost'}
            size="icon"
            onClick={handleColorChange}
            title={`Change Color (Current: ${currentColor})`}
            aria-label="Change Color"
          >
            <Palette className="h-5 w-5" style={{ color: currentColor }} />
          </Button>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" title="Undo" aria-label="Undo" onClick={undoDrawing} disabled={!canUndoDrawing}>
          <Undo className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Redo" aria-label="Redo" onClick={redoDrawing} disabled={!canRedoDrawing}>
          <Redo className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={togglePlay} title={isPlaying ? "Pause Animation" : "Play Animation"} aria-label={isPlaying ? "Pause Animation" : "Play Animation"}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
         <Button 
            variant="outline" 
            size="sm" 
            title="Save Current Frame" 
            aria-label="Save Current Frame" 
            onClick={handleSaveFrame} 
            disabled={isLoadingProject || isSavingFrame || isSavingAll}  // Re-added isLoadingProject
          >
          {isSavingFrame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
           {isSavingFrame ? "Saving..." : "Save Frame"}
        </Button>
        <Button 
            variant="default" 
            size="sm" 
            title="Save All Frames" 
            aria-label="Save All Frames" 
            onClick={handleSaveAllFrames} 
            disabled={isLoadingProject || isSavingAll || isSavingFrame} // Re-added isLoadingProject
          >
          {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Disc3 className="mr-2 h-4 w-4" />}
           {isSavingAll ? "Saving All..." : "Save All"}
        </Button>
      </div>
    </div>
  );
}

