"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface AuthGuardProps {
  children: ReactNode;
}

const publicPaths = ['/login', '/signup', '/forgot-password', '/onboarding'];
const authRestrictedPaths = ['/login', '/signup', '/forgot-password']; // Pages users shouldn't see if logged in

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    const pathIsPublic = publicPaths.includes(pathname);
    const pathIsAuthRestricted = authRestrictedPaths.includes(pathname);

    if (user) {
      // If user is logged in
      if (pathname === '/onboarding' && user.metadata.creationTime === user.metadata.lastSignInTime) {
        // Allow new users to onboarding
      } else if (pathIsAuthRestricted) {
        // Redirect away from login/signup if logged in and not onboarding a new user
        router.replace('/');
      }
    } else {
      // If user is not logged in
      if (!pathIsPublic) {
        // Redirect to login if trying to access a protected page
        router.replace('/login');
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
     // Improved loading state: Full page skeleton or a more subtle loader
    return (
      <div className="flex flex-col min-h-screen">
        {/* Optional: Skeleton Header */}
        {!(publicPaths.includes(pathname)) && (
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
  
  // If user is not loaded and trying to access protected page, this could briefly show the protected page.
  // The useEffect hook will redirect, but this check prevents rendering children prematurely.
  if (!user && !publicPaths.includes(pathname)) {
    // This also can show a loading state or null to prevent flicker
     return (
      <div className="flex flex-col min-h-screen">
         {!(publicPaths.includes(pathname)) && (
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
