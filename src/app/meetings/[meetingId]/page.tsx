
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getMeetingDetailsFirestore } from '@/services/firestoreService';
import { joinMeetingAction, endMeetingAction } from '@/actions/meetingActions';
import type { Meeting } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, VideoOff, LogOut, Users, MessageSquare, AlertTriangle, Video as VideoIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [isJoiningFirestore, setIsJoiningFirestore] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [jitsiScriptLoaded, setJitsiScriptLoaded] = useState(false);
  const [isJitsiLoading, setIsJitsiLoading] = useState(false);


  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  const isUserParticipant = useCallback(() => {
    if (!user || !meeting) return false;
    return meeting.participants.some(p => p.uid === user.uid);
  }, [user, meeting]);

  const isUserHost = useCallback(() => {
    if (!user || !meeting) return false;
    return meeting.createdBy === user.uid;
  }, [user, meeting]);

  // Load Jitsi Script
  useEffect(() => {
    if (typeof window.JitsiMeetExternalAPI !== 'undefined') {
      setJitsiScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => setJitsiScriptLoaded(true);
    script.onerror = () => {
        toast({ title: "Error", description: "Failed to load Jitsi script. Please refresh.", variant: "destructive"});
        setIsJitsiLoading(false);
    }
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [toast]);

  // Fetch meeting details
  useEffect(() => {
    async function fetchMeeting() {
      if (!meetingId) return;
      setIsLoadingMeeting(true);
      try {
        const fetchedMeeting = await getMeetingDetailsFirestore(meetingId);
        if (fetchedMeeting) {
          setMeeting(fetchedMeeting);
        } else {
          toast({ title: "Not Found", description: "Meeting not found.", variant: "destructive" });
          router.push('/meetings');
        }
      } catch (error) {
        console.error("Error fetching meeting details:", error);
        toast({ title: "Error", description: "Could not load meeting details.", variant: "destructive" });
      } finally {
        setIsLoadingMeeting(false);
      }
    }
    fetchMeeting();
  }, [meetingId, router, toast]);

  const initializeJitsi = useCallback(() => {
    if (!meeting || !user || !userProfile || !jitsiContainerRef.current || jitsiApi || !jitsiScriptLoaded || !meeting.isActive) {
      return;
    }
    if(typeof window.JitsiMeetExternalAPI === 'undefined'){
        toast({ title: "Jitsi Not Ready", description: "Jitsi API is not available yet. Please wait or refresh.", variant: "default"});
        setIsJitsiLoading(false);
        return;
    }

    setIsJitsiLoading(true);
    const domain = 'meet.jit.si';
    const options = {
      roomName: meeting.id, // Use meetingId as roomName
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: userProfile.displayName || user.displayName || 'Desyn User',
        email: user.email || undefined,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'select-background', 'download', 'help', 'mute-everyone', 'participants-pane'
            // 'security' // Keep this commented unless specific security features are needed from Jitsi Pro perhaps
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        APP_NAME: 'Desyn Meetings',
        NATIVE_APP_NAME: 'Desyn Meetings',
        PROVIDER_NAME: 'Desyn',
        RECENT_LIST_ENABLED: false,
        TILE_VIEW_MAX_COLUMNS: 5,
      },
      configOverwrite: {
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        // startWithAudioMuted: true,
        // startWithVideoMuted: true,
      },
      jwt: undefined, // If you implement JaaS or your own JWT auth for Jitsi
    };

    try {
        const api = new window.JitsiMeetExternalAPI(domain, options);
        setJitsiApi(api);
        setIsJitsiLoading(false);

        api.addEventListener('videoConferenceLeft', (event: any) => {
            // Check if this is a leave action by the current user or meeting ended by host
            if (event.roomName === meeting.id) { // Ensure it's for the current room
                if(isUserHost()){
                    // If host leaves via Jitsi, we consider the meeting potentially ended by them
                    // The endMeetingAction should ideally be triggered by our app's button though.
                    // For now, just navigate.
                }
                router.push('/meetings');
            }
        });
        // Handle other Jitsi events if needed
    } catch (error) {
        console.error("Error initializing Jitsi:", error);
        toast({title: "Jitsi Error", description: "Could not initialize video call. Please try refreshing.", variant: "destructive"});
        setIsJitsiLoading(false);
    }

  }, [meeting, user, userProfile, jitsiApi, jitsiScriptLoaded, router, toast, isUserHost]);


  // Initialize Jitsi when conditions are met
  useEffect(() => {
    if (meeting && meeting.isActive && user && isUserParticipant() && jitsiScriptLoaded && !jitsiApi && jitsiContainerRef.current) {
      initializeJitsi();
    }
  }, [meeting, user, isUserParticipant, jitsiScriptLoaded, jitsiApi, initializeJitsi]);

  // Cleanup Jitsi API on component unmount
  useEffect(() => {
    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
        setJitsiApi(null);
      }
    };
  }, [jitsiApi]);


  const handleJoinMeetingFirestore = async () => {
    if (!user || !userProfile || !meeting) return;
    setIsJoiningFirestore(true);
    const result = await joinMeetingAction(meeting.id, userProfile);
    if (result.success) {
      toast({ title: "Joined Meeting", description: "You are now a participant." });
      // Re-fetch meeting to update participant list and trigger Jitsi initialization
      const updatedMeeting = await getMeetingDetailsFirestore(meeting.id);
      if(updatedMeeting) setMeeting(updatedMeeting);
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsJoiningFirestore(false);
  };

  const handleLeaveOrEndMeeting = async () => {
    if (isUserHost() && meeting) {
      // Host ends meeting
      const result = await endMeetingAction(meeting.id, user!.uid);
      if (result.success) {
        toast({ title: "Meeting Ended", description: "The meeting has been ended by the host." });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } else {
      // Participant leaves
      toast({ title: "Left Meeting" });
    }
    
    if (jitsiApi) {
      jitsiApi.executeCommand('hangup'); // Tell Jitsi to hang up
      // Jitsi's 'videoConferenceLeft' listener should handle dispose and navigation
    } else {
      router.push('/meetings'); // Navigate if Jitsi wasn't even loaded
    }
  };


  if (authLoading || isLoadingMeeting) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Authentication Required</h1>
        <p className="text-muted-foreground mb-6">Please log in to access meetings.</p>
        <Button onClick={() => router.push('/login')}>Log In</Button>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Meeting Not Found</h1>
        <p className="text-muted-foreground">The meeting you are looking for does not exist or may have been removed.</p>
      </div>
    );
  }

  if (!meeting.isActive && !jitsiApi) { // Also check !jitsiApi to prevent message if user is still in Jitsi when host ends
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <VideoOff className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Meeting Has Ended</h1>
        <p className="text-muted-foreground mb-6">This meeting is no longer active.</p>
        <Button onClick={() => router.push('/meetings')}>Back to Meetings</Button>
      </div>
    );
  }
  
  const canDisplayJitsi = meeting.isActive && isUserParticipant() && jitsiScriptLoaded;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 border-b flex items-center justify-between bg-card">
        <div>
            <h1 className="text-xl font-semibold">{meeting.title}</h1>
            <div className="text-xs text-muted-foreground">
                Hosted by {meeting.hostProfile.displayName || "Host"}
                <Badge variant="outline" className="ml-2">{meeting.participants.length} Participant(s)</Badge>
            </div>
        </div>
        <Button onClick={handleLeaveOrEndMeeting} variant={isUserHost() ? "destructive" : "outline"} size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          {isUserHost() ? "End Meeting for All" : "Leave Meeting"}
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-0 overflow-hidden relative">
        {!isUserParticipant() && meeting.isActive && (
          <Card className="m-auto p-6 text-center shadow-xl">
            <CardHeader>
              <CardTitle>Join "{meeting.title}"</CardTitle>
              <CardDescription>You need to join this meeting to participate in the video call.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleJoinMeetingFirestore} disabled={isJoiningFirestore} size="lg">
                {isJoiningFirestore ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <VideoIcon className="mr-2 h-5 w-5" />}
                Join Meeting
              </Button>
            </CardContent>
          </Card>
        )}

        {canDisplayJitsi && (
          <>
            {isJitsiLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Loading video call...</p>
                </div>
            )}
            <div ref={jitsiContainerRef} className="w-full h-full flex-1">
                {/* Jitsi Meet will be embedded here */}
            </div>
          </>
        )}

        {isUserParticipant() && !canDisplayJitsi && meeting.isActive && (
            <div className="m-auto text-center p-4">
                 <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                 <p className="text-muted-foreground">Preparing video call...</p>
                 {!jitsiScriptLoaded && <p className="text-xs text-muted-foreground">(Loading Jitsi library...)</p>}
            </div>
        )}


      </main>
       <footer className="p-3 border-t text-center text-xs text-muted-foreground bg-card">
         Participants: {meeting.participants.map(p => p.displayName || "Guest").join(', ')}
      </footer>
    </div>
  );
}
