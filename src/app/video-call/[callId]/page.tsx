
"use client";

import { useParams, useRouter } from 'next/navigation';
import { VideoCallUIWrapper } from '@/components/video-chat/VideoCallUI'; // Corrected import path
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCallDetails } from '@/services/firestoreService';
import type { VideoCallSession } from '@/types/data';
import { useToast } from '@/hooks/use-toast';

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appCallId = params.callId as string;
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [appCallSession, setAppCallSession] = useState<VideoCallSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null); // To store the 100ms token if needed, or other auth mechanism
  const [userRole, setUserRole] = useState<string>('guest'); // Default to guest

  useEffect(() => {
    if (authLoading || !appCallId) {
      if (!authLoading && !user) setIsLoadingSession(false);
      return;
    }

    async function fetchCallDataAndToken() {
      setIsLoadingSession(true);
      setError(null);
      try {
        const sessionDetails = await getCallDetails(appCallId);
        if (!sessionDetails) {
          setError("Call session not found or has ended.");
          toast({ variant: 'destructive', title: 'Call Not Found', description: "This call session may have ended or does not exist."});
          router.push('/messages');
          setIsLoadingSession(false);
          return;
        }
        setAppCallSession(sessionDetails);

        if (user) {
          if (sessionDetails.callerId !== user.uid && sessionDetails.calleeId !== user.uid) {
              setError("You are not authorized to join this call session.");
              toast({ variant: 'destructive', title: 'Access Denied', description: "You are not a participant in this call."});
              router.push('/');
              setIsLoadingSession(false);
              return;
          }
          // Determine user role based on our app's session
          const determinedRole = user.uid === sessionDetails.callerId ? 'host' : 'guest';
          setUserRole(determinedRole);
          
          // For a custom WebRTC solution, the authToken might not be from 100ms,
          // but this structure is kept if future integrations need a token.
          // For pure WebRTC with Firestore signaling, token might be our app's session token if needed for API calls.
          // For now, let's assume a placeholder or a mechanism if VideoCallUIWrapper needs it.
          // If VideoCallUIWrapper directly handles all auth within itself (e.g., just uses `user` from `useAuth`),
          // `authToken` prop might become vestigial for that component.
          setAuthToken("placeholder-auth-token-if-needed-by-custom-webrtc-ui"); 

        } else {
          // User not logged in, can't determine role or get specific tokens
          setError("User not authenticated.");
           setIsLoadingSession(false);
          return;
        }

      } catch (err: any) {
        console.error("Error fetching call data or token:", err);
        setError(err.message || "An error occurred while preparing the call.");
        toast({ variant: 'destructive', title: 'Error', description: "Could not load call details."});
      } finally {
        setIsLoadingSession(false);
      }
    }

    fetchCallDataAndToken();

  }, [appCallId, user, authLoading, toast, router]);


  if (authLoading || isLoadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading call details...</p>
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
        <Button onClick={() => router.push('/')} variant="outline">Go Home</Button>
      </div>
    );
  }

  if (!appCallSession || !authToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
         <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">Could not initialize call. Session or token information is missing.</p>
         <Button asChild variant="link" className="mt-4">
            <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <VideoCallUIWrapper
      authToken={authToken} // This token might be our app's session or specific to the WebRTC setup
      userName={userProfile?.displayName || user.email || 'User'}
      initialRole={userRole} 
      appCallId={appCallId}
    />
  );
}
