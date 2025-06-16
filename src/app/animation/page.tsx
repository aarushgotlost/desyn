
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, PlusCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AnimationLandingPage() {
  // For now, we'll imagine a unique ID for a new project.
  // In a real app, this would be generated or come from a creation process.
  const newProjectId = `new-project-${Date.now()}`;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Film className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline">Welcome to Tearix2D!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your space to create amazing 2D animations.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <Image
            src="https://placehold.co/600x300.png"
            alt="Animation workspace illustration"
            width={600}
            height={300}
            className="rounded-lg mx-auto shadow-md border"
            data-ai-hint="animation software workspace"
          />
          <p>
            Start your creative journey by opening an existing project or creating a new one.
          </p>
          <div>
            <Button asChild size="lg">
              <Link href={`/animation/${newProjectId}`}>
                <PlusCircle className="mr-2 h-5 w-5" /> Start New Animation
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            (Currently, "Start New Animation" will open a sample project.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
