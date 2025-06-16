
"use client";

import { useEffect, useState, useTransition, useRef, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Users, ScreenShare, Mic, MicOff, VideoOff, Settings2, ArrowLeft, Loader2, UserPlus, Copy, Check, PhoneOff, AlertTriangle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMeetingDetails } from '@/services/firestoreService';
import { joinMeeting as joinMeetingAction, sendMeetingChatMessage, endMeeting as endMeetingAction } from '@/actions/meetingActions';
import type { Meeting, MeetingParticipant } from '@/types/data';
import type { MeetingChatMessage } from '@/types/messaging';
import { getMeetingChatMessages } from '@/services/chatSubscriptionService';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { formatDistanceToNowStrict } from 'date-fns';
import { getInitials, cn } from "@/lib/utils";
import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type ILocalVideoTrack, type IRemoteAudioTrack, type IRemoteVideoTrack, type IAgoraRTCRemoteUser, type UID } from 'agora-rtc-sdk-ng';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "";
const AGORA_PLACEHOLDER_APP_ID = "YOUR_AGORA_APP_ID";

interface RemoteUserWithTracks extends IAgoraRTCRemoteUser {
  displayName?: string;
  photoURL?: string;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;

  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoiningMeeting, startJoiningTransition] = useTransition();
  const [hasCopied, setHasCopied] = useState(false);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true); // Camera starts off
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUserWithTracks[]>([]);
  const [isAgoraJoined, setIsAgoraJoined] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAgoraClientInitialized, setIsAgoraClientInitialized] = useState(false);

  const localVideoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRefs = useRef<Map<UID, HTMLDivElement | null>>(new Map());

  const [meetingChatMessages, setMeetingChatMessages] = useState<MeetingChatMessage[]>([]);
  const [newMeetingMessageText, setNewMeetingMessageText] = useState('');
  const [isSendingMeetingMessage, setIsSendingMeetingMessage] = useState(false);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isEndingMeeting, startEndingMeetingTransition] = useTransition();


  const isAgoraConfigValid = AGORA_APP_ID && AGORA_APP_ID !== AGORA_PLACEHOLDER_APP_ID && AGORA_APP_ID !== "YOUR_ACTUAL_AGORA_APP_ID_REPLACE_ME";
  const isCurrentUserHost = user && meeting && meeting.createdBy === user.uid;


  const cleanupAgora = useCallback(async (isLeavingChannel = true) => {
    console.log("Starting Agora cleanup...");
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
        console.log("Local audio track stopped and closed.");
      } catch (e) { console.error("Error closing local audio track:", e); }
    }
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
        console.log("Local video track stopped and closed.");
      } catch (e) { console.error("Error closing local video track:", e); }
    }

    if (agoraClientRef.current && isAgoraJoined && isLeavingChannel) {
      try {
        console.log("Attempting to leave Agora channel...");
        await agoraClientRef.current.leave();
        console.log("Left Agora channel successfully.");
      } catch (error) {
        console.error("Error leaving Agora channel:", error);
        toast({ title: "Agora Error", description: "Error leaving video call.", variant: "destructive" });
      }
    }
    
    setIsAgoraJoined(false);
    setRemoteUsers([]);
    setIsCameraOff(true); 
    setIsMicMuted(false);
    setHasCameraPermission(null); // Reset camera permission status
    console.log("Agora cleanup finished.");
  }, [isAgoraJoined, toast]);
  
  const initializeAgoraClient = useCallback(() => {
    if (!isAgoraConfigValid) {
      console.warn("Agora App ID is not configured or is a placeholder. Video call functionality will be disabled.");
      return;
    }
    if (!agoraClientRef.current) {
      try {
        agoraClientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        setIsAgoraClientInitialized(true);
        console.log("Agora client initialized successfully.");
      } catch (error) {
        console.error("Failed to create Agora client:", error);
        toast({ title: "Agora Error", description: "Could not initialize video call client.", variant: "destructive" });
      }
    }
  }, [isAgoraConfigValid, toast]);


  useEffect(() => {
    initializeAgoraClient(); 

    if (!meetingId) {
        router.push('/meetings');
        return;
    }
    async function fetchMeeting() {
      setIsLoading(true);
      try {
        const fetchedMeeting = await getMeetingDetails(meetingId);
        if (fetchedMeeting) {
          setMeeting(fetchedMeeting);
        } else {
          toast({ title: "Meeting Not Found", variant: "destructive" });
          router.push('/meetings');
        }
      } catch (error) {
        toast({ title: "Error", description: "Could not load meeting details.", variant: "destructive" });
        router.push('/meetings');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMeeting();
    
    return () => {
      console.log("MeetingDetailPage unmounting, performing cleanupAgora.");
      cleanupAgora();
    };
  }, [meetingId, router, toast, cleanupAgora, initializeAgoraClient]);


  useEffect(() => {
    if (!meetingId || !user) return;
    const unsubscribe = getMeetingChatMessages(
      meetingId, (messages) => setMeetingChatMessages(messages),
      (error) => {
        console.error("Error fetching meeting chat messages:", error);
        toast({ title: "Chat Error", description: "Could not load meeting chat.", variant: "destructive" });
      }
    );
    return () => unsubscribe();
  }, [meetingId, user, toast]);

  useEffect(() => {
    if (chatScrollAreaRef.current) {
      const viewport = chatScrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [meetingChatMessages]);

  const handleSendMeetingMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMeetingMessageText.trim() || !user || !userProfile || !meetingId || isSendingMeetingMessage) return;
    setIsSendingMeetingMessage(true);
    try {
      const result = await sendMeetingChatMessage(meetingId, userProfile, newMeetingMessageText);
      if (result.success) setNewMeetingMessageText('');
      else toast({ title: "Chat Error", description: result.message || "Could not send message.", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Chat Error", description: error.message || "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSendingMeetingMessage(false);
    }
  };


  const joinAgoraChannel = useCallback(async () => {
    if (!isAgoraConfigValid) {
        toast({ title: "Agora Not Configured", description: "Video call service is not set up.", variant: "destructive"});
        return;
    }
    if (!agoraClientRef.current || !user || !meetingId || isAgoraJoined || !isAgoraClientInitialized) {
        console.warn("Cannot join Agora channel: Client not ready, user not logged in, meetingId missing, or already joined.");
        if (!isAgoraClientInitialized) console.error("Agora client was not initialized prior to join attempt.");
        return;
    }
    
    setIsPublishing(true);
    console.log("Attempting to join Agora channel:", meetingId, "as user:", user.uid, "with App ID:", AGORA_APP_ID);
    try {
      await agoraClientRef.current.join(AGORA_APP_ID, meetingId, null, user.uid);
      setIsAgoraJoined(true);
      toast({ title: "Joined video call" });
      console.log("Successfully joined Agora channel. Client connection state:", agoraClientRef.current.connectionState);

      console.log("Attempting to create and publish local tracks...");
      try {
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioTrackRef.current = tracks[0];
        localVideoTrackRef.current = tracks[1];
        setHasCameraPermission(true);
        console.log("Local audio and video tracks created.");
      } catch (mediaError: any) {
        console.error("Failed to create media tracks:", mediaError);
        setHasCameraPermission(false);
        let errorDesc = "Could not access camera/microphone. Please check permissions.";
        if (mediaError.name === "NotAllowedError" || mediaError.message?.includes("Permission denied")) {
          errorDesc = "Camera/microphone permission denied. Please enable it in your browser settings.";
        } else if (mediaError.name === "NotFoundError" || mediaError.message?.includes("not found")) {
          errorDesc = "No camera/microphone found. Please ensure they are connected and enabled.";
        }
        toast({ title: "Media Error", description: errorDesc, variant: "destructive", duration: 7000 });
        
        // Do not publish if tracks failed to create
        await cleanupAgora(false); // Don't leave channel, just cleanup local tracks
        setIsPublishing(false);
        setIsCameraOff(true); // Ensure camera is shown as off
        setIsMicMuted(true); // Ensure mic is shown as muted
        return; 
      }
      
      if (localVideoTrackRef.current && localVideoContainerRef.current) {
        localVideoTrackRef.current.play(localVideoContainerRef.current);
        setIsCameraOff(false); // Camera is now on
        console.log("Local video track playing.");
      } else {
        console.warn("Local video track or container not available for playback.");
        setIsCameraOff(true);
      }
      if (localAudioTrackRef.current) {
        setIsMicMuted(false); 
        console.log("Local audio track initialized (default unmuted).");
      }
      
      if (agoraClientRef.current && localAudioTrackRef.current && localVideoTrackRef.current && agoraClientRef.current.connectionState === "CONNECTED") {
        await agoraClientRef.current.publish([localAudioTrackRef.current, localVideoTrackRef.current]);
        console.log("Published local tracks successfully.");
      } else {
        console.warn("Skipping publish: Client not connected or tracks not available.", {
          connectionState: agoraClientRef.current?.connectionState,
          hasAudioTrack: !!localAudioTrackRef.current,
          hasVideoTrack: !!localVideoTrackRef.current,
        });
        if (isAgoraJoined && agoraClientRef.current?.connectionState !== "CONNECTED") {
            toast({
                title: "Publish Error",
                description: `Could not publish tracks. Connection state: ${agoraClientRef.current?.connectionState}. Try rejoining.`,
                variant: "destructive",
                duration: 7000,
            });
            await cleanupAgora();
        }
      }
    } catch (error: any) {
      console.error("Failed to join Agora channel or publish tracks:", error);
      let description = `Could not join or publish: ${error.message || 'Unknown error'}`;
      if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER' || (error.message && error.message.toLowerCase().includes('dynamic use static key'))) {
        description = "Failed to join: Your Agora project may require a security token. For testing, ensure your Agora project is set to 'APP ID' authentication. For production, implement token authentication.";
      } else if (error.code === 'UID_CONFLICT') {
        description = "Failed to join: User ID conflict. Try again shortly.";
      } else if (error.message && error.message.includes("INVALID_APP_ID")) {
        description = "Failed to join: The Agora App ID is invalid. Please check your configuration.";
      } else if (error.message && error.message.includes("INVALID_OPERATION") && error.message.toLowerCase().includes("haven't joined yet")) {
        description = "Failed to publish tracks: The connection to the channel was not fully established. Please try rejoining.";
      }
      toast({ title: "Video Call Error", description, variant: "destructive", duration: 10000 });
      await cleanupAgora(); 
    } finally {
      setIsPublishing(false);
    }
  }, [user, meetingId, isAgoraJoined, cleanupAgora, toast, isAgoraConfigValid, isAgoraClientInitialized, AGORA_APP_ID]);


  useEffect(() => {
    const client = agoraClientRef.current;
    if (!client || !isAgoraJoined || !isAgoraClientInitialized) return;
    console.log("Setting up Agora event listeners.");

    const handleUserPublished = async (remoteUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log(`Remote user ${remoteUser.uid} published ${mediaType}`);
      try {
        await client.subscribe(remoteUser, mediaType);
        console.log(`Subscribed to ${mediaType} from ${remoteUser.uid}`);
        
        setRemoteUsers(prevUsers => {
          const existingUser = prevUsers.find(u => u.uid === remoteUser.uid);
          const participantProfile = meeting?.participants.find(p => p.uid === remoteUser.uid.toString());
          const updatedUser = {
            ...remoteUser, 
            displayName: participantProfile?.displayName || `User ${remoteUser.uid}`,
            photoURL: participantProfile?.photoURL,
          };
          return existingUser ? prevUsers.map(u => u.uid === remoteUser.uid ? updatedUser : u) : [...prevUsers, updatedUser];
        });

        if (mediaType === 'audio' && remoteUser.audioTrack) remoteUser.audioTrack.play();
      } catch (error) { console.error(`Failed to subscribe to ${remoteUser.uid}:`, error); }
    };

    const handleUserUnpublished = (remoteUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log(`Remote user ${remoteUser.uid} unpublished ${mediaType}`);
      if (mediaType === 'video') setRemoteUsers(prev => prev.map(u => u.uid === remoteUser.uid ? { ...u, videoTrack: undefined } : u));
    };
    
    const handleUserLeft = (remoteUser: IAgoraRTCRemoteUser) => {
        console.log(`Remote user ${remoteUser.uid} left.`);
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
    };
    
    const handleConnectionStateChange = (curState: string, prevState: string, reason?: string) => {
      console.log(`Agora connection state changed from ${prevState} to ${curState}. Reason: ${reason || 'N/A'}`);
      if (curState === "DISCONNECTED" && prevState !== "DISCONNECTED" && isAgoraJoined) {
        toast({ title: "Disconnected", description: `Lost connection to the meeting. Reason: ${reason || 'Unknown'}. Please try rejoining.`, variant: "destructive", duration: 7000 });
        cleanupAgora();
      }
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);
    client.on("connection-state-change", handleConnectionStateChange);

    return () => {
      console.log("Cleaning up Agora event listeners.");
      client.removeAllListeners();
    };
  }, [isAgoraJoined, meeting?.participants, isAgoraClientInitialized, cleanupAgora, toast]);

  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack && user.hasVideo) {
        const container = remoteVideoContainerRefs.current.get(user.uid);
        if (container && !container.hasChildNodes()) { 
          console.log(`Playing video for remote user ${user.uid}.`);
          user.videoTrack.play(container);
        } else if (container && container.firstChild && (container.firstChild as HTMLElement).id !== `video-${user.uid}` ) {
          while(container.firstChild) container.removeChild(container.firstChild);
          user.videoTrack.play(container);
        }
      }
    });
  }, [remoteUsers]);


  const handleJoinMeeting = () => {
    if (!user || !userProfile || !meeting) return;
    startJoiningTransition(async () => {
      const result = await joinMeetingAction(meeting.id, { uid: user.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL });
      if (result.success) {
        toast({ title: "Joined Meeting!", description: result.message });
        const updatedMeeting = await getMeetingDetails(meeting.id);
        if (updatedMeeting) setMeeting(updatedMeeting);
        if (isAgoraConfigValid && isAgoraClientInitialized) joinAgoraChannel();
        else if (!isAgoraConfigValid) toast({ title: "Video Call Disabled", description: "Agora App ID is not configured correctly.", variant: "destructive" });
      } else {
        toast({ title: "Error Joining Meeting", description: result.message, variant: "destructive" });
      }
    });
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setHasCopied(true);
      toast({ title: "Link Copied!"});
      setTimeout(() => setHasCopied(false), 2000);
    }).catch(() => toast({ title: "Failed to copy link", variant: "destructive"}));
  };

  const toggleCamera = async () => {
    if (!isAgoraJoined || !isAgoraConfigValid) {
      if (!isAgoraJoined) toast({ title: "Not in call", description: "Join the video call to use your camera.", variant: "destructive" });
      return;
    }

    if (!localVideoTrackRef.current) { // Try to create track if it doesn't exist
      if (isPublishing) return;
      console.log("Attempting to create and publish camera track on demand...");
      setIsPublishing(true);
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = videoTrack;
        if (localVideoContainerRef.current) localVideoTrackRef.current.play(localVideoContainerRef.current);
        await agoraClientRef.current?.publish([localVideoTrackRef.current]);
        setIsCameraOff(false);
        setHasCameraPermission(true);
        console.log("Camera track created and published on demand.");
      } catch (error: any) {
        console.error("Failed to start camera on demand:", error);
        setHasCameraPermission(false);
        toast({ title: "Camera Error", description: `Could not start camera: ${error.message}. Check permissions.`, variant: "destructive" });
        localVideoTrackRef.current = null;
        setIsCameraOff(true);
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    try { // If track exists, toggle its enabled state
      await localVideoTrackRef.current.setEnabled(!localVideoTrackRef.current.enabled);
      setIsCameraOff(!localVideoTrackRef.current.enabled);
      console.log(`Camera toggled. Enabled: ${localVideoTrackRef.current.enabled}`);
    } catch (error) {
      console.error("Error toggling camera:", error);
      toast({ title: "Camera Error", description: "Could not toggle camera state.", variant: "destructive" });
    }
  };

  const toggleMic = async () => {
    if (!localAudioTrackRef.current) {
         toast({ title: "Not in call", description: "Join the video call to use your microphone.", variant: "destructive" });
         return;
    }
    try {
      await localAudioTrackRef.current.setEnabled(!localAudioTrackRef.current.enabled);
      setIsMicMuted(!localAudioTrackRef.current.enabled);
      console.log(`Microphone toggled. Enabled: ${localAudioTrackRef.current.enabled}`);
    } catch (error) {
      console.error("Error toggling microphone:", error);
      toast({ title: "Microphone Error", description: "Could not toggle microphone state.", variant: "destructive" });
    }
  };
  
  const handleLeaveMeeting = async () => {
    console.log("User clicked Leave Call button.");
    await cleanupAgora();
    toast({title: "You left the video call."});
    // UI updates based on isAgoraJoined state
  };

  const handleEndMeeting = async () => {
    if (!meeting || !user || !isCurrentUserHost) return;
    startEndingMeetingTransition(async () => {
        const result = await endMeetingAction(meeting.id, user.uid);
        if (result.success) {
            toast({ title: "Meeting Ended", description: "The meeting has been ended for all participants." });
            await cleanupAgora(); // Host also cleans up their Agora session
            // Update local meeting state or re-fetch
            const updatedMeeting = await getMeetingDetails(meeting.id);
            if (updatedMeeting) setMeeting(updatedMeeting);
            // router.push('/meetings'); // Optionally redirect host
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  };


  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!meeting) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Video className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold font-headline">Meeting Not Found</h1>
        <p className="text-muted-foreground mb-6">The meeting you are looking for does not exist or may have been removed.</p>
        <Button asChild variant="outline"><Link href="/meetings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Meetings</Link></Button>
      </div>
    );
  }
  
  const currentUserIsParticipant = user && meeting.participantUids.includes(user.uid);
  const isMeetingActive = meeting.isActive;

  return (
    <div className="container mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8">
      {!isAgoraConfigValid && (AGORA_APP_ID === AGORA_PLACEHOLDER_APP_ID || AGORA_APP_ID === "YOUR_ACTUAL_AGORA_APP_ID_REPLACE_ME") && (
         <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Agora App ID Missing</AlertTitle>
            <AlertDescription>
              Video call functionality is disabled. Please set <code className="font-mono bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_AGORA_APP_ID</code> in your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> or <code className="font-mono bg-muted px-1 py-0.5 rounded">.env.local</code> file.
            </AlertDescription>
          </Alert>
      )}
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
            <div className="flex-grow">
              <Button variant="outline" size="sm" onClick={() => router.push('/meetings')} className="mb-2 sm:mb-0 hidden sm:inline-flex">
                <ArrowLeft className="mr-2 h-4 w-4" /> All Meetings
              </Button>
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold font-headline mt-1">{meeting.title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Hosted by {meeting.createdByName || 'User'} &bull; Created {formatDistanceToNowStrict(new Date(meeting.createdAt), { addSuffix: true })}
                {!isMeetingActive && <span className="text-destructive font-semibold"> (Ended)</span>}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-center w-full sm:w-auto">
               <Button onClick={copyMeetingLink} variant="outline" size="sm" className="w-full sm:w-auto">
                {hasCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                {hasCopied ? 'Copied!' : 'Copy Link'}
              </Button>
              {!currentUserIsParticipant && isMeetingActive && (
                <Button onClick={handleJoinMeeting} disabled={isJoiningMeeting || !isAgoraConfigValid} size="sm" className="w-full sm:w-auto">
                  {isJoiningMeeting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Join Meeting
                </Button>
              )}
              {currentUserIsParticipant && isMeetingActive && !isAgoraJoined && (
                <Button onClick={joinAgoraChannel} disabled={isPublishing || !isAgoraConfigValid || !isAgoraClientInitialized} size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                    Join Video Call
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-4"> 
              {currentUserIsParticipant && isAgoraJoined && isMeetingActive && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Your Camera</h3>
                  <div ref={localVideoContainerRef} id="local-video-container" className="aspect-video bg-black rounded-lg shadow-md relative overflow-hidden border">
                    {(isCameraOff || hasCameraPermission === false) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-md p-4 text-center">
                            <VideoOff className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {hasCameraPermission === false ? "Camera permission denied or no camera found." : "Your camera is off."}
                            </p>
                            {hasCameraPermission === false && <p className="text-xs text-muted-foreground/80 mt-1">Check browser settings.</p>}
                        </div>
                    )}
                    <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                      {userProfile?.displayName || "You"}
                    </p>
                  </div>
                </div>
              )}

              {isMeetingActive && remoteUsers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Participants</h3>
                  <div className={cn(
                    "grid gap-2",
                    remoteUsers.length === 1 ? "grid-cols-1" :
                    remoteUsers.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                    remoteUsers.length <= 4 ? "grid-cols-1 sm:grid-cols-2" : 
                    "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" 
                  )}>
                    {remoteUsers.map(remoteU => (
                      <div 
                        key={remoteU.uid} 
                        ref={el => remoteVideoContainerRefs.current.set(remoteU.uid, el)}
                        id={`video-${remoteU.uid}`} // Ensure ID for direct play
                        className="aspect-video bg-muted/70 rounded-lg flex flex-col items-center justify-center border border-muted-foreground/20 shadow-inner relative overflow-hidden"
                      >
                         {!remoteU.hasVideo && (
                            <>
                            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mb-2">
                                <AvatarImage src={remoteU.photoURL || undefined} alt={remoteU.displayName || 'User'} data-ai-hint="remote participant avatar"/>
                                <AvatarFallback>{getInitials(remoteU.displayName)}</AvatarFallback>
                            </Avatar>
                            <VideoOff className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground opacity-50" />
                            </>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground text-center px-2 truncate w-full absolute bottom-2 bg-black/30 text-white py-1">
                          {remoteU.displayName || `User ${remoteU.uid}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isMeetingActive && isAgoraJoined && remoteUsers.length === 0 && (
                  <div className="h-48 sm:h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Users className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground text-sm sm:text-lg text-center">Waiting for others to join the video call...</p>
                  </div>
              )}
              {isMeetingActive && !isAgoraJoined && currentUserIsParticipant && (
                 <div className="h-48 sm:h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Video className="h-12 w-12 sm:h-16 sm:w-16 text-primary opacity-80" />
                    <p className="mt-4 text-primary/90 text-sm sm:text-lg text-center">Click "Join Video Call" to start/join.</p>
                    {!isAgoraConfigValid && <p className="text-xs text-destructive mt-2">Video call service is not configured.</p>}
                  </div>
              )}
              {isMeetingActive && !currentUserIsParticipant && (
                 <div className="h-48 sm:h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Video className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground text-sm sm:text-lg text-center">Join the meeting to participate in the video call.</p>
                     {!isAgoraConfigValid && <p className="text-xs text-destructive mt-2">Video call service is not configured.</p>}
                  </div>
              )}
               {!isMeetingActive && (
                 <div className="h-48 sm:h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <VideoOff className="h-12 w-12 sm:h-16 sm:w-16 text-destructive opacity-80" />
                    <p className="mt-4 text-destructive/90 text-sm sm:text-lg text-center">This meeting has ended.</p>
                  </div>
              )}
            </div>

            <div className="md:col-span-4 space-y-4"> 
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="flex items-center text-base"><Users className="mr-2 h-4 w-4 text-primary"/> Participants ({meeting.participants.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-40 overflow-y-auto">
                  {meeting.participants.map(p => (
                    <div key={p.uid} className="flex items-center space-x-2 p-1.5 hover:bg-muted/50 rounded-md">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.photoURL || undefined} alt={p.displayName || 'User'} data-ai-hint="participant avatar"/>
                        <AvatarFallback className="text-xs">{getInitials(p.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">{p.displayName || 'User'}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="flex flex-col h-[calc(100%-10rem)] sm:h-[calc(100%-12rem)]">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="text-base">Meeting Chat</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-2" ref={chatScrollAreaRef}>
                    {meetingChatMessages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No messages yet.</p>
                    )}
                    {meetingChatMessages.map(msg => (
                      <MessageBubble key={msg.id} message={msg} currentUserId={user?.uid || ''} isMeetingChat={true} />
                    ))}
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-2 border-t">
                  <form onSubmit={handleSendMeetingMessage} className="flex w-full items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Send a message..."
                      value={newMeetingMessageText}
                      onChange={(e) => setNewMeetingMessageText(e.target.value)}
                      className="flex-1 text-xs"
                      disabled={!currentUserIsParticipant || isSendingMeetingMessage || !isAgoraJoined || !isMeetingActive}
                    />
                    <Button type="submit" size="icon" className="h-8 w-8" disabled={!currentUserIsParticipant || !newMeetingMessageText.trim() || isSendingMeetingMessage || !isAgoraJoined || !isMeetingActive}>
                      {isSendingMeetingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </div>
          </div>
        </CardContent>

        {isMeetingActive && currentUserIsParticipant && isAgoraJoined && (
          <CardFooter className="border-t p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
             <Button 
                variant={isMicMuted ? "destructive" : "outline"} 
                size="icon" 
                className="h-10 w-10 sm:h-12 sm:w-12" 
                title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"} 
                onClick={toggleMic}
                disabled={!localAudioTrackRef.current || isPublishing}
             >
                {isMicMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
             </Button>
             <Button 
                variant={isCameraOff ? "destructive" : "outline"} 
                size="icon" 
                className="h-10 w-10 sm:h-12 sm:w-12" 
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                onClick={toggleCamera}
                disabled={isPublishing && !localVideoTrackRef.current && !isCameraOff }
             >
                {isCameraOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
             </Button>
             <Button 
                variant={isScreenSharing ? "default" : "outline"} 
                size="icon" 
                className="h-10 w-10 sm:h-12 sm:w-12" 
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen (Placeholder)"}
                onClick={() => {
                    setIsScreenSharing(!isScreenSharing);
                    toast({title: "Screen Sharing (Placeholder)", description: isScreenSharing ? "Screen sharing stopped." : "Screen sharing started."});
                }}
                disabled // Screen sharing is complex and not implemented yet
            >
                <ScreenShare className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            
            {isCurrentUserHost ? (
                <Button variant="destructive" size="lg" className="h-10 px-4 sm:h-12 sm:px-6" title="End Meeting" onClick={handleEndMeeting} disabled={isEndingMeeting}>
                    {isEndingMeeting ? <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 mr-0 sm:mr-2 animate-spin"/> : <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 mr-0 sm:mr-2" />}
                    <span className="hidden sm:inline">{isEndingMeeting ? "Ending..." : "End Meeting"}</span>
                </Button>
            ) : (
                <Button variant="destructive" size="lg" className="h-10 px-4 sm:h-12 sm:px-6" title="Leave Video Call" onClick={handleLeaveMeeting}>
                    <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Leave Call</span>
                </Button>
            )}

            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12" title="Meeting Settings (Placeholder)" disabled>
              <Settings2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </CardFooter>
        )}
        {!isMeetingActive && (
            <CardFooter className="border-t p-3 sm:p-4">
                 <p className="text-xs text-destructive font-semibold text-center w-full">This meeting has ended.</p>
            </CardFooter>
        )}
      </Card>
       <Button variant="outline" size="sm" onClick={() => router.push('/meetings')} className="sm:hidden w-full mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> All Meetings
        </Button>
    </div>
  );
}

    