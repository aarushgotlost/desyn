
"use client";

import { Brush, Eraser, Palette, Save, Undo, Redo, Minus, Plus, Download, Settings, Share2, Clapperboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input'; // For color picker
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useAnimation } from '@/context/AnimationContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function AnimationToolbar() {
  const {
    selectedTool, setSelectedTool,
    brushColor, setBrushColor,
    brushSize, setBrushSize,
    saveActiveFrameManually, isSavingFrame,
    undo, redo, canUndo, canRedo,
    isLoadingProject, project
  } = useAnimation();

  const handleDownloadFrame = () => {
    const canvas = document.querySelector('canvas'); // Simple selector, might need refinement
    if (canvas && project) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${project.title}_frame_${useAnimation.getState().activeFrameIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toolButtons = [
    { tool: 'pen' as const, icon: Brush, label: 'Pen Tool' },
    { tool: 'eraser' as const, icon: Eraser, label: 'Eraser Tool' },
  ];
  
  const isSaveDisabled = isLoadingProject || isSavingFrame;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Tools Section */}
        <div>
          <h3 className="text-sm font-medium mb-2 text-muted-foreground">Tools</h3>
          <div className="grid grid-cols-2 gap-2">
            {toolButtons.map(({ tool, icon: Icon, label }) => (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === tool ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setSelectedTool(tool)}
                    aria-label={label}
                    className={cn("w-full h-12", selectedTool === tool && "ring-2 ring-primary ring-offset-2")}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{label}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <Separator />

        {/* Brush/Eraser Settings */}
        {(selectedTool === 'pen' || selectedTool === 'eraser') && (
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">
              {selectedTool === 'pen' ? 'Brush Settings' : 'Eraser Settings'}
            </h3>
            <div className="space-y-4">
              {selectedTool === 'pen' && (
                <div className="space-y-2">
                  <Label htmlFor="brush-color" className="text-xs">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="brush-color"
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-10 h-10 p-0.5 border-2 border-border rounded-md cursor-pointer"
                      aria-label="Brush color picker"
                    />
                     <Input 
                        type="text" 
                        value={brushColor} 
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="h-10 flex-1"
                        placeholder="#000000"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="brush-size" className="text-xs">
                  Size: <span className="font-semibold">{brushSize}px</span>
                </Label>
                <Slider
                  id="brush-size"
                  min={1}
                  max={50}
                  step={1}
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  aria-label={selectedTool === 'pen' ? 'Brush size' : 'Eraser size'}
                />
              </div>
            </div>
          </div>
        )}
        
        <Separator />

        {/* Actions Section */}
        <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Actions</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={undo} disabled={!canUndo || isLoadingProject} aria-label="Undo">
                            <Undo className="mr-2 h-4 w-4" /> Undo
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Undo (Ctrl+Z)</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={redo} disabled={!canRedo || isLoadingProject} aria-label="Redo">
                            <Redo className="mr-2 h-4 w-4"/> Redo
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Redo (Ctrl+Y)</p></TooltipContent>
                </Tooltip>
            </div>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="default" onClick={saveActiveFrameManually} disabled={isSaveDisabled} className="w-full">
                        {isSavingFrame ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSavingFrame ? 'Saving...' : 'Save Frame'}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Save current frame to server</p></TooltipContent>
            </Tooltip>
        </div>

        <Separator />

        {/* Export/Project Settings (Simplified) */}
        <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Project</h3>
             <div className="space-y-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleDownloadFrame} className="w-full" disabled={isLoadingProject}>
                            <Download className="mr-2 h-4 w-4"/> Download Frame
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Download current frame as PNG</p></TooltipContent>
                </Tooltip>
                {/* Project Settings and Share buttons would be here, potentially invoking dialogs */}
                {/* For simplicity, these are directly in the main page for now */}
            </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
