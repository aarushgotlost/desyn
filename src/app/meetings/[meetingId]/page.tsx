
"use client";

import { useEffect, useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Users, ScreenShare, Mic, MicOff, VideoOff, Settings2, ArrowLeft, Loader2, UserPlus, Copy, Check, PhoneOff, Maximize, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMeetingDetails } from '@/services/firestoreService';
import { joinMeeting } from '@/actions/meetingActions';
import type { Meeting, MeetingParticipant } from '@/types/data';
import { formatDistanceToNowStrict } from 'date-fns';
import { getInitials, cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const ParticipantVideoPlaceholder = ({ participant, isLocal = false }: { participant?: MeetingParticipant; isLocal?: boolean }) => {
  return (
    <div className={cn(
      "bg-muted/70 rounded-lg flex flex-col items-center justify-center aspect-video border border-muted-foreground/20 shadow-inner relative overflow-hidden",
      isLocal && "border-2 border-primary" // This style might be less relevant if local video is live
    )}>
      <Video className="h-12 w-12 text-muted-foreground opacity-30" />
      <p className="mt-2 text-xs text-muted-foreground text-center px-2 truncate w-full absolute bottom-2 bg-black/30 text-white py-1">
        {participant ? participant.displayName : (isLocal ? "Your Video (Preview)" : "Participant Video")}
      </p>
    </div>
  );
};


export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;

  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, startJoiningTransition] = useTransition();
  const [hasCopied, setHasCopied] = useState(false);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false); // This will be controlled by the stream now
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);


  useEffect(() => {
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
  }, [meetingId, router, toast]);

  useEffect(() => {
    const currentUserIsParticipant = user && meeting && meeting.participantUids.includes(user.uid);

    const getCameraStream = async () => {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setCameraError(null);
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(mediaStream);
          setHasCameraPermission(true);
          setIsCameraOff(false); // Camera is on by default when stream is acquired
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = mediaStream;
          }
        } catch (error: any) {
          console.warn('Camera/Mic access denied or unavailable:', error);
          setHasCameraPermission(false);
          setIsCameraOff(true);
          if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            setCameraError("Camera access was denied. Please enable it in your browser settings.");
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use video.',
            });
          } else {
            setCameraError(`Error accessing camera: ${error.message}`);
             toast({
              variant: 'destructive',
              title: 'Camera Error',
              description: `Could not access camera: ${error.message}`,
            });
          }
        }
      } else {
        setHasCameraPermission(false);
        setIsCameraOff(true);
        setCameraError("Your browser does not support camera access (getUserMedia API).");
      }
    };

    if (currentUserIsParticipant && meeting?.isActive && hasCameraPermission === null) { // Only request if status unknown
      getCameraStream();
    }

    // Cleanup function to stop the stream when component unmounts or dependencies change
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        setStream(null);
      }
    };
  }, [user, meeting, hasCameraPermission]); // Re-run if user, meeting, or permission status intent changes


  const handleJoinMeeting = () => {
    if (!user || !userProfile || !meeting) {
      toast({ title: "Error", description: "Cannot join meeting.", variant: "destructive" });
      return;
    }
    startJoiningTransition(async () => {
      const result = await joinMeeting(meeting.id, { uid: user.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL });
      if (result.success) {
        toast({ title: "Joined Meeting!", description: result.message });
        const updatedMeeting = await getMeetingDetails(meeting.id);
        if (updatedMeeting) setMeeting(updatedMeeting);
        setHasCameraPermission(null); // Re-trigger camera check on join
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

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsCameraOff(!track.enabled);
      });
    } else if (!isCameraOff && hasCameraPermission !== false) { // Try to get stream if camera is "on" but no stream
        setHasCameraPermission(null); // This will re-trigger the useEffect to get stream
    }
  };

  const toggleMic = () => {
    if (stream) {
        stream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsMicMuted(!track.enabled);
        });
    }
  };
  
  const handleLeaveMeeting = () => {
    // In a real app, this would also involve signaling to other participants and server-side cleanup
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraOff(true); 
    // router.push('/meetings'); // Or update state to show a "left meeting" screen
    toast({title: "You left the meeting."});
    // For now, we'll just simulate leaving by stopping camera and disabling controls
    // A more robust solution would update participant status in Firestore.
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
  const remoteParticipants = meeting.participants.filter(p => p.uid !== user?.uid);

  return (
    <div className="container mx-auto py-6 sm:py-8 space-y-6 sm:space-y-8">
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
                <Button onClick={handleJoinMeeting} disabled={isJoining} size="sm" className="w-full sm:w-auto">
                  {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Join Meeting
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-9 space-y-4">
              {currentUserIsParticipant && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Your Camera</h3>
                  <div className="aspect-video bg-black rounded-lg shadow-md relative">
                    <video ref={localVideoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
                    {(hasCameraPermission === false || isCameraOff) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md">
                            <VideoOff className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground text-sm">
                                {cameraError ? "Camera Error" : (hasCameraPermission === false ? "Camera permission denied" : "Camera is off")}
                            </p>
                            {cameraError && <p className="text-xs text-destructive px-2 text-center max-w-xs">{cameraError}</p>}
                        </div>
                    )}
                    {hasCameraPermission === null && !cameraError && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md">
                            <Loader2 className="h-12 w-12 text-primary animate-spin mb-2" />
                            <p className="text-muted-foreground text-sm">Accessing camera...</p>
                        </div>
                    )}
                    <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                      {userProfile?.displayName || "You"}
                    </p>
                  </div>
                </div>
              )}

              {remoteParticipants.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Participants</h3>
                  <div className={cn(
                    "grid gap-2",
                    remoteParticipants.length === 1 ? "grid-cols-1" :
                    remoteParticipants.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                    remoteParticipants.length === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
                    "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
                  )}>
                    {remoteParticipants.slice(0,6).map(p => (
                      <ParticipantVideoPlaceholder key={p.uid} participant={p} />
                    ))}
                  </div>
                   {remoteParticipants.length > 6 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">+{remoteParticipants.length - 6} more participants not shown in grid</p>
                  )}
                </div>
              )}
              {remoteParticipants.length === 0 && currentUserIsParticipant && (
                  <div className="h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Users className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground text-base sm:text-lg text-center">Waiting for others to join...</p>
                  </div>
              )}
              {!currentUserIsParticipant && (
                 <div className="h-64 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner p-4">
                    <Video className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-muted-foreground text-base sm:text-lg text-center">Join the meeting to see participants.</p>
                  </div>
              )}
            </div>

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

        {meeting.isActive && currentUserIsParticipant && (
          <CardFooter className="border-t p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
             <Button 
                variant={isMicMuted ? "destructive" : "outline"} 
                size="icon" 
                className="h-10 w-10 sm:h-12 sm:w-12" 
                title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"} 
                onClick={toggleMic}
                disabled={!stream}
             >
                {isMicMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
             </Button>
             <Button 
                variant={isCameraOff ? "destructive" : "outline"} 
                size="icon" 
                className="h-10 w-10 sm:h-12 sm:w-12" 
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                onClick={toggleCamera}
                disabled={hasCameraPermission === false}
             >
                {isCameraOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
             </Button>
             <Button 
                variant={isScreenSharing ? "default" : "outline"} 
                size="icon" 
                className="h-10 w-10 sm:h-12 sm:w-12" 
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
                onClick={() => {
                    setIsScreenSharing(!isScreenSharing);
                    toast({title: "Screen Sharing (Placeholder)", description: isScreenSharing ? "Screen sharing stopped." : "Screen sharing started."});
                }}
                disabled // Screen sharing is a complex feature not implemented
            >
                <ScreenShare className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button variant="destructive" size="lg" className="h-10 px-4 sm:h-12 sm:px-6" title="Leave Meeting" onClick={handleLeaveMeeting}>
                <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 mr-0 sm:mr-2" />
                <span className="hidden sm:inline">Leave</span>
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
    </div>
  );
}


    