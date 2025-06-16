
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCallDetails,
  sendOffer,
  sendAnswer,
  addIceCandidateWithClientTimestamp as addIceCandidate, // Using client timestamp version
  onCallSessionUpdate,
  onIceCandidate,
  cleanupCallData,
} from '@/services/signalingService';
import { updateCallStatus } from '@/actions/videoCallActions';
import type { VideoCallSession } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';

interface VideoCallUIProps {
  callId: string;
  currentUserId: string;
}

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // In production, add TURN servers here for reliability
  ],
};

export function VideoCallUI({ callId, currentUserId }: VideoCallUIProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [callSession, setCallSession] = useState<VideoCallSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [callStatus, setCallStatus] = useState<VideoCallSession['status'] | 'connecting_media' | 'initializing_rtc' | 'waiting_for_peer' >('initializing_rtc');
  
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const otherUserId = callSession?.callerId === currentUserId ? callSession.calleeId : callSession?.callerId;
  const otherUserName = callSession?.callerId === currentUserId ? callSession.calleeName : callSession?.callerName;


  const initializeMedia = useCallback(async () => {
    setCallStatus('connecting_media');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      toast({ variant: 'destructive', title: 'Media Access Denied', description: 'Please enable camera and microphone permissions.' });
      setHasCameraPermission(false);
      setCallStatus('error');
      updateCallStatus(callId, 'error');
      throw error;
    }
  }, [callId, toast]);

  const initializePeerConnection = useCallback((stream: MediaStream) => {
    setCallStatus('initializing_rtc');
    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = (event) => {
      if (event.candidate && otherUserId) {
        addIceCandidate(callId, currentUserId, otherUserId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('connected');
        updateCallStatus(callId, 'connected');
      }
    };

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    peerConnectionRef.current = pc;
    return pc;
  }, [callId, currentUserId, otherUserId]);


  // Effect for fetching initial call details and setting up signaling listeners
  useEffect(() => {
    if (!callId || !currentUserId) return;
    setIsLoading(true);

    getCallDetails(callId).then(session => {
      if (session) {
        setCallSession(session);
        setCallStatus(session.status === 'pending' && session.callerId !== currentUserId ? 'waiting_for_peer' : session.status);
      } else {
        toast({ variant: 'destructive', title: 'Call Not Found', description: 'The call session does not exist or has ended.' });
        setCallStatus('error');
      }
      setIsLoading(false);
    }).catch(err => {
        console.error("Error fetching call details: ", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load call details.' });
        setIsLoading(false);
        setCallStatus('error');
    });
    
    const unsubscribeCallUpdates = onCallSessionUpdate(callId, (updatedSession) => {
      if (updatedSession) {
        setCallSession(updatedSession); // Keep local state in sync
        // Handle incoming offer if I'm the callee
        if (updatedSession.offer && updatedSession.calleeId === currentUserId && peerConnectionRef.current && peerConnectionRef.current.signalingState === 'stable') {
          if(localStreamRef.current && peerConnectionRef.current) {
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(updatedSession.offer))
              .then(() => peerConnectionRef.current!.createAnswer())
              .then(answer => peerConnectionRef.current!.setLocalDescription(answer))
              .then(() => {
                if (peerConnectionRef.current?.localDescription) {
                  sendAnswer(callId, peerConnectionRef.current.localDescription.toJSON(), currentUserId);
                  updateCallStatus(callId, 'answered');
                  setCallStatus('answered');
                }
              })
              .catch(e => { console.error("Error handling offer/answer for callee: ", e); setCallStatus('error');});
          } else {
            // Media not ready yet, this scenario needs robust handling (e.g., queueing the offer)
            console.warn("Received offer but local media/PC not ready for callee");
          }
        }
        // Handle incoming answer if I'm the caller
        else if (updatedSession.answer && updatedSession.callerId === currentUserId && peerConnectionRef.current && peerConnectionRef.current.signalingState === 'have-local-offer') {
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(updatedSession.answer))
            .catch(e => { console.error("Error setting remote description for caller: ", e); setCallStatus('error');});
        }
        
        if (updatedSession.status === 'ended' || updatedSession.status === 'declined' || updatedSession.status === 'cancelled') {
            setCallStatus(updatedSession.status);
            hangUp(false); // Don't send another update if already ended/declined
        }
      }
    });

    let unsubscribeIce: (() => void) | null = null;
    if (otherUserId) { // Only subscribe if otherUserId is known
        unsubscribeIce = onIceCandidate(callId, currentUserId, (candidate) => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
              .catch(e => console.error("Error adding received ICE candidate: ", e));
          }
        });
    }


    return () => {
      unsubscribeCallUpdates();
      if (unsubscribeIce) unsubscribeIce();
    };
  }, [callId, currentUserId, otherUserId, toast]); // otherUserId dependency added

  // Effect for initiating the call if current user is the caller
  useEffect(() => {
    if (callSession && callSession.callerId === currentUserId && callSession.status === 'pending' && peerConnectionRef.current && peerConnectionRef.current.signalingState === 'stable') {
      setCallStatus('offered');
      updateCallStatus(callId, 'offered');
      peerConnectionRef.current.createOffer()
        .then(offer => peerConnectionRef.current!.setLocalDescription(offer))
        .then(() => {
          if (peerConnectionRef.current?.localDescription) {
            sendOffer(callId, peerConnectionRef.current.localDescription.toJSON(), currentUserId);
          }
        })
        .catch(e => { console.error("Error creating/sending offer: ", e); setCallStatus('error');});
    }
  }, [callSession, currentUserId, callId]);


  // Main setup effect: Get media, then initialize PC
  useEffect(() => {
    initializeMedia()
      .then(stream => {
        if (stream) {
          initializePeerConnection(stream);
        }
      })
      .catch(() => {
        // Error already handled in initializeMedia
      });
    
    return () => {
        hangUp(true); // Attempt to notify other user on unmount/cleanup
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeMedia, initializePeerConnection]); // callId dependency removed as it causes re-runs, handled by parent context


  const hangUp = async (notifyServer = true) => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnectionRef.current?.close();
    localStreamRef.current = null;
    peerConnectionRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallStatus('ended');
    if (notifyServer && callId && callSession?.status !== 'ended' && callSession?.status !== 'declined' && callSession?.status !== 'cancelled') {
        await updateCallStatus(callId, currentUserId === callSession?.callerId && callSession?.status === 'pending' ? 'cancelled' : 'ended');
    }
    if (callId) {
        await cleanupCallData(callId); // Clean up Firestore data
    }
    // Optionally redirect or show "call ended" message
    // router.push('/profile'); // Example redirect
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsAudioMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoMuted(prev => !prev);
    }
  };

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="mt-4">Loading call...</p></div>;
  }
  
  if (hasCameraPermission === false) {
     return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Camera & Microphone Required</h2>
        <p className="text-muted-foreground mb-4">This application requires access to your camera and microphone to function. Please grant permission in your browser settings.</p>
        <Button onClick={() => window.location.reload()}>Retry Permissions</Button>
      </div>
    );
  }

  if (callStatus === 'error' || !callSession) {
    return <div className="flex flex-col items-center justify-center h-screen text-destructive"><AlertTriangle className="h-16 w-16 mb-2" />Call Error or Not Found. Please try again.</div>;
  }

  if (callStatus === 'ended' || callStatus === 'declined' || callStatus === 'cancelled') {
    return <div className="flex flex-col items-center justify-center h-screen"><PhoneOff className="h-16 w-16 text-muted-foreground mb-2" />Call Ended.</div>;
  }


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* Remote Video - Takes up most of the space */}
      <div className="flex-grow relative bg-black flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        {(callStatus === 'connecting_media' || callStatus === 'initializing_rtc' || callStatus === 'pending' || callStatus === 'offered' || callStatus === 'answered' || callStatus === 'waiting_for_peer') && !remoteVideoRef.current?.srcObject && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">
              {callStatus === 'waiting_for_peer' ? `Waiting for ${otherUserName || 'peer'} to join...` :
               callStatus === 'pending' && callSession.callerId === currentUserId ? `Calling ${otherUserName || 'peer'}...` :
               callStatus === 'offered' && callSession.callerId === currentUserId ? `Calling ${otherUserName || 'peer'}...` :
               callStatus === 'answered' && callSession.calleeId === currentUserId ? `Connecting to ${otherUserName || 'peer'}...`:
               `Connecting call with ${otherUserName || 'peer'}... (${callStatus})`}
            </p>
             {callSession.callerId === currentUserId && (callStatus === 'pending' || callStatus === 'offered') && (
                <Button variant="destructive" onClick={() => hangUp(true)} className="mt-6">Cancel Call</Button>
            )}
            {callSession.calleeId === currentUserId && callStatus === 'waiting_for_peer' && (
                 <div className="mt-6 space-x-4">
                    {/* Answer button is implicit for callee, this is just visual status */}
                 </div>
            )}
          </div>
        )}
        {callStatus === 'connected' && !remoteVideoRef.current?.srcObject && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg">Waiting for remote video...</p>
            </div>
        )}
         <div className="absolute top-4 left-4 bg-black/50 p-2 rounded-md">
            <p className="text-sm">Connected to: {otherUserName || 'Peer'}</p>
        </div>
      </div>

      {/* Local Video - Smaller, in a corner */}
      <video 
        ref={localVideoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute bottom-20 md:bottom-24 right-4 w-32 h-24 md:w-48 md:h-36 object-cover rounded-md border-2 border-gray-700 shadow-lg"
        style={{ display: isVideoMuted || !hasCameraPermission ? 'none' : 'block' }}
      />
      {isVideoMuted && hasCameraPermission && (
        <div className="absolute bottom-20 md:bottom-24 right-4 w-32 h-24 md:w-48 md:h-36 bg-gray-800 flex items-center justify-center rounded-md border-2 border-gray-700 shadow-lg">
            <VideoOff className="h-8 w-8 text-gray-400"/>
        </div>
      )}


      {/* Controls */}
      <div className="bg-gray-800/80 backdrop-blur-sm p-3 md:p-4 flex justify-center items-center space-x-3 md:space-x-4 absolute bottom-0 left-0 right-0">
        <Button onClick={toggleAudio} variant="outline" size="icon" className={`rounded-full h-12 w-12 md:h-14 md:w-14 ${isAudioMuted ? 'bg-destructive hover:bg-destructive/90' : 'bg-gray-700 hover:bg-gray-600'} text-white`}>
          {isAudioMuted ? <MicOff /> : <Mic />}
        </Button>
        <Button onClick={toggleVideo} variant="outline" size="icon" className={`rounded-full h-12 w-12 md:h-14 md:w-14 ${isVideoMuted ? 'bg-destructive hover:bg-destructive/90' : 'bg-gray-700 hover:bg-gray-600'} text-white`}>
          {isVideoMuted ? <VideoOff /> : <Video />}
        </Button>
        <Button onClick={() => hangUp(true)} variant="destructive" size="icon" className="rounded-full h-14 w-14 md:h-16 md:w-16">
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}
