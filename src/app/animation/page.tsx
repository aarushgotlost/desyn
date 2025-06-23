
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurrentUserId } from "@/services/firestoreService";
import { getUserAnimations } from "@/actions/animationActions";
import type { AnimationProject } from "@/types/data";
import { Clapperboard, Film } from "lucide-react";
import Link from "next/link";
import Image from 'next/image';
import { formatDistanceToNowStrict } from 'date-fns';
import { CreateAnimationButton } from "@/components/animation/CreateAnimationButton";
import { unstable_noStore as noStore } from 'next/cache';

export default async function AnimationDashboardPage() {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) {
        return (
            <div className="text-center py-10">
                <h1 className="text-2xl font-bold">Please log in</h1>
                <p className="text-muted-foreground">Log in to create and view your animations.</p>
                <Button asChild className="mt-4"><Link href="/login">Log In</Link></Button>
            </div>
        );
    }
    const animations = await getUserAnimations(userId);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold font-headline flex items-center">
                    <Clapperboard className="mr-3 w-8 h-8 text-primary" />
                    My Animations
                </h1>
                <CreateAnimationButton />
            </div>

            {animations.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {animations.map((anim) => (
                        <Link key={anim.id} href={`/animation/${anim.id}`} className="group">
                            <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                                <CardHeader className="p-0 border-b">
                                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                        {anim.thumbnail ? (
                                            <Image 
                                                src={anim.thumbnail} 
                                                alt={`${anim.name} thumbnail`} 
                                                width={anim.width}
                                                height={anim.height}
                                                className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                                data-ai-hint="animation thumbnail"
                                            />
                                        ) : (
                                            <Film className="w-16 h-16 text-muted-foreground/30" />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors truncate mb-1">{anim.name}</CardTitle>
                                        <CardDescription className="text-sm">
                                            Updated {formatDistanceToNowStrict(new Date(anim.updatedAt), { addSuffix: true })}
                                        </CardDescription>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No animations yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Click "Create New Animation" to get started.
                    </p>
                    <div className="mt-6">
                        <CreateAnimationButton />
                    </div>
                </div>
            )}
        </div>
    );
}
