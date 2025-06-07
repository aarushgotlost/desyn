
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; 

interface AuthGuardProps {
  children: ReactNode;
}

// Add '/onboarding/profile-setup' to publicPaths if it's part of a flow accessible before full onboarding,
// or treat it as a protected route that only users with onboardingCompleted=false can access.
// For now, let's consider it a special protected route.
const publicPaths = ['/login', '/signup', '/forgot-password', '/onboarding']; // '/onboarding' (slideshow) can remain public/optional
const authRestrictedPaths = ['/login', '/signup', '/forgot-password']; // Pages users shouldn't see if logged in AND onboarding is complete

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; 

    const pathIsPublic = publicPaths.includes(pathname);
    const pathIsAuthRestricted = authRestrictedPaths.includes(pathname);
    const isProfileSetupPage = pathname === '/onboarding/profile-setup';

    if (user) {
      // User is logged in
      if (userProfile && !userProfile.onboardingCompleted && !isProfileSetupPage) {
        // If onboarding is not complete, and they are not on the profile setup page, redirect them there.
        router.replace('/onboarding/profile-setup');
      } else if (userProfile && userProfile.onboardingCompleted && (pathIsAuthRestricted || isProfileSetupPage)) {
        // If onboarding is complete, redirect away from auth-restricted pages and profile setup page.
        router.replace('/');
      } else if (!userProfile && !isProfileSetupPage) {
        // Edge case: user exists, but profile is somehow null (shouldn't happen with current AuthContext logic)
        // and not trying to setup profile, send to profile setup.
        router.replace('/onboarding/profile-setup');
      }
    } else {
      // User is not logged in
      if (!pathIsPublic && !isProfileSetupPage) { 
        // If trying to access a protected page (and it's not profile setup which requires auth but special handling), redirect to login.
        router.replace('/login');
      }
    }
  }, [user, userProfile, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        {!(publicPaths.includes(pathname) || pathname === '/onboarding/profile-setup') && (
            <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            </div>
        )}
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }
  
  // If user is not logged in AND not trying to access a public page or the special profile setup page, show loading.
  // This prevents rendering children that might require auth.
  if (!user && !publicPaths.includes(pathname) && pathname !== '/onboarding/profile-setup') {
     return (
      <div className="flex flex-col min-h-screen">
         {!(publicPaths.includes(pathname) || pathname === '/onboarding/profile-setup') && (
            <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            </div>
        )}
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
