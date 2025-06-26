"use client";

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamically import the editor component with SSR turned off.
// This is the standard Next.js way to handle components that can only run in the browser.
const AnimationEditor = dynamic(
  () => import('@/components/animation/AnimationEditor'),
  {
    ssr: false, // This is crucial. It prevents the component from rendering on the server.
    loading: () => (
      // A good-looking skeleton loader to show while the component is loading.
      <div className="flex flex-col h-full gap-2 md:gap-4 p-2 md:p-0">
        <header className="flex items-center justify-between gap-4 flex-shrink-0 p-2 border-b">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-6 w-1/3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </header>
        <div className="flex-grow flex flex-col md:flex-row gap-2 md:gap-4 min-h-0">
          <Skeleton className="w-full md:w-64 flex-shrink-0 hidden md:flex" />
          <div className="flex-grow flex flex-col gap-2 min-h-0">
            <Skeleton className="flex-grow w-full rounded-lg" />
            <Skeleton className="flex-shrink-0 h-28 w-full" />
          </div>
        </div>
      </div>
    ),
  }
)

export default function AnimationEditorPage({ params }: { params: { animationId:string } }) {
  // We pass the animationId to the client component. `use(params)` was causing issues,
  // so we revert to direct access which is still supported for migration.
  return <AnimationEditor animationId={params.animationId} />
}
