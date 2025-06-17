
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle }_DOC_TIMELINE_EXISTED_BEFORE_
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAnimation } from "@/contexts/AnimationContext";
import { cn } from "@/lib/utils";

export function AnimationTimeline() {
  const { project, frames, selectedFrame, setSelectedFrame, addFrame, deleteFrame, isLoading } = useAnimation();

  const handleSelectFrame = (frameId: string) => {
    const frame = frames.find(f => f.id === frameId);
    if (frame) {
      setSelectedFrame(frame);
    }
  };
  
  const handleDeleteFrame = async (frameId: string) => {
    if (project && window.confirm("Are you sure you want to delete this frame?")) {
       await deleteFrame(project.id, frameId);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
        <CardTitle className="text-base font-medium">Timeline / Frames</CardTitle>
        <Button size="sm" variant="outline" onClick={addFrame} disabled={!project || isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Frame
          {isLoading && frames.length === 0 && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
        </Button>
      </CardHeader>
      <CardContent className="p-2">
        {frames.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">No frames yet. Click "Add Frame" to start.</p>
        )}
        {isLoading && frames.length === 0 && (
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary"/>
             </div>
        )}
        {frames.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-2 pb-2">
              {frames.map((frame, index) => (
                <Card
                  key={frame.id}
                  onClick={() => handleSelectFrame(frame.id)}
                  className={cn(
                    "h-24 w-32 p-1.5 flex flex-col items-center justify-center cursor-pointer border-2 hover:border-primary transition-colors shrink-0",
                    selectedFrame?.id === frame.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <div className="flex-grow flex items-center justify-center">
                    {/* Placeholder for frame thumbnail */}
                     <Clapperboard size={24} className="text-muted-foreground opacity-50" />
                  </div>
                  <div className="w-full text-center text-xs mt-1">
                    <p className="font-medium truncate">F {frame.frameNumber}</p>
                    <div className="flex justify-center items-center gap-1 mt-0.5">
                        {/* Action buttons could be smaller or appear on hover in a real app */}
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleDeleteFrame(frame.id);}} disabled={isLoading}>
                            <Trash2 size={12} />
                        </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
