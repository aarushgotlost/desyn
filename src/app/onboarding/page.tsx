
import { OnboardingClient } from '@/components/onboarding/OnboardingClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const informationalOnboardingSteps = [
  {
    title: "Create & Animate",
    description: "Use the powerful Desyn2d editor to bring your characters and stories to life, frame by frame. Perfect for both developers and artists.",
    image: "https://placehold.co/400x300.png",
    imageHint: "animation editor canvas"
  },
  {
    title: "Share Your Creations",
    description: "Showcase your animations, WIPs, and code snippets. Get feedback from a community of talented creators.",
    image: "https://placehold.co/400x300.png",
    imageHint: "animation showcase gallery"
  },
  {
    title: "Collaborate on Projects",
    description: "Find developers and animators to collaborate with. Join forces to build bigger and better animated projects.",
    image: "https://placehold.co/400x300.png",
    imageHint: "team collaboration animation"
  },
  {
    title: "Join Animation Communities",
    description: "Connect with others in communities focused on animation techniques, software like Desyn2d, or specific art styles.",
    image: "https://placehold.co/400x300.png",
    imageHint: "animation community group"
  },
];

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
       <Card className="w-full max-w-2xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center bg-muted/50 p-6">
          <Image src="/logo.svg" alt="Desyn App Logo" width={70} height={70} className="mx-auto mb-4" data-ai-hint="application logo D C large"/>
          <CardTitle className="text-3xl font-headline text-primary">Welcome to Desyn!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">Your creative journey to connect, learn, and grow starts here.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-10">
          <OnboardingClient steps={informationalOnboardingSteps} />
        </CardContent>
      </Card>
    </div>
  );
}
