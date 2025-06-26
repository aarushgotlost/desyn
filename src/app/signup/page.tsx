
import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Image src="/logo.svg" alt="Desyn App Logo" width={60} height={60} className="mx-auto mb-4" data-ai-hint="application logo D C" />
          <CardTitle className="text-2xl font-headline">Create your Account</CardTitle>
          <CardDescription>Join Desyn and start creating and collaborating on animations.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-muted"></div>
            <span className="mx-4 flex-shrink text-xs uppercase text-muted-foreground">Or</span>
            <div className="flex-grow border-t border-muted"></div>
          </div>
          <GoogleSignInButton />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
