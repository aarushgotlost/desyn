
import type { ReactNode } from 'react';

export default function AnimationLayout({ children }: { children: ReactNode }) {
  // This layout can be expanded with specific UI for the animation section if needed.
  return (
    <div className="h-full">
      {children}
    </div>
  );
}
