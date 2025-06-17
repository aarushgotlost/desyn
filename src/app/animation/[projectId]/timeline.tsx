
"use client";

import { PlusCircle, Trash2, Copy, ChevronLeftSquare, ChevronRightSquare, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnimation } from '@/context/AnimationContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function AnimationTimeline() {
  const {
    frames,
    activeFrameIndex,
    setActiveFrameIndex,
    addFrame,
    deleteFrame,
    duplicateFrame,
    isLoadingProject,
    project
  } = useAnimation();

  if (isLoadingProject) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading timeline...</div>;
  }
  if (!project) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No project loaded.</div>;
  }


  return (
    <TooltipProvider delayDuration={100}>
      <div className="h-full flex flex-col">
        <h3 className="text-sm font-medium mb-3 px-1 text-muted-foreground">Timeline</h3>
        <div className="flex gap-2 mb-3 px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={addFrame} className="flex-1">
                <PlusCircle className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Add New Frame</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => frames[activeFrameIndex] && duplicateFrame(frames[activeFrameIndex].id)}
                disabled={frames.length === 0}
                className="flex-1"
              >
                <Copy className="mr-1.5 h-4 w-4" /> Duplicate
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Duplicate Active Frame</p></TooltipContent>
          </Tooltip>
        </div>

        <ScrollArea className="flex-1 pb-2">
          <div className="flex flex-row md:flex-col gap-2 p-1">
            {frames.map((frame, index) => (
              <div
                key={frame.id}
                onClick={() => setActiveFrameIndex(index)}
                className={cn(
                  "relative group p-1.5 border-2 rounded-md cursor-pointer transition-all duration-150 ease-in-out aspect-[16/10] md:aspect-video w-28 h-auto md:w-full md:h-auto flex-shrink-0",
                  activeFrameIndex === index
                    ? 'border-primary shadow-md scale-[1.02]'
                    : 'border-border hover:border-primary/70'
                )}
              >
                {frame.dataUrl ? (
                  <Image
                    src={frame.dataUrl}
                    alt={`Frame ${index + 1}`}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-sm bg-white" // Add white background for transparency
                    unoptimized // Data URLs don't need Next.js optimization
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-sm">
                    <Film className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-mono">
                  {index + 1}
                </div>
                {activeFrameIndex === index && frames.length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent frame selection
                          deleteFrame(frame.id);
                        }}
                        aria-label="Delete frame"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>Delete Frame</p></TooltipContent>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="md:hidden" />
          <ScrollBar orientation="vertical" className="hidden md:flex" />
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
