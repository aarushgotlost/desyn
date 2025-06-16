
"use client";

import { useParams, useRouter } from 'next/navigation';
import { VideoCallUIWrapper } from '@/components/video-chat/VideoCallUI'; // Use the wrapper
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getCallDetails } from '@/services/firestoreService'; // To get our app's call session
import { get100msTokenAction } from '@/actions/videoCallActions';
import type { VideoCallSession } from '@/types/data';
import { USER_ROLES_100MS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appCallId = params.callId as string; // This is our Firestore document ID
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [appCallSession, setAppCallSession] = useState<VideoCallSession | null>(null);
  const [hmsAuthToken, setHmsAuthToken] = useState<string | null>(null);
  const [userRoleFor100ms, setUserRoleFor100ms] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !userProfile || !appCallId) {
      if (!authLoading && !user) setIsLoading(false); // Stop loading if auth is resolved and no user
      return;
    }

    async function fetchCallDataAndToken() {
      setIsLoading(true);
      setError(null);
      try {
        const sessionDetails = await getCallDetails(appCallId);
        if (!sessionDetails) {
          setError("Call session not found or has ended.");
          setIsLoading(false);
          return;
        }
        setAppCallSession(sessionDetails);

        // Determine user's role in this specific call for 100ms
        const role = sessionDetails.callerId === user.uid ? USER_ROLES_100MS.SPEAKER : USER_ROLES_100MS.LISTENER;
        setUserRoleFor100ms(role);

        const tokenResponse = await get100msTokenAction(appCallId, role, user.uid);
        if (tokenResponse.success && tokenResponse.token) {
          setHmsAuthToken(tokenResponse.token);
        } else {
          setError(tokenResponse.message || "Failed to obtain 100ms auth token.");
          toast({ variant: 'destructive', title: 'Token Error', description: tokenResponse.message || "Could not get video call token." });
        }
      } catch (err: any) {
        console.error("Error fetching call data or token:", err);
        setError(err.message || "An error occurred while preparing the call.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCallDataAndToken();

  }, [appCallId, user, userProfile, authLoading, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Preparing call...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You need to be logged in to join a video call.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link href="/login">Log In</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <CardTitle className="text-xl mb-2">Call Error</CardTitle>
        <CardDescription className="mb-4">{error}</CardDescription>
        <Button onClick={() => router.push('/messages')} variant="outline">Back to Messages</Button>
      </div>
    );
  }

  if (!appCallSession || !hmsAuthToken || !userRoleFor100ms || !userProfile?.displayName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
         <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">Could not initialize call. Missing required information.</p>
         <Button asChild variant="link" className="mt-4">
            <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }
  
  const handlePermissionsError = () => {
    // This function can be called by VideoCallUIWrapper if permissions are denied.
    // We might want to update our Firestore call session status here.
    updateAppCallStatus(appCallId, 'error'); // Mark our session as errored
  };


  return (
    <VideoCallUIWrapper
      authToken={hmsAuthToken}
      userName={userProfile.displayName}
      initialRole={userRoleFor100ms}
      appCallId={appCallId}
      onPermissionsError={handlePermissionsError}
    />
  );
}
