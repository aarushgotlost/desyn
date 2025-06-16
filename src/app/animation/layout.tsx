
"use client";

import type { ReactNode } from 'react';
import { AnimationProvider } from '@/context/AnimationContext';
import '@/styles/animation.css'; // Import animation-specific styles

export default function AnimationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { projectId: string };
}) {
  return (
    <AnimationProvider projectId={params.projectId}>
      {children}
    </AnimationProvider>
  );
}
