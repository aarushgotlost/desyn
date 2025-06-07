import { OnboardingClient } from '@/components/onboarding/OnboardingClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const onboardingSteps = [
  {
    title: "Connect with Developers",
    description: "Find and connect with developers from around the globe. Share your ideas and collaborate on exciting projects.",
    image: "https://placehold.co/400x300.png",
    imageHint: "network connection"
  },
  {
    title: "Solve Bugs Together",
    description: "Post your coding challenges and get help from the community. Offer your expertise to solve others' bugs.",
    image: "https://placehold.co/400x300.png",
    imageHint: "code bug"
  },
  {
    title: "Join Communities",
    description: "Explore and join communities based on your interests, favorite technologies, or programming languages.",
    image: "https://placehold.co/400x300.png",
    imageHint: "people group"
  },
  {
    title: "Share Your Knowledge",
    description: "Create posts, share code snippets, and write articles to showcase your skills and help others learn.",
    image: "https://placehold.co/400x300.png",
    imageHint: "sharing knowledge"
  },
];

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
       <Card className="w-full max-w-2xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center bg-muted/50 p-6">
          <Image src="/logo.svg" alt="DevConnect Logo" width={70} height={70} className="mx-auto mb-4" data-ai-hint="logo letter D C"/>
          <CardTitle className="text-3xl font-headline text-primary">Welcome to DevConnect!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">Your journey to connect, learn, and grow starts here.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-10">
          <OnboardingClient steps={onboardingSteps} />
        </CardContent>
      </Card>
    </div>
  );
}
