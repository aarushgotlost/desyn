
import Link from 'next/link';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-2xl font-headline">Change Your Password</CardTitle>
          <CardDescription>Enter your current and new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/settings" className="font-medium text-primary hover:underline">
              Back to Settings
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
