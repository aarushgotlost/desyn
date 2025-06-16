
"use client";

import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Hand, Palette, Undo, Redo, Play, Pause, Save, Loader2 } from 'lucide-react'; // Added Pause
import { useToast } from '@/hooks/use-toast'; // For save feedback
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
    projectId // Ensure projectId is available if needed for save status
  } = useAnimation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);


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
  
  const handleSave = async () => {
    if (!projectId) {
        toast({ title: "Error", description: "Project ID not found. Cannot save.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    try {
      await saveActiveFrameManually();
      // Toast for success/error is handled within saveActiveFrameManually in context
    } catch (error) {
      // This catch might be redundant if saveActiveFrameManually handles its own errors with toasts
      console.error("Toolbar save failed:", error); 
      toast({ title: "Save Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
    } finally {
      setIsSaving(false);
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
         <Button variant="outline" size="sm" title="Save Project" aria-label="Save Project" onClick={handleSave} disabled={isSaving || !projectId}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
           {isSaving ? "Saving..." : "Save Frame"}
        </Button>
      </div>
    </div>
  );
}
