
"use client";

import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Hand, Palette, Undo, Redo, Play, Pause, Save } from 'lucide-react'; // Added Pause

const predefinedColors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF'];

export default function Toolbar() {
  const { currentTool, setCurrentTool, currentColor, setCurrentColor, isPlaying, setIsPlaying } = useAnimation();

  const tools = [
    { name: 'brush', icon: Pencil, label: 'Brush' },
    { name: 'eraser', icon: Eraser, label: 'Eraser' },
    { name: 'hand', icon: Hand, label: 'Pan' }, 
  ];

  const handleColorChange = () => {
    const currentIndex = predefinedColors.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % predefinedColors.length;
    setCurrentColor(predefinedColors[nextIndex]);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
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
            style={{ color: currentColor }} 
          >
            <Palette className="h-5 w-5" />
          </Button>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" title="Undo" aria-label="Undo">
          <Undo className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Redo" aria-label="Redo">
          <Redo className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={togglePlay} title={isPlaying ? "Pause Animation" : "Play Animation"} aria-label={isPlaying ? "Pause Animation" : "Play Animation"}>
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
         <Button variant="outline" size="sm" title="Save Project" aria-label="Save Project">
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}
