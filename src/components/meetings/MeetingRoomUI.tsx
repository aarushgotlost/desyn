
"use client";

import { useEffect } from 'react';
import {
  HMSRoomProvider,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  HMSReactiveStore,
} from '@100mslive/react-sdk';
import { Video as HMSVideoTile } from '@100mslive/react-ui'; 
import { MeetingControls } from './MeetingControls';
import { Loader2, AlertTriangle } from 'lucide-react';

const hmsManager = new HMSReactiveStore();
const hmsActions = hmsManager.getActions();


interface MeetingRoomUIProps {
  authToken: string;
  userName: string;
  meetingTitle: string;
  onLeaveMeeting: () => void;
  isHost: boolean;
}

function RoomView({ onLeaveMeeting, meetingTitle, userName, isHost }: Omit<MeetingRoomUIProps, 'authToken'>) {
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);

  useEffect(() => {
    // HMSRoomProvider should handle joining automatically with the config prop.
    // The explicit hmsActions.join() call has been removed.

    return () => {
      // Ensure hmsActions and leave are available before calling
      // Check if connected before attempting to leave to avoid errors if never connected.
      if (hmsActions && typeof hmsActions.leave === 'function' && hmsManager.getStore().getState(selectIsConnectedToRoom)) {
        hmsActions.leave();
      }
    };
  }, []); // Empty dependency array, leave logic only depends on unmount.

  if (!isConnected && !localPeer) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Joining "{meetingTitle}"...</p>
        <p className="text-sm text-muted-foreground">Please wait while we connect you.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border bg-card text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold truncate">{meetingTitle}</h1>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 h-full overflow-y-auto">
          {localPeer && (
            <div key={localPeer.id} className="relative aspect-video bg-muted rounded-lg overflow-hidden shadow-md">
              <HMSVideoTile
                peer={localPeer}
                isLocal={true}
                className="object-cover w-full h-full"
              />
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                {localPeer.name} (You)
              </div>
            </div>
          )}
          {peers.filter(p => !p.isLocal).map((peer) => {
            return (
              <div key={peer.id} className="relative aspect-video bg-muted rounded-lg overflow-hidden shadow-md">
                <HMSVideoTile
                  peer={peer}
                  isLocal={false}
                  className="object-cover w-full h-full"
                />
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  {peer.name}
                </div>
              </div>
            );
          })}
          {peers.length === 0 && !localPeer && ( 
            <div className="col-span-full flex items-center justify-center h-full">
              <p className="text-muted-foreground">Waiting for participants...</p>
            </div>
          )}
           {peers.length === 1 && localPeer && peers[0].id === localPeer.id && ( 
            <div className="col-span-full flex items-center justify-center h-full">
              <p className="text-muted-foreground">You are the only one in the meeting.</p>
            </div>
          )}
        </div>
      </main>

      <MeetingControls
        hmsActions={hmsActions}
        onLeave={onLeaveMeeting}
        isHost={isHost}
        localPeer={localPeer}
      />
    </div>
  );
}

export function MeetingRoomUI({ authToken, userName, meetingTitle, onLeaveMeeting, isHost }: MeetingRoomUIProps) {
  // Explicitly check the authToken prop before passing to HMSRoomProvider
  if (!authToken || typeof authToken !== 'string' || authToken.trim() === "") {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive">Invalid Auth Token For Room UI</h2>
        <p className="text-muted-foreground">The authentication token provided to the meeting room is empty or invalid.</p>
        <p className="text-xs mt-2 text-muted-foreground">Debug Info - Token Value: '{String(authToken)}', Token Type: {typeof authToken}</p>
      </div>
    );
  }

  return (
    <HMSRoomProvider 
      actions={hmsActions} 
      store={hmsManager.getStore()} 
      config={{authToken, userName}}
    >
        <RoomView 
            userName={userName} 
            meetingTitle={meetingTitle} 
            onLeaveMeeting={onLeaveMeeting}
            isHost={isHost}
        />
    </HMSRoomProvider>
  );
}
