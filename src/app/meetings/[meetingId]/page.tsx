
"use client";

import { useEffect, useState, useTransition, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Users, ScreenShare, Mic, MicOff, VideoOff, Settings2, ArrowLeft, Loader2, UserPlus, Copy, Check, PhoneOff, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMeetingDetails } from '@/services/firestoreService';
import { joinMeeting as joinMeetingAction } from '@/actions/meetingActions';
import type { Meeting, MeetingParticipant } from '@/types/data';
import { formatDistanceToNowStrict } from 'date-fns';
import { getInitials, cn } from '@/lib/utils';
import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack, type ILocalVideoTrack, type IRemoteAudioTrack, type IRemoteVideoTrack, type IAgoraRTCRemoteUser, type UID } from 'agora-rtc-sdk-ng';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "";

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
  const [isCameraOff, setIsCameraOff] = useState(true); // Start with camera off
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUserWithTracks[]>([]);
  const [isAgoraJoined, setIsAgoraJoined] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const localVideoContainerRef = useRef<HTMLDivElement>(null);


  const cleanupAgora = useCallback(async () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    if (agoraClientRef.current && isAgoraJoined) {
      await agoraClientRef.current.leave();
      setIsAgoraJoined(false);
      console.log("Left Agora channel");
    }
    setRemoteUsers([]);
    setIsCameraOff(true);
    setIsMicMuted(false);
  }, [isAgoraJoined]);

  useEffect(() => {
    if (!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID") {
        toast({
            title: "Agora Configuration Missing",
            description: "Please provide a valid Agora App ID in your environment variables to use meeting features.",
            variant: "destructive",
            duration: 10000,
        });
    }

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
    
    // Initialize Agora client
    if (!agoraClientRef.current && AGORA_APP_ID && AGORA_APP_ID !== "YOUR_AGORA_APP_ID") {
        agoraClientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    }
    
    return () => {
      cleanupAgora();
    };
  }, [meetingId, router, toast, cleanupAgora]);


  const joinAgoraChannel = useCallback(async () => {
    if (!agoraClientRef.current || !user || !meetingId || isAgoraJoined || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID") return;
    
    setIsPublishing(true);
    try {
      console.log("Joining Agora channel:", meetingId, "as user:", user.uid);
      // Using UID as number for Agora, ensure your UIDs can be cast to numbers if needed, or use string UIDs if Agora SDK version supports.
      // Current Agora SDK NG generally supports string UIDs.
      await agoraClientRef.current.join(AGORA_APP_ID, meetingId, null, user.uid);
      setIsAgoraJoined(true);
      toast({ title: "Joined video call" });
      console.log("Successfully joined Agora channel");

      // Create and publish local tracks
      [localAudioTrackRef.current, localVideoTrackRef.current] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      if (localVideoTrackRef.current && localVideoContainerRef.current) {
        localVideoTrackRef.current.play(localVideoContainerRef.current);
        setIsCameraOff(false);
      }
      if (localAudioTrackRef.current) {
        setIsMicMuted(false);
      }
      
      await agoraClientRef.current.publish([localAudioTrackRef.current!, localVideoTrackRef.current!]);
      console.log("Published local tracks");

    } catch (error) {
      console.error("Failed to join Agora channel or publish tracks", error);
      toast({ title: "Video Call Error", description: `Could not join or publish: ${(error as Error).message}`, variant: "destructive" });
      await cleanupAgora();
    } finally {
      setIsPublishing(false);
    }
  }, [user, meetingId, isAgoraJoined, cleanupAgora, toast]);

  // Handle Agora events
  useEffect(() => {
    const client = agoraClientRef.current;
    if (!client || !isAgoraJoined) return;

    const handleUserPublished = async (remoteUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log("Remote user published:", remoteUser.uid, mediaType);
      await client.subscribe(remoteUser, mediaType);
      console.log("Subscribed to remote user:", remoteUser.uid, mediaType);
      
      if (mediaType === 'video' && remoteUser.videoTrack) {
          const userToUpdate = meeting?.participants.find(p => p.uid === remoteUser.uid.toString());
          setRemoteUsers(prev => {
              const existing = prev.find(u => u.uid === remoteUser.uid);
              if (existing) {
                  return prev.map(u => u.uid === remoteUser.uid ? {...remoteUser, displayName: userToUpdate?.displayName, photoURL: userToUpdate?.photoURL } : u);
              }
              return [...prev, {...remoteUser, displayName: userToUpdate?.displayName, photoURL: userToUpdate?.photoURL }];
          });
      }
      if (mediaType === 'audio' && remoteUser.audioTrack) {
        remoteUser.audioTrack.play();
      }
    };

    const handleUserUnpublished = (remoteUser: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log("Remote user unpublished:", remoteUser.uid, mediaType);
      if (mediaType === 'video') {
         setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      }
    };
    
    const handleUserLeft = (remoteUser: IAgoraRTCRemoteUser) => {
        console.log("Remote user left:", remoteUser.uid);
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
    };
  }, [isAgoraJoined, meeting?.participants]);


  const handleJoinMeeting = () => {
    if (!user || !userProfile || !meeting) {
      toast({ title: "Error", description: "Cannot join meeting.", variant: "destructive" });
      return;
    }
    startJoiningTransition(async () => {
      const result = await joinMeetingAction(meeting.id, { uid: user.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL });
      if (result.success) {
        toast({ title: "Joined Meeting!", description: result.message });
        const updatedMeeting = await getMeetingDetails(meeting.id);
        if (updatedMeeting) setMeeting(updatedMeeting);
        // Attempt to join Agora channel after successfully joining meeting in Firestore
        if (AGORA_APP_ID && AGORA_APP_ID !== "YOUR_AGORA_APP_ID") {
            joinAgoraChannel();
        }
      } else {
        toast({ title: "Error Joining Meeting", description: result.message, variant: "destructive" });
      }
    });
  };

  const copyMeetingLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setHasCopied(true);
      toast({ title: "Link Copied!"});
      setTimeout(() => setHasCopied(false), 2000);
    }).catch(err => {
      toast({ title: "Failed to copy link", variant: "destructive"});
    });
  };

  const toggleCamera = async () => {
    if (!localVideoTrackRef.current) { // Try to initialize if not already
      if (!isAgoraJoined || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID") {
        toast({ title: "Not in call", description: "Join the call to use your camera.", variant: "destructive"});
        return;
      }
      try {
        setIsPublishing(true);
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        if (localVideoContainerRef.current) {
            localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
        await agoraClientRef.current?.publish([localVideoTrackRef.current]);
        setIsCameraOff(false);
      } catch (error) {
        toast({ title: "Camera Error", description: `Could not start camera: ${(error as Error).message}`, variant: "destructive"});
        return;
      } finally {
        setIsPublishing(false);
      }
    } else {
      await localVideoTrackRef.current.setEnabled(!localVideoTrackRef.current.enabled);
      setIsCameraOff(!localVideoTrackRef.current.enabled);
    }
  };

  const toggleMic = async () => {
    if (!localAudioTrackRef.current) {
         toast({ title: "Not in call", description: "Join the call to use your microphone.", variant: "destructive"});
         return;
    }
    await localAudioTrackRef.current.setEnabled(!localAudioTrackRef.current.enabled);
    setIsMicMuted(!localAudioTrackRef.current.enabled);
  };
  
  const handleLeaveMeeting = async () => {
    await cleanupAgora();
    toast({title: "You left the video call."});
    // Potentially update Firestore status or navigate away
    // For now, just leaves Agora and cleans up tracks
    // router.push('/meetings'); // Optional: navigate away after leaving
  };


  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto py-12 text-center">
        <Video className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold font-headline">Meeting Not Found</h1>
        <p className="text-muted-foreground mb-6">The meeting you are looking for does not exist or may have been removed.</p>
        <Button asChild variant="outline">
          <Link href="/meetings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Meetings</Link>
        </Button>
      </div>
    );
  }
  
  const currentUserIsParticipant = user && meeting.participantUids.includes(user.uid);

  return (
    <div className="container mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8">
      {(!AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID") && (
         <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Agora App ID Missing</AlertTitle>
            <AlertDescription>
              Video call functionality is disabled. Please configure <code className="font-mono bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_AGORA_APP_ID</code> in your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file.
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
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-center w-full sm:w-auto">
               <Button onClick={copyMeetingLink} variant="outline" size="sm" className="w-full sm:w-auto">
                {hasCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                {hasCopied ? 'Copied!' : 'Copy Link'}
              </Button>
              {!currentUserIsParticipant && meeting.isActive && (
                <Button onClick={handleJoinMeeting} disabled={isJoiningMeeting || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID"} size="sm" className="w-full sm:w-auto">
                  {isJoiningMeeting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Join Meeting
                </Button>
              )}
              {currentUserIsParticipant && meeting.isActive && !isAgoraJoined && (
                <Button onClick={joinAgoraChannel} disabled={isPublishing || !AGORA_APP_ID || AGORA_APP_ID === "YOUR_AGORA_APP_ID"} size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                    Join Video Call
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-9 space-y-4">
              {/* Local Video */}
              {currentUserIsParticipant && isAgoraJoined && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Your Camera</h3>
                  <div ref={localVideoContainerRef} className="aspect-video bg-black rounded-lg shadow-md relative">
                    {isCameraOff && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md">
                            <VideoOff className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground text-sm">Camera is off</p>
                        </div>
                    )}
                    <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                      {userProfile?.displayName || "You"}
                    </p>
                  </div>
                </div>
              )}

              {/* Remote Users' Videos */}
              {remoteUsers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Participants</h3>
                  <div className={cn(
                    "grid gap-2",
                    remoteUsers.length === 1 ? "grid-cols-1" :
                    remoteUsers.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                    remoteUsers.length === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
                    "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3" // Max 3 per row for larger participant counts
                  )}>
                    {remoteUsers.map(remoteU => (
                      <div key={remoteU.uid} id={`remote-user-${remoteU.uid}`} className="aspect-video bg-muted/70 rounded-lg flex flex-col items-center justify-center border border-muted-foreground/20 shadow-inner relative overflow-hidden">
                         {!remoteU.hasVideo && (
                            <>
                            <Avatar className="h-16 w-16 mb-2">
                                <AvatarImage src={remoteU.photoURL || undefined} alt={remoteU.displayName || 'User'} data-ai-hint="remote participant avatar"/>
                                <AvatarFallback>{getInitials(remoteU.displayName)}</AvatarFallback>
                            </Avatar>
                            <VideoOff className="h-8 w-8 text-muted-foreground opacity-50" />
                            </>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground text-center px-2 truncate w-full absolute bottom-2 bg-black/30 text-white py-1">
                          {remoteU.displayName || `User ${remoteU.uid}`}
                        </p>
                        {/* Agora SDK will attach video stream here if hasVideo is true */}
                        <script dangerouslySetInnerHTML={{ __html: `
                          const videoTrack_${remoteU.uid} = agoraClientRef.current?.remoteUsers.find(u => u.uid === '${remoteU.uid}')?.videoTrack;
                          if (videoTrack_${remoteU.uid} && document.getElementById('remote-user-${remoteU.uid}')) {
                            videoTrack_${remoteU.uid}.play(document.getElementById('remote-user-${remoteU.uid}'));
                          }
                        `}} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
               {isAgoraJoined && remoteUsers.length === 0 && (
                  <div className="h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Users className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground text-base sm:text-lg text-center">Waiting for others to join the video call...</p>
                  </div>
              )}
              {!isAgoraJoined && currentUserIsParticipant && (
                 <div className="h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Video className="h-16 w-16 sm:h-24 sm:w-24 text-primary opacity-80" />
                    <p className="mt-4 text-primary/90 text-base sm:text-lg text-center">Click "Join Video Call" above to start/join the call.</p>
                  </div>
              )}
              {!currentUserIsParticipant && (
                 <div className="h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Video className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground text-base sm:text-lg text-center">Join the meeting to participate in the video call.</p>
                  </div>
              )}
            </div>

            {/* Sidebar for participants list and chat */}
            <div className="md:col-span-3 space-y-4">
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="flex items-center text-base"><Users className="mr-2 h-4 w-4 text-primary"/> Participants ({meeting.participants.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-60 overflow-y-auto">
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

              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-base">Meeting Chat</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="h-32 border rounded-md p-2 bg-muted/50 flex items-center justify-center">
                    <p className="text-muted-foreground italic text-xs">Chat (placeholder).</p>
                  </div>
                   <Input type="text" placeholder="Send a message..." className="mt-2 text-xs" disabled />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>

        {/* Call Controls Footer */}
        {meeting.isActive && currentUserIsParticipant && isAgoraJoined && (
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
                disabled={isPublishing} // Can attempt to publish if no track yet
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
                disabled // Screen sharing is a complex feature not implemented
            >
                <ScreenShare className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button variant="destructive" size="lg" className="h-10 px-4 sm:h-12 sm:px-6" title="Leave Video Call" onClick={handleLeaveMeeting}>
                <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">Leave Call</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12" title="Meeting Settings (Placeholder)" disabled>
              <Settings2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </CardFooter>
        )}
        {!meeting.isActive && (
            <CardFooter className="border-t p-3 sm:p-4">
                 <p className="text-xs text-muted-foreground text-center w-full">This meeting has ended or is not currently active.</p>
            </CardFooter>
        )}
      </Card>
       <Button variant="outline" size="sm" onClick={() => router.push('/meetings')} className="sm:hidden w-full mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> All Meetings
        </Button>
        {/* Script tag for playing remote video tracks dynamically */}
        {remoteUsers.map(remoteU => (
          remoteU.hasVideo && remoteU.videoTrack && (
            <script key={`script-${remoteU.uid}`} dangerouslySetInnerHTML={{ __html: `
              (()=>{
                const videoContainer = document.getElementById('remote-user-${remoteU.uid}');
                if (videoContainer && !videoContainer.querySelector('video')) { // Check if video element already exists
                  const agoraClient = window.agoraClientInstance; // Assuming you expose the client globally for this hack
                  if (agoraClient) {
                    const user = agoraClient.remoteUsers.find(u => u.uid === '${remoteU.uid}');
                    if (user && user.videoTrack && user.hasVideo) {
                        console.log('Playing remote video for ${remoteU.uid} in container:', videoContainer);
                        user.videoTrack.play(videoContainer);
                    }
                  }
                }
              })();
            `}} />
          )
        ))}
        <script dangerouslySetInnerHTML={{__html: `
            window.agoraClientInstance = agoraClientRef.current; // Expose client for inline scripts (hacky for prototype)
        `}}/>
    </div>
  );
}
    
// Helper to ensure the video track is played in its container
// This is tricky with React's rendering. A more robust solution might involve
// creating video elements dynamically and managing them in state.
// For now, this tries to ensure video plays if the element exists.
// This is a workaround and might need refinement for a production app.
if (typeof window !== 'undefined') {
  // This is a placeholder for a more robust dynamic video element creation strategy
  // if the direct `remoteUser.videoTrack.play(containerElement)` inside React render flow has issues.
  // We are attempting to play directly in the JSX for now, but a mutation observer or other
  // techniques might be needed if that fails due to timing.
}

