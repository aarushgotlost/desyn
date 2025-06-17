// This layout was part of the Tearix 2D animation feature, which has been removed.
import type { ReactNode } from 'react';

export default function AnimationLayoutRemoved({ children }: { children: ReactNode }) {
  // Render children directly or a placeholder message
  return <>{children}</>;
  // Alternatively, to show a message:
  // return <div className="p-4 text-center text-muted-foreground">The animation feature has been removed.</div>;
}
