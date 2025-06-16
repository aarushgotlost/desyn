
"use client";

import { useParams, useRouter } from 'next/navigation';
import { VideoCallUIWrapper } from '@/components/video-chat/VideoCallUI';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCallDetails, getUserProfile } from '@/services/firestoreService';
import type { VideoCallSession } from '@/types/data';
import type { UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appCallId = params.callId as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [appCallSession, setAppCallSession] = useState<VideoCallSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUserDetails, setTargetUserDetails] = useState<Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'> | null>(null);
  const [isCaller, setIsCaller] = useState(false);

  useEffect(() => {
    if (authLoading || !appCallId) {
      if (!authLoading && !user) setIsLoadingSession(false);
      return;
    }

    async function fetchCallData() {
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
          
          const resolvedIsCaller = sessionDetails.callerId === user.uid;
          setIsCaller(resolvedIsCaller);

          const targetId = resolvedIsCaller ? sessionDetails.calleeId : sessionDetails.callerId;
          const targetProfile = await getUserProfile(targetId);
          if (targetProfile) {
            setTargetUserDetails({uid: targetProfile.uid, displayName: targetProfile.displayName, photoURL: targetProfile.photoURL});
          } else {
            // Set fallback target user details if profile fetch fails
            setTargetUserDetails({
              uid: targetId,
              displayName: resolvedIsCaller ? sessionDetails.calleeName : sessionDetails.callerName, 
              photoURL: null
            });
          }

        } else {
          setError("User not authenticated.");
          setIsLoadingSession(false);
          router.push('/login');
          return;
        }

      } catch (err: any) {
        console.error("Error fetching call data:", err);
        setError(err.message || "An error occurred while preparing the call.");
        toast({ variant: 'destructive', title: 'Error', description: "Could not load call details."});
      } finally {
        setIsLoadingSession(false);
      }
    }

    fetchCallData();

  }, [appCallId, user, authLoading, toast, router]);


  if (authLoading || isLoadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading call details...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled before reaching here if fetchCallData runs
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center bg-gray-800 text-white border-gray-700">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription className="text-gray-400">You need to be logged in to join a video call.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground"><Link href="/login">Log In</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <CardTitle className="text-xl mb-2 text-white">Call Error</CardTitle>
        <CardDescription className="mb-4 text-gray-300">{error}</CardDescription>
        <Button onClick={() => router.push('/')} variant="outline" className="text-white border-white hover:bg-white/10">Go Home</Button>
      </div>
    );
  }

  if (!appCallSession) {
    // This state might be hit if session becomes null after initial load, or fetch failed silently
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
         <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">Could not initialize call. Session information is missing.</p>
         <Button asChild variant="link" className="mt-4 text-primary hover:text-primary/80">
            <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <VideoCallUIWrapper
      appCallId={appCallId}
      targetUserName={targetUserDetails?.displayName}
      targetUserAvatar={targetUserDetails?.photoURL}
      initialCallStatus={appCallSession.status}
      isCaller={isCaller}
    />
  );
}

