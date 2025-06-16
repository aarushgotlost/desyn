
"use client"; // Assuming client-side interactions for the animation page

import Canvas from './canvas';
import Timeline from './timeline';
import Toolbar from './toolbar';
import Layers from './layers';
// AnimationProvider is now in layout.tsx

export default function AnimationPage({ params }: { params: { projectId: string } }) {
  // projectId is available via params if needed directly, or from context via AnimationProvider
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Layers />
        <div className="flex-1 flex flex-col">
          <Canvas />
        </div>
      </div>
      <Timeline />
    </div>
  );
}
