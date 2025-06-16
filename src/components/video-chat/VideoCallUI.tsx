
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  selectRoomState,
  HMSRoomState,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
} from '@100mslive/react-sdk';
import { Video as HMSVideoTile } from '@100mslive/react-ui'; // Assuming 'Video' is the correct component
import { Button } from '@/components/ui/button';
import { Mic, MicOff, VideoOff, PhoneOff, Loader2, AlertTriangle, Video as VideoIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateCallStatus as updateAppCallStatus } from '@/actions/videoCallActions'; // Action to update our Firestore session
import { USER_ROLES_100MS } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface VideoCallUIProps {
  authToken: string;
  userName: string;
  initialRole: string; // e.g., 'host' or 'guest' from USER_ROLES_100MS
  appCallId: string; // Our application's Firestore call ID
  onPermissionsError?: () => void;
}

function RoomContent({ authToken, userName, initialRole, appCallId, onPermissionsError }: VideoCallUIProps & {isLoading: boolean, setIsLoading: React.Dispatch<React.SetStateAction<boolean>>}) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const roomState = useHMSStore(selectRoomState);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  const { toast } = useToast();
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const {isLoading, setIsLoading} = arguments[0]; // Get from props


  // Effect to join the 100ms room
  useEffect(() => {
    if (!authToken || !hmsActions || hasAttemptedJoin || roomState !== HMSRoomState.Disconnected) {
      return;
    }
    
    console.log(`Attempting to join 100ms room. Role: ${initialRole}, Token: ${authToken ? 'present' : 'absent'}`);
    setHasAttemptedJoin(true);
    setIsLoading(true);

    const joinRoom = async () => {
      try {
        await hmsActions.join({
          userName: userName,
          authToken: authToken,
          role: initialRole,
        });
        // Connection state will be managed by isConnected and roomState selectors
        await updateAppCallStatus(appCallId, 'connected'); // Update our Firestore session
      } catch (error: any) {
        console.error('Error joining 100ms room:', error);
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: error.message || 'Could not join the video call.',
        });
        await updateAppCallStatus(appCallId, 'error');
         if (onPermissionsError && (error.code === 2001 || error.message?.includes('permission'))) { // Example error codes for permission issues
            onPermissionsError();
        }
      } finally {
         setIsLoading(false);
      }
    };
    joinRoom();

  }, [hmsActions, authToken, userName, initialRole, hasAttemptedJoin, roomState, appCallId, toast, setIsLoading, onPermissionsError]);

  // Effect to leave the 100ms room on component unmount or when isConnected changes
  useEffect(() => {
    return () => {
      if (roomState !== HMSRoomState.Disconnected) {
        console.log("Leaving 100ms room due to component unmount or disconnect state.");
        hmsActions.leave()
          .then(() => updateAppCallStatus(appCallId, 'ended'))
          .catch(err => console.error("Error leaving 100ms room on unmount:", err));
      }
    };
  }, [hmsActions, appCallId, roomState]); // roomState added to deps

  const handleLeaveCall = async () => {
    setIsLoading(true);
    try {
      await hmsActions.leave();
      await updateAppCallStatus(appCallId, 'ended'); // Update our Firestore call session
    } catch (error) {
      console.error('Error leaving call:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not leave the call properly.' });
    } finally {
        setIsLoading(false);
    }
  };

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
  };


  if (isLoading && !isConnected && roomState === HMSRoomState.Connecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Joining call...</p>
      </div>
    );
  }

  if (roomState === HMSRoomState.Error || roomState === HMSRoomState.Failed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p>Failed to connect to the call.</p>
         <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Try Again</Button>
      </div>
    );
  }
  
  if (!isConnected && (roomState === HMSRoomState.Disconnected && hasAttemptedJoin && !isLoading)) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p>Disconnected. The call may have ended or there was a connection issue.</p>
         <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Reconnect</Button>
      </div>
    );
  }


  if (!isConnected && !hasAttemptedJoin && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Initializing...</p>
      </div>
    );
  }
  
  // Display for remote peers
  const remotePeers = peers.filter(peer => !peer.isLocal);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative">
      {/* Video Grid */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2 p-2 overflow-auto">
        {localPeer && (
            <div className="relative aspect-video bg-black rounded-md overflow-hidden shadow-lg border-2 border-primary">
                <HMSVideoTile 
                    peer={localPeer} 
                    isLocal={true} 
                    className="object-cover w-full h-full"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {localPeer.name} (You)
                </div>
            </div>
        )}
        {remotePeers.map(peer => (
          <div key={peer.id} className="relative aspect-video bg-black rounded-md overflow-hidden shadow-lg">
            {peer.videoTrack ? (
              <HMSVideoTile 
                trackId={peer.videoTrack} 
                className="object-cover w-full h-full" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <Avatar className="w-24 h-24 text-3xl">
                  <AvatarFallback>{getInitials(peer.name)}</AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {peer.name}
            </div>
          </div>
        ))}
        {remotePeers.length === 0 && isConnected && (
            <div className="md:col-span-1 flex items-center justify-center text-muted-foreground text-center p-4">
                <p>Waiting for others to join...</p>
            </div>
        )}
      </div>

      {/* Controls */}
      {isConnected && (
        <div className="bg-gray-800/80 backdrop-blur-sm p-3 md:p-4 flex justify-center items-center space-x-3 md:space-x-4 absolute bottom-0 left-0 right-0">
          <Button onClick={toggleAudio} variant="outline" size="icon" className={`rounded-full h-12 w-12 md:h-14 md:w-14 ${!isLocalAudioEnabled ? 'bg-destructive hover:bg-destructive/90' : 'bg-gray-700 hover:bg-gray-600'} text-white`}>
            {!isLocalAudioEnabled ? <MicOff /> : <Mic />}
          </Button>
          <Button onClick={toggleVideo} variant="outline" size="icon" className={`rounded-full h-12 w-12 md:h-14 md:w-14 ${!isLocalVideoEnabled ? 'bg-destructive hover:bg-destructive/90' : 'bg-gray-700 hover:bg-gray-600'} text-white`}>
            {!isLocalVideoEnabled ? <VideoOff /> : <VideoIcon />}
          </Button>
          <Button onClick={handleLeaveCall} variant="destructive" size="icon" className="rounded-full h-14 w-14 md:h-16 md:w-16">
            <PhoneOff />
          </Button>
        </div>
      )}
    </div>
  );
}


export function VideoCallUIWrapper(props: VideoCallUIProps) {
  const [isLoading, setIsLoading] = useState(true); // Moved loading state here
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const mediaCheckedRef = useRef(false);
  const { toast } = useToast();

  const checkMediaPermissions = useCallback(async () => {
    if (mediaCheckedRef.current) return;
    mediaCheckedRef.current = true;
    setIsLoading(true);
    try {
      // Just request to check, stream not stored here
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop tracks immediately after permission check
      setHasMediaPermission(true);
      props.onPermissionsError?.(); // Call if defined, though it's success here
    } catch (error) {
      console.error("Error getting media permissions:", error);
      toast({ variant: "destructive", title: "Permissions Denied", description: "Camera and microphone access are required for video calls."});
      setHasMediaPermission(false);
      if (props.onPermissionsError) props.onPermissionsError();
    } finally {
      setIsLoading(false);
    }
  }, [props, toast]);

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

  return (
    <HMSRoomProvider>
      <RoomContent {...props} isLoading={isLoading} setIsLoading={setIsLoading} />
    </HMSRoomProvider>
  );
}
