
"use client";
import type { ReactNode } from 'react';
import { AnimationProvider } from '@/context/AnimationContext';
import { useParams } from 'next/navigation';

export default function AnimationProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  // Ensure projectId is a string or null, not string[] or undefined
  const projectId = typeof params.projectId === 'string' ? params.projectId : null;
  
  return (
    // Keying the provider by projectId ensures it re-initializes when navigating between different projects.
    // This is crucial if the main page for [projectId] doesn't unmount/remount itself.
    <AnimationProvider key={projectId} projectId={projectId}>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden"> {/* Adjust 4rem based on actual header height */}
        {children}
      </div>
    </AnimationProvider>
  );
}
