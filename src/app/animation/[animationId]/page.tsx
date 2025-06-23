
import { getAnimationDetails } from "@/actions/animationActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";
import { unstable_noStore as noStore } from 'next/cache';

export default async function AnimationEditorPage({ params }: { params: { animationId: string } }) {
    noStore();
    const animation = await getAnimationDetails(params.animationId);

    if (!animation) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-semibold mb-4">Animation Not Found</h1>
                <p className="text-muted-foreground mb-6">The animation you are looking for does not exist.</p>
                <Button asChild>
                    <Link href="/animation">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Animations
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{animation.name}</h1>
                <Button variant="outline" asChild>
                    <Link href="/animation">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>

            <div className="border-2 border-dashed rounded-lg h-96 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/50">
                <Construction className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-semibold">Animation Editor Under Construction</h2>
                <p>The canvas, timeline, and tools will be built here in the next step.</p>
            </div>
        </div>
    );
}
