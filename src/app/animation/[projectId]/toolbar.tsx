
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brush, Eraser, Undo, Redo, Palette, ZoomIn, ZoomOut, Hand } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Placeholder for actual tool state and functionality
export function AnimationToolbar() {
  const handleToolSelect = (tool: string) => {
    // console.log(`${tool} selected`);
    // In a real app, this would update some context or state
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => handleToolSelect("brush")} className="flex-col h-auto py-2">
            <Brush className="h-5 w-5 mb-1" /> Brush
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleToolSelect("eraser")} className="flex-col h-auto py-2">
            <Eraser className="h-5 w-5 mb-1" /> Eraser
          </Button>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2">
           <Button variant="outline" size="sm" onClick={() => handleToolSelect("undo")} className="flex-col h-auto py-2">
            <Undo className="h-5 w-5 mb-1" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleToolSelect("redo")} className="flex-col h-auto py-2">
            <Redo className="h-5 w-5 mb-1" /> Redo
          </Button>
        </div>
        <Separator />
         <Button variant="outline" size="sm" onClick={() => handleToolSelect("color-picker")} className="w-full flex-col h-auto py-2">
            <Palette className="h-5 w-5 mb-1" /> Color Picker
          </Button>
        <Separator />
        <p className="text-xs text-muted-foreground pt-2">More tools (zoom, pan, etc.) will be added here.</p>
      </CardContent>
    </Card>
  );
}
