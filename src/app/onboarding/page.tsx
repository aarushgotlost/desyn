
import { OnboardingClient } from '@/components/onboarding/OnboardingClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const informationalOnboardingSteps = [
  {
    title: "Connect with Creators",
    description: "Find and connect with developers, artists, and animators from around the globe. Share your ideas and collaborate on exciting projects.",
    image: "https://placehold.co/400x300.png",
    imageHint: "creative network connection"
  },
  {
    title: "Collaborate & Solve",
    description: "Post your creative challenges or technical bugs and get help from the community. Offer your expertise to solve others' problems.",
    image: "https://placehold.co/400x300.png",
    imageHint: "team collaboration ideas"
  },
  {
    title: "Join Communities",
    description: "Explore and join communities based on your interests, favorite tools, software, or creative fields.",
    image: "https://placehold.co/400x300.png",
    imageHint: "community group people diverse"
  },
  {
    title: "Share Your Work",
    description: "Create posts, share snippets of your work, art, code, or animations, and write articles to showcase your skills and help others learn.",
    image: "https://placehold.co/400x300.png",
    imageHint: "knowledge sharing artwork code"
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
