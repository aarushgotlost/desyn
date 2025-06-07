"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface OnboardingStep {
  title: string;
  description: string;
  image: string;
  imageHint: string;
}

interface OnboardingClientProps {
  steps: OnboardingStep[];
}

export function OnboardingClient({ steps }: OnboardingClientProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = steps.length;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progressValue = ((currentStep + 1) / totalSteps) * 100;
  const stepData = steps[currentStep];

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <div className="w-full max-w-xs mx-auto">
         <Progress value={progressValue} className="w-full h-2" />
         <p className="text-sm text-muted-foreground mt-2">Step {currentStep + 1} of {totalSteps}</p>
      </div>

      <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-md">
        <Image 
            src={stepData.image} 
            alt={stepData.title} 
            layout="fill" 
            objectFit="cover"
            data-ai-hint={stepData.imageHint}
            className="transition-opacity duration-500 ease-in-out"
            key={currentStep} // Force re-render for transition
        />
      </div>
      
      <h2 className="text-2xl md:text-3xl font-semibold font-headline text-foreground">{stepData.title}</h2>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
        {stepData.description}
      </p>

      {currentStep < totalSteps -1 ? (
        <div className="flex justify-between w-full max-w-md pt-4">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <Button onClick={nextStep}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="pt-6 space-y-4">
            <div className="flex items-center justify-center text-green-500">
                <CheckCircle className="mr-2 h-8 w-8" />
                <p className="text-xl font-semibold">You&apos;re all set!</p>
            </div>
            <p className="text-muted-foreground">Ready to dive in? Choose an option below to get started.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/signup">Sign Up</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link href="/login">Log In</Link>
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
