
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const AnimationEditor = dynamic(() => import('@/components/animation/AnimationEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-full gap-4 p-4">
      <Skeleton className="h-10 w-full" />
      <div className="flex-grow flex gap-4">
        <Skeleton className="w-64 hidden md:block" />
        <div className="flex-grow flex flex-col gap-4">
          <Skeleton className="w-full h-3/4" />
          <Skeleton className="w-full h-1/4" />
        </div>
      </div>
    </div>
  ),
})

export default function AnimationEditorPage({ params }: { params: { animationId: string } }) {
  return <AnimationEditor animationId={params.animationId} />
}
