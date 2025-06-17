
import type { ReactNode } from 'react';
import { AnimationProvider } from '@/contexts/AnimationContext'; // Assuming you create this context

export default function AnimationLayout({ children }: { children: ReactNode }) {
  return (
    <AnimationProvider>
      <div className="h-full flex flex-col">
        {/* Consider adding a specific header or navigation for the animation section here if needed */}
        {/* <header className="p-4 border-b">Animation Section Header</header> */}
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </AnimationProvider>
  );
}
