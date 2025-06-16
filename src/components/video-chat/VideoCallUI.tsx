
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, VideoOff, PhoneOff, Loader2, AlertTriangle, Video as VideoIcon, Maximize, Minimize, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateCallStatus as updateAppCallStatus } from '@/actions/videoCallActions';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface VideoCallUIProps {
  appCallId: string;
  targetUserName?: string; // Name of the person being called
  targetUserAvatar?: string | null; // Avatar of the person being called
}

export function VideoCallUIWrapper(props: VideoCallUIProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const mediaCheckedRef = useRef(false);
  const { toast } = useToast();

  const checkMediaPermissions = useCallback(async () => {
    if (mediaCheckedRef.current) return;
    mediaCheckedRef.current = true;
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasMediaPermission(true);
    } catch (error) {
      console.error("Error getting media permissions:", error);
      toast({ variant: "destructive", title: "Permissions Denied", description: "Camera and microphone access are required for video calls." });
      setHasMediaPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    checkMediaPermissions();
  }, [checkMediaPermissions]);

  if (isLoading || hasMediaPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Checking permissions...</p>
      </div>
    );
  }

  if (hasMediaPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center bg-background text-foreground">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Media Access Required</h2>
        <p className="text-muted-foreground mb-4">Please grant camera and microphone permissions in your browser settings and refresh the page.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return <VideoCallRoom {...props} />;
}


function VideoCallRoom({ appCallId, targetUserName, targetUserAvatar }: VideoCallUIProps) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const startLocalVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Simulate connecting to our app's call session record
        await updateAppCallStatus(appCallId, 'connected');
      } catch (error) {
        console.error('Error starting local video:', error);
        toast({ variant: 'destructive', title: 'Media Error', description: 'Could not start camera or microphone.' });
      }
    };

    startLocalVideo();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      if (appCallId) { // Ensure appCallId is present before trying to update status
        updateAppCallStatus(appCallId, 'ended').catch(err => console.error("Error updating call status on unmount:", err));
      }
    };
  }, [appCallId, toast]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleLeaveCall = async () => {
    setIsLoading(true);
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    try {
      await updateAppCallStatus(appCallId, 'ended');
      toast({ title: 'Call Ended' });
    } catch (error) {
      console.error('Error updating call status on leave:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update call status.' });
    } finally {
      setIsLoading(false);
      router.push('/messages');
    }
  };
  
  const toggleFullScreen = () => {
    const videoElement = localVideoRef.current;
    if (!videoElement) return;

    if (!document.fullscreenElement) {
      videoElement.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white relative overflow-hidden">
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
        {/* Local Video */}
        <div className="relative aspect-video bg-black rounded-md overflow-hidden shadow-lg border-2 border-primary group">
          <video ref={localVideoRef} autoPlay playsInline muted className="object-cover w-full h-full" />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {userProfile?.displayName || user?.email || 'You'}
          </div>
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullScreen} 
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/30 hover:bg-black/50"
            aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
           >
            {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </Button>
        </div>

        {/* Remote Video Placeholder */}
        <div className="relative aspect-video bg-gray-800 rounded-md overflow-hidden shadow-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
             {targetUserAvatar ? (
                 <Avatar className="w-24 h-24 mx-auto mb-2 text-3xl border-2 border-gray-700">
                    <AvatarImage src={targetUserAvatar} alt={targetUserName || "Remote User"}/>
                    <AvatarFallback>{getInitials(targetUserName)}</AvatarFallback>
                </Avatar>
             ) : (
                <User size={64} className="mx-auto mb-2 opacity-50" />
             )}
            <p className="font-semibold">{targetUserName || 'Remote User'}</p>
            <p className="text-xs">(Waiting for connection...)</p>
            {/* In a real WebRTC app, this would display the remote stream */}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800/90 backdrop-blur-sm p-3 md:p-4 flex justify-center items-center space-x-3 md:space-x-4 absolute bottom-0 left-0 right-0">
        <Button onClick={toggleAudio} variant="outline" size="icon" className={`rounded-full h-12 w-12 md:h-14 md:w-14 ${!isAudioEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'} text-white border-gray-600 hover:border-gray-500`}>
          {!isAudioEnabled ? <MicOff /> : <Mic />}
        </Button>
        <Button onClick={toggleVideo} variant="outline" size="icon" className={`rounded-full h-12 w-12 md:h-14 md:w-14 ${!isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'} text-white border-gray-600 hover:border-gray-500`}>
          {!isVideoEnabled ? <VideoOff /> : <VideoIcon />}
        </Button>
        <Button onClick={handleLeaveCall} variant="destructive" size="icon" className="rounded-full h-14 w-14 md:h-16 md:w-16" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <PhoneOff />}
        </Button>
      </div>
    </div>
  );
}
