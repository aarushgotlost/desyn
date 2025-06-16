
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, VideoOff, PhoneOff, Loader2, AlertTriangle, Video as VideoIcon, UserX, Maximize, Minimize, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateCallStatus as updateAppCallStatus } from '@/actions/videoCallActions';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { VideoCallSession } from '@/types/data';

interface VideoCallUIProps {
  appCallId: string;
  targetUserName?: string;
  targetUserAvatar?: string | null;
  initialCallStatus: VideoCallSession['status'];
  isCaller: boolean; // Though less critical for UI now, might be useful for other logic
}

export function VideoCallUIWrapper(props: VideoCallUIProps) {
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const mediaCheckedRef = useRef(false);
  const { toast } = useToast();

  const checkMediaPermissions = useCallback(async () => {
    if (mediaCheckedRef.current) return;
    mediaCheckedRef.current = true;
    setIsLoadingPermissions(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasMediaPermission(true);
    } catch (error) {
      console.error("Error getting media permissions:", error);
      toast({ variant: "destructive", title: "Permissions Denied", description: "Camera and microphone access are required for video calls." });
      setHasMediaPermission(false);
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [toast]);

  useEffect(() => {
    checkMediaPermissions();
  }, [checkMediaPermissions]);

  if (isLoadingPermissions || hasMediaPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Checking permissions...</p>
      </div>
    );
  }

  if (hasMediaPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center bg-gray-900 text-white">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Media Access Required</h2>
        <p className="text-muted-foreground mb-4">Please grant camera and microphone permissions in your browser settings and refresh the page.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="text-white border-white hover:bg-white/10">Refresh Page</Button>
      </div>
    );
  }

  return <VideoCallRoom {...props} />;
}


function VideoCallRoom({ appCallId, targetUserName, targetUserAvatar, initialCallStatus, isCaller }: VideoCallUIProps) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentCallStatus, setCurrentCallStatus] = useState(initialCallStatus);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);


  useEffect(() => {
    const startLocalVideo = async () => {
      if (localStreamRef.current || currentCallStatus === 'ended' || currentCallStatus === 'cancelled' || currentCallStatus === 'declined' || currentCallStatus === 'error') {
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // If the call was pending, and we are now connecting media, update status to connected.
        // This applies to both caller (first one in) and callee.
        if (currentCallStatus === 'pending') {
          await updateAppCallStatus(appCallId, 'connected');
          setCurrentCallStatus('connected');
        }
      } catch (error) {
        console.error('Error starting local video:', error);
        toast({ variant: 'destructive', title: 'Media Error', description: 'Could not start camera or microphone. Please check permissions.' });
        // Optionally end call if media fails criticaly
        // handleEndCall('error'); 
      }
    };

    startLocalVideo();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      // Update status to ended only if the call was active and not already terminated by another action
      if (appCallId && (currentCallStatus === 'connected' || currentCallStatus === 'pending')) {
         // Check currentCallStatus again to avoid race condition if it changed
         // For simplicity, this check might be removed if relying on the component unmounting to signify "ended"
         if (localStreamRef.current) { // Check if we were actually in a call
            updateAppCallStatus(appCallId, 'ended').catch(err => console.error("Error updating call status on unmount:", err));
         }
      }
    };
  }, [appCallId, toast, currentCallStatus]); // Removed isCaller from dependencies

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const handleEndCall = async (statusToSet: VideoCallSession['status'] = 'ended') => {
    setIsEndingCall(true);
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    try {
      await updateAppCallStatus(appCallId, statusToSet);
      toast({ title: statusToSet === 'cancelled' ? 'Call Cancelled' : (statusToSet === 'declined' ? 'Call Declined' : 'Call Ended') });
    } catch (error) {
      console.error('Error updating call status:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update call status.' });
    } finally {
      setIsEndingCall(false);
      setCurrentCallStatus(statusToSet); // Update local status to reflect change
      router.push('/messages');
    }
  };

  const toggleFullScreen = () => {
    const videoContainer = document.getElementById('video-call-container');
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };
  
  // If call status indicates it has ended or was problematic before UI fully loads.
  if (currentCallStatus === 'ended' || currentCallStatus === 'cancelled' || currentCallStatus === 'declined' || currentCallStatus === 'error') {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
        <PhoneOff size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {currentCallStatus === 'cancelled' ? 'Call Cancelled' : 
           currentCallStatus === 'declined' ? 'Call Declined' :
           currentCallStatus === 'error' ? 'Call Error' : 'Call Ended'}
        </h2>
        <p className="text-muted-foreground mb-6">
            {currentCallStatus === 'error' ? 'There was an issue with the call.' : 'This video call session has finished.'}
        </p>
        <Button onClick={() => router.push('/messages')} variant="outline" className="text-white border-white hover:bg-white/10">
          Back to Messages
        </Button>
      </div>
    );
  }


  return (
    <div id="video-call-container" className="flex flex-col h-screen bg-gray-900 text-white relative overflow-hidden">
      {!isFullScreen && (
         <div className="absolute top-0 left-0 right-0 z-20 p-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white bg-black/30 hover:bg-black/50">
                <ArrowLeft size={24} />
            </Button>
        </div>
      )}

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-1 p-1 relative">
        <div className={`relative aspect-video bg-black rounded-md overflow-hidden shadow-lg border-2 ${!isVideoEnabled ? 'border-gray-700' : 'border-primary'} group`}>
          <video ref={localVideoRef} autoPlay playsInline muted className={`object-cover w-full h-full ${!isVideoEnabled ? 'hidden' : ''}`} />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
              <Avatar className="w-16 h-16 md:w-24 md:h-24 mb-2 text-2xl md:text-3xl border-2 border-gray-700">
                <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.displayName || "You"}/>
                <AvatarFallback>{getInitials(userProfile?.displayName)}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-gray-400">Video Off</p>
            </div>
          )}
          <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {userProfile?.displayName || user?.email || 'You'} {!isAudioEnabled && "(Muted)"}
          </div>
        </div>

        <div className="relative aspect-video bg-gray-800 rounded-md overflow-hidden shadow-lg flex items-center justify-center border-2 border-gray-700">
          <div className="text-center text-gray-400 p-4">
             {targetUserAvatar ? (
                 <Avatar className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-2 text-2xl md:text-3xl border-2 border-gray-700">
                    <AvatarImage src={targetUserAvatar} alt={targetUserName || "Remote User"}/>
                    <AvatarFallback>{getInitials(targetUserName)}</AvatarFallback>
                </Avatar>
             ) : (
                <UserX size={48} className="mx-auto mb-2 opacity-50 md:size-64" />
             )}
            <p className="font-semibold text-sm md:text-base">{targetUserName || 'Remote User'}</p>
            <p className="text-xs md:text-sm">
              {currentCallStatus === 'pending' ? '(Connecting...)' : '(Waiting for user...)'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/80 backdrop-blur-md p-2 md:p-3 flex justify-center items-center space-x-2 md:space-x-4 absolute bottom-0 left-0 right-0 z-10">
        <Button 
          onClick={toggleAudio} 
          variant="outline" 
          size="icon" 
          className={`rounded-full h-10 w-10 md:h-14 md:w-14 ${!isAudioEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white border-gray-600 hover:border-gray-500 shadow-md`}
          aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>
        <Button 
          onClick={toggleVideo} 
          variant="outline" 
          size="icon" 
          className={`rounded-full h-10 w-10 md:h-14 md:w-14 ${!isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white border-gray-600 hover:border-gray-500 shadow-md`}
          aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoEnabled ? <VideoIcon size={20} /> : <VideoOff size={20} />}
        </Button>
        <Button 
          onClick={() => handleEndCall('ended')} 
          variant="destructive" 
          size="icon" 
          className="rounded-full h-12 w-12 md:h-16 md:w-16 shadow-lg" 
          disabled={isEndingCall}
          aria-label="End call"
        >
          {isEndingCall ? <Loader2 className="animate-spin h-6 w-6" /> : <PhoneOff size={24} />}
        </Button>
         <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleFullScreen} 
            className="rounded-full h-10 w-10 md:h-14 md:w-14 bg-gray-700 hover:bg-gray-600 text-white border-gray-600 hover:border-gray-500 shadow-md hidden md:flex"
            aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
           >
            {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </Button>
      </div>
    </div>
  );
}
