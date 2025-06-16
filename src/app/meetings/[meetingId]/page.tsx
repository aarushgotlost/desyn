
"use client";

import { useEffect, useState, useTransition, useRef, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, ScreenShare, Mic, MicOff, VideoOff, Settings2, ArrowLeft, Loader2, UserPlus, Copy, Check, PhoneOff, AlertTriangle, Send, MessageSquareText } from "lucide-react";
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
  const [isCameraOff, setIsCameraOff] = useState(true);
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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null); // null = unknown, true = granted, false = denied
  const [isEndingMeeting, startEndingMeetingTransition] = useTransition();
  const [showSidebar, setShowSidebar] = useState(true); // Default to true for larger screens

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
    setIsCameraOff(true); // Reset camera state
    setIsMicMuted(false); // Reset mic state (typically unmuted by default)
    setHasCameraPermission(null); // Reset camera permission state
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
    initializeAgoraClient(); // Initialize on component mount

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

      console.log("Attempting to create local media tracks...");
      try {
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
          {}, // Default microphone and camera
          { encoderConfig: "480p_1" } // Standard video quality
        );
        localAudioTrackRef.current = tracks[0];
        localVideoTrackRef.current = tracks[1];
        setHasCameraPermission(true); // Assume permission granted if tracks are created
        console.log("Local audio and video tracks created successfully.");
        console.log("Local video track object:", localVideoTrackRef.current);
        console.log("Local video container DOM element:", localVideoContainerRef.current);

        if (localVideoTrackRef.current && localVideoContainerRef.current) {
          console.log("Local video track found, attempting to play in container:", localVideoContainerRef.current);
          // Ensure container is clear before playing
          while (localVideoContainerRef.current.firstChild) {
            localVideoContainerRef.current.removeChild(localVideoContainerRef.current.firstChild);
          }
          localVideoTrackRef.current.play(localVideoContainerRef.current);
          setIsCameraOff(false); // Camera is now on
          console.log("Local video track play initiated. IsPlaying:", localVideoTrackRef.current.isPlaying);
        } else {
          console.warn("Local video track or container not available for playback. Will not play local video.");
          if (!localVideoTrackRef.current) console.warn("Local video track is null.");
          if (!localVideoContainerRef.current) console.warn("localVideoContainerRef.current is null.");
          setIsCameraOff(true);
        }

        if (localAudioTrackRef.current) {
          setIsMicMuted(false); // Default to unmuted
          console.log("Local audio track initialized (default unmuted).");
        } else {
          console.warn("Local audio track not created.");
        }

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
        
        // Cleanup any partially created tracks
        if (localAudioTrackRef.current) { localAudioTrackRef.current.close(); localAudioTrackRef.current = null; }
        if (localVideoTrackRef.current) { localVideoTrackRef.current.close(); localVideoTrackRef.current = null; }
        setIsPublishing(false);
        setIsCameraOff(true); // Ensure UI reflects camera is off
        setIsMicMuted(true); // Mute if audio track failed
        return; // Stop further execution in joinAgoraChannel
      }
      
      // Check connection state BEFORE publishing
      if (agoraClientRef.current && agoraClientRef.current.connectionState === "CONNECTED" && localAudioTrackRef.current && localVideoTrackRef.current) {
        console.log("Publishing local tracks...");
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
            await cleanupAgora(); // Cleanup to allow rejoining
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
      await cleanupAgora(); // Cleanup on failure
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
        
        // Add or update remote user with their tracks and profile info
        setRemoteUsers(prevUsers => {
          const existingUser = prevUsers.find(u => u.uid === remoteUser.uid);
          const participantProfile = meeting?.participants.find(p => p.uid === remoteUser.uid.toString());
          const updatedUser = {
            ...remoteUser, // This will include audioTrack and videoTrack after subscription
            displayName: participantProfile?.displayName || `User ${remoteUser.uid}`,
            photoURL: participantProfile?.photoURL,
          };
          return existingUser ? prevUsers.map(u => u.uid === remoteUser.uid ? updatedUser : u) : [...prevUsers, updatedUser];
        });

        if (mediaType === 'audio' && remoteUser.audioTrack) {
          console.log(`Playing audio for remote user ${remoteUser.uid}.`);
          remoteUser.audioTrack.play();
        }
      } catch (error) {
        console.error(`Failed to subscribe to ${remoteUser.uid}:`, error);
      }
    };

    const handleUserUnpublished = (remoteUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log(`Remote user ${remoteUser.uid} unpublished ${mediaType}`);
      // If video track is unpublished, remove it from the user object to stop rendering it
      if (mediaType === 'video') {
        setRemoteUsers(prev => prev.map(u => u.uid === remoteUser.uid ? { ...u, videoTrack: undefined } : u));
      }
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

  // Effect to play remote video tracks when they become available
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack && user.hasVideo) {
        const container = remoteVideoContainerRefs.current.get(user.uid);
        if (container && !container.hasChildNodes()) { // Only play if container is empty
          console.log(`Playing video for remote user ${user.uid}.`);
          user.videoTrack.play(container);
        } else if (container && container.firstChild && (container.firstChild as HTMLElement).id !== `video-track-${user.uid}` ) {
          // If container has something else, clear and play (e.g. if placeholder was there)
          console.log(`Re-playing video for remote user ${user.uid} after clearing container.`);
          while(container.firstChild) container.removeChild(container.firstChild);
          // It's good practice to create a specific player element for Agora
          const videoPlayerContainer = document.createElement('div');
          videoPlayerContainer.id = `video-track-${user.uid}`; // Ensure unique ID if needed
          videoPlayerContainer.className = 'w-full h-full';
          container.appendChild(videoPlayerContainer);
          user.videoTrack.play(videoPlayerContainer);
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

    if (!localVideoTrackRef.current) { // If camera was never started or track was closed
      if (isPublishing) return; // Prevent multiple attempts if already trying
      console.log("Attempting to create and publish camera track on demand...");
      setIsPublishing(true);
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "480p_1" });
        localVideoTrackRef.current = videoTrack;
        setHasCameraPermission(true); // Assume granted
        if (localVideoContainerRef.current) {
            console.log("Playing on-demand camera track in container:", localVideoContainerRef.current);
            while (localVideoContainerRef.current.firstChild) { // Clear container
              localVideoContainerRef.current.removeChild(localVideoContainerRef.current.firstChild);
            }
            localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
        await agoraClientRef.current?.publish([localVideoTrackRef.current]);
        setIsCameraOff(false);
        console.log("Camera track created and published on demand. IsPlaying:", localVideoTrackRef.current.isPlaying);
      } catch (error: any) {
        console.error("Failed to start camera on demand:", error);
        setHasCameraPermission(false);
        toast({ title: "Camera Error", description: `Could not start camera: ${error.message}. Check permissions.`, variant: "destructive" });
        localVideoTrackRef.current = null; // Ensure track is null if creation failed
        setIsCameraOff(true);
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    // If track exists, just toggle enabled state
    try { 
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
         // This could happen if initial media creation failed for audio
         toast({ title: "Not in call or Mic Error", description: "Join the video call to use your microphone, or mic not available.", variant: "destructive" });
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
    await cleanupAgora(); // This sets isAgoraJoined to false
    toast({title: "You left the video call."});
    // User remains on the page but is no longer in the Agora call
  };

  const handleEndMeeting = async () => {
    if (!meeting || !user || !isCurrentUserHost) return;
    startEndingMeetingTransition(async () => {
        const result = await endMeetingAction(meeting.id, user.uid);
        if (result.success) {
            toast({ title: "Meeting Ended", description: "The meeting has been ended for all participants." });
            await cleanupAgora(); // Also cleanup host's Agora session
            // Refetch meeting details to update isActive state
            const updatedMeeting = await getMeetingDetails(meeting.id);
            if (updatedMeeting) setMeeting(updatedMeeting);
            // router.push('/meetings'); // Optionally redirect after ending
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    });
  };


  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
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
  // Calculate total participants for grid based on Agora state if joined, otherwise Firestore participants
  const totalParticipantsForGrid = isAgoraJoined 
    ? (localVideoTrackRef.current ? 1 : 0) + remoteUsers.length
    : meeting.participants.length;


  const getGridColsClass = () => {
    if (totalParticipantsForGrid <= 1) return 'grid-cols-1';
    if (totalParticipantsForGrid === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipantsForGrid <= 4) return 'grid-cols-2';
    if (totalParticipantsForGrid <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (totalParticipantsForGrid <= 9) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4'; // Max 4 for larger screens, adjust as needed
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header Bar */}
      <header className="bg-card border-b p-3 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/meetings')} aria-label="Back to meetings">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-lg font-semibold truncate max-w-xs sm:max-w-md md:max-w-lg">{meeting.title}</h1>
                <p className="text-xs text-muted-foreground">
                    {!isMeetingActive ? "Meeting Ended" : isAgoraJoined ? `${meeting.participants.length} participant(s) online` : "Not in call"}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={copyMeetingLink} variant="ghost" size="sm" className="hidden sm:flex">
                {hasCopied ? <Check className="mr-1.5 h-4 w-4 text-green-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {hasCopied ? 'Copied!' : 'Copy Link'}
            </Button>
            {!currentUserIsParticipant && isMeetingActive && (
            <Button onClick={handleJoinMeeting} disabled={isJoiningMeeting || !isAgoraConfigValid} size="sm">
                {isJoiningMeeting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Join Meeting
            </Button>
            )}
            {currentUserIsParticipant && isMeetingActive && !isAgoraJoined && (
            <Button onClick={joinAgoraChannel} disabled={isPublishing || !isAgoraConfigValid || !isAgoraClientInitialized} size="sm" className="bg-green-600 hover:bg-green-700">
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                Join Video Call
            </Button>
            )}
        </div>
      </header>

      {!isAgoraConfigValid && (AGORA_APP_ID === AGORA_PLACEHOLDER_APP_ID || AGORA_APP_ID === "YOUR_ACTUAL_AGORA_APP_ID_REPLACE_ME") && (
         <Alert variant="destructive" className="m-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Agora App ID Missing</AlertTitle>
            <AlertDescription>
              Video call functionality is disabled. Please set <code className="font-mono bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_AGORA_APP_ID</code> in your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env.local</code> file.
            </AlertDescription>
          </Alert>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid Area */}
        <main className="flex-1 flex flex-col bg-muted/30 p-2 overflow-y-auto">
          {!isMeetingActive ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <VideoOff className="h-20 w-20 text-destructive mb-4" />
              <h2 className="text-xl font-semibold">Meeting Has Ended</h2>
              <p className="text-muted-foreground">This meeting is no longer active.</p>
            </div>
          ) : !isAgoraJoined && currentUserIsParticipant ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Video className="h-20 w-20 text-primary mb-4" />
              <h2 className="text-xl font-semibold">Ready to Join Video?</h2>
              <p className="text-muted-foreground mb-4">Click "Join Video Call" in the header to start.</p>
              {!isAgoraConfigValid && <p className="text-xs text-destructive">Video call service is not configured properly.</p>}
            </div>
          ) : !currentUserIsParticipant ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Users className="h-20 w-20 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">Join the Meeting</h2>
              <p className="text-muted-foreground mb-4">Click "Join Meeting" in the header to participate.</p>
            </div>
          ) : (
            // Video grid for active call
            <div className={cn("grid flex-1 gap-2 items-center justify-center content-start", getGridColsClass())}>
              {/* Local User Video */}
              <div
                id="local-video-container-wrapper"
                className={cn(
                  "bg-black rounded-md shadow-lg relative overflow-hidden border-2",
                  isCameraOff ? "border-muted" : "border-primary" 
                )}
                style={{ aspectRatio: '16/9', minHeight: '150px' }} // Ensure minHeight for visibility
              >
                <div ref={localVideoContainerRef} id="local-video-container" className="w-full h-full bg-black" style={{ width: '100%', height: '100%' }} />
                {(isCameraOff || hasCameraPermission === false) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-md p-2 text-center">
                    {hasCameraPermission === false ? (
                      <>
                        <VideoOff className="h-10 w-10 text-destructive mb-2" />
                        <p className="text-destructive text-xs">Camera permission denied.</p>
                      </>
                    ) : userProfile?.photoURL ? (
                        <Avatar className="h-16 w-16 mb-2">
                            <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName || "You"} data-ai-hint="local user avatar placeholder" />
                            <AvatarFallback>{getInitials(userProfile.displayName)}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <VideoOff className="h-10 w-10 text-muted-foreground mb-2" />
                    )}
                    {hasCameraPermission !== false && <p className="text-muted-foreground text-xs">Your camera is off.</p>}
                  </div>
                )}
                <p className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded truncate">
                  {userProfile?.displayName || "You"} (You)
                </p>
              </div>

              {/* Remote Users Video */}
              {remoteUsers.map(remoteU => (
                <div 
                  key={remoteU.uid} 
                  id={`video-container-wrapper-${remoteU.uid}`}
                  className="bg-black rounded-md shadow-lg relative overflow-hidden border-2 border-muted"
                  style={{ aspectRatio: '16/9', minHeight: '120px' }}
                >
                  <div 
                    ref={el => remoteVideoContainerRefs.current.set(remoteU.uid, el)}
                    id={`video-container-${remoteU.uid}`} 
                    className="w-full h-full bg-black"  style={{ width: '100%', height: '100%' }}
                  />
                  {(!remoteU.hasVideo || !remoteU.videoTrack?.isPlaying) && ( // Check if track is playing
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-md p-2 text-center">
                      <Avatar className="h-16 w-16 mb-2">
                          <AvatarImage src={remoteU.photoURL || undefined} alt={remoteU.displayName || 'User'} data-ai-hint="remote participant avatar placeholder"/>
                          <AvatarFallback>{getInitials(remoteU.displayName)}</AvatarFallback>
                      </Avatar>
                      <VideoOff className="h-6 w-6 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  <p className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded truncate">
                    {remoteU.displayName || `User ${remoteU.uid}`}
                  </p>
                </div>
              ))}
              {isAgoraJoined && remoteUsers.length === 0 && localVideoTrackRef.current && (
                  <div className="col-span-full flex items-center justify-center text-muted-foreground italic text-sm py-4">
                    Waiting for others to join...
                  </div>
              )}
            </div>
          )}
        </main>

        {/* Sidebar for Participants and Chat */}
        {isMeetingActive && currentUserIsParticipant && showSidebar && (
          <aside className="w-full md:w-80 border-l bg-card flex flex-col h-full md:flex"> {/* Ensure it takes full height or define specific height */}
            <Tabs defaultValue="participants" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b flex-shrink-0">
                <TabsTrigger value="participants"><Users className="mr-1.5 h-4 w-4"/>Participants</TabsTrigger>
                <TabsTrigger value="chat"><MessageSquareText className="mr-1.5 h-4 w-4"/>Chat</TabsTrigger>
              </TabsList>
              <TabsContent value="participants" className="flex-1 overflow-y-auto p-0">
                <ScrollArea className="h-full p-3">
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground px-1">In this meeting ({meeting.participants.length})</h3>
                  {meeting.participants.map(p => (
                    <div key={p.uid} className="flex items-center space-x-2 p-1.5 hover:bg-muted/50 rounded-md">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.photoURL || undefined} alt={p.displayName || 'User'} data-ai-hint="participant avatar list item"/>
                        <AvatarFallback className="text-xs">{getInitials(p.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">{p.displayName || 'User'}</span>
                      {p.uid === user?.uid && <span className="text-xs text-muted-foreground">(You)</span>}
                      {p.uid === meeting.createdBy && <span className="text-xs text-primary/80">(Host)</span>}
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="chat" className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-grow p-3" ref={chatScrollAreaRef}>
                  {meetingChatMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages yet.</p>
                  )}
                  {meetingChatMessages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} currentUserId={user?.uid || ''} isMeetingChat={true} />
                  ))}
                </ScrollArea>
                <form onSubmit={handleSendMeetingMessage} className="flex w-full items-center space-x-2 p-3 border-t bg-muted/30 flex-shrink-0">
                  <Input
                    type="text"
                    placeholder="Send a message..."
                    value={newMeetingMessageText}
                    onChange={(e) => setNewMeetingMessageText(e.target.value)}
                    className="flex-1 text-xs"
                    disabled={isSendingMeetingMessage || !isAgoraJoined}
                  />
                  <Button type="submit" size="icon" className="h-8 w-8" disabled={!newMeetingMessageText.trim() || isSendingMeetingMessage || !isAgoraJoined}>
                    {isSendingMeetingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>

      {/* Controls Bar */}
      {isMeetingActive && currentUserIsParticipant && isAgoraJoined && (
        <footer className="border-t bg-card p-3 flex items-center justify-center gap-2 sm:gap-4 shadow-md flex-shrink-0">
          <Button 
            variant={isMicMuted ? "destructive" : "outline"} 
            size="lg" 
            className="px-3 sm:px-4"
            title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"} 
            onClick={toggleMic}
            disabled={!localAudioTrackRef.current || isPublishing}
          >
            {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            <span className="ml-1.5 hidden sm:inline">{isMicMuted ? "Unmute" : "Mute"}</span>
          </Button>
          <Button 
            variant={isCameraOff ? "destructive" : "outline"} 
            size="lg" 
            className="px-3 sm:px-4"
            title={isCameraOff ? "Start Video" : "Stop Video"}
            onClick={toggleCamera}
            disabled={isPublishing && !localVideoTrackRef.current && !isCameraOff} // Disable if trying to start and track not ready
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            <span className="ml-1.5 hidden sm:inline">{isCameraOff ? "Start Video" : "Stop Video"}</span>
          </Button>
          <Button 
            variant={isScreenSharing ? "default" : "outline"} 
            size="lg" 
            className="px-3 sm:px-4"
            title={isScreenSharing ? "Stop Sharing" : "Share Screen (Placeholder)"}
            onClick={() => {
                setIsScreenSharing(!isScreenSharing);
                toast({title: "Screen Sharing (Placeholder)", description: isScreenSharing ? "Screen sharing stopped." : "Screen sharing started."});
            }}
            disabled // Screen sharing not implemented
          >
            <ScreenShare className="h-5 w-5" />
            <span className="ml-1.5 hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share"}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="px-3 sm:px-4 md:hidden" // Only show on mobile to toggle sidebar
            onClick={() => setShowSidebar(!showSidebar)} 
            title={showSidebar ? "Hide Panel" : "Show Panel"}
          >
            {showSidebar ? <Users className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5"/>}
            <span className="ml-1.5 hidden sm:inline">{showSidebar ? "Panel" : "Panel"}</span>
          </Button>
          
          {isCurrentUserHost ? (
            <Button variant="destructive" size="lg" className="px-3 sm:px-4" title="End Meeting" onClick={handleEndMeeting} disabled={isEndingMeeting}>
              {isEndingMeeting ? <Loader2 className="h-5 w-5 mr-0 sm:mr-1.5 animate-spin"/> : <PhoneOff className="h-5 w-5 mr-0 sm:mr-1.5" />}
              <span className="hidden sm:inline">{isEndingMeeting ? "Ending..." : "End"}</span>
            </Button>
          ) : (
            <Button variant="destructive" size="lg" className="px-3 sm:px-4" title="Leave Video Call" onClick={handleLeaveMeeting}>
              <PhoneOff className="h-5 w-5 mr-0 sm:mr-1.5" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-10 w-10 hidden sm:inline-flex" title="Meeting Settings (Placeholder)" disabled>
            <Settings2 className="h-5 w-5" />
          </Button>
        </footer>
      )}
      
      {/* Small screen chat/participant toggle and drawer - placeholder for future enhancement */}
      {!showSidebar && isMeetingActive && currentUserIsParticipant && (
        <div className="md:hidden fixed bottom-16 right-4 z-50">
             <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full shadow-lg h-12 w-12" 
                onClick={() => setShowSidebar(true)} 
                title="Open Panel"
            >
                <Users className="h-6 w-6" />
            </Button>
        </div>
      )}

    </div>
  );
}
    
