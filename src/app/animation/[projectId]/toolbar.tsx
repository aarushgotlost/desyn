
"use client";

import { useAnimation } from '@/context/AnimationContext';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Hand, Palette, Undo, Redo, Play, Save } from 'lucide-react'; // Example icons

export default function Toolbar() {
  const { tool, setTool } = useAnimation(); // Assuming activeFrame is not needed directly in toolbar for tool selection

  const tools = [
    { name: 'brush', icon: Pencil, label: 'Brush' },
    { name: 'eraser', icon: Eraser, label: 'Eraser' },
    { name: 'hand', icon: Hand, label: 'Pan' }, // Placeholder for pan tool
    { name: 'color-picker', icon: Palette, label: 'Color' }, // Placeholder for color picker
  ];

  return (
    <div className="h-16 bg-card border-b p-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-1">
        {tools.map((toolItem) => (
          <Button
            key={toolItem.name}
            variant={tool === toolItem.name ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setTool(toolItem.name)}
            title={toolItem.label}
            aria-label={toolItem.label}
          >
            <toolItem.icon className="h-5 w-5" />
          </Button>
        ))}
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" title="Undo" aria-label="Undo">
          <Undo className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Redo" aria-label="Redo">
          <Redo className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Play Animation" aria-label="Play Animation">
          <Play className="h-5 w-5" />
        </Button>
         <Button variant="outline" size="sm" title="Save Project" aria-label="Save Project">
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}
