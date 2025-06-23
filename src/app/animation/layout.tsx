
import type { ReactNode } from 'react';

export default function AnimationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full">
      {children}
    </div>
  );
}
