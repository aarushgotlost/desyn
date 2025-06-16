
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Film } from "lucide-react";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tearix2D Animator - Desyn',
  description: 'Placeholder for the Tearix2D Animation Tool.',
};

export default function Tearix2DAnimatorPage() {
  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-2xl shadow-xl text-center">
        <CardHeader>
          <Film className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline">Tearix2D Animator</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            This is a placeholder for the Tearix2D Animation Tool.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            In a real application, the Tearix2D animation tool would be embedded or launched here,
            enabling live collaborative animation creation and interaction with your team.
          </p>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center border">
            <p className="text-xl text-muted-foreground">[ Tearix2D Animation Canvas Placeholder ]</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/meeting-room">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Meeting Room
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
