
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff, Users, MessageSquare } from 'lucide-react';
import type { HMSActions, HMSLocalPeer } from '@100mslive/react-sdk';
import { useHMSStore, selectIsLocalAudioEnabled, selectIsLocalVideoEnabled, selectIsLocalScreenShared } from '@100mslive/react-sdk';

interface MeetingControlsProps {
  hmsActions: HMSActions;
  onLeave: () => void;
  isHost: boolean;
  localPeer: HMSLocalPeer | null;
}

export function MeetingControls({ hmsActions, onLeave, isHost, localPeer }: MeetingControlsProps) {
  const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const isScreenShared = useHMSStore(selectIsLocalScreenShared);
  // const [isChatOpen, setIsChatOpen] = useState(false); // Future chat feature
  // const [isParticipantsOpen, setIsParticipantsOpen] = useState(false); // Future participants list

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!isVideoEnabled);
  };

  const toggleScreenShare = async () => {
    if (isScreenShared) {
      await hmsActions.setScreenShareEnabled(false);
    } else {
      try {
        await hmsActions.setScreenShareEnabled(true);
      } catch (error) {
        console.error("Error starting screen share:", error);
        // Handle error (e.g., user denied permission)
      }
    }
  };

  const handleLeaveMeeting = async () => {
    await hmsActions.leave();
    onLeave(); // Call parent's leave handler (for Firestore updates, navigation)
  };
  

  return (
    <footer className="p-3 md:p-4 bg-card border-t border-border shadow-sm">
      <div className="flex justify-center items-center space-x-2 md:space-x-3">
        <Button
          variant={isAudioEnabled ? "outline" : "secondary"}
          size="icon"
          onClick={toggleAudio}
          aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
          className="h-10 w-10 md:h-12 md:w-12 rounded-full"
        >
          {isAudioEnabled ? <Mic className="h-5 w-5 md:h-6 md:w-6" /> : <MicOff className="h-5 w-5 md:h-6 md:w-6" />}
        </Button>
        <Button
          variant={isVideoEnabled ? "outline" : "secondary"}
          size="icon"
          onClick={toggleVideo}
          aria-label={isVideoEnabled ? "Stop video" : "Start video"}
          className="h-10 w-10 md:h-12 md:w-12 rounded-full"
        >
          {isVideoEnabled ? <Video className="h-5 w-5 md:h-6 md:w-6" /> : <VideoOff className="h-5 w-5 md:h-6 md:w-6" />}
        </Button>
        
        {/* Screen Share Button - Conditionally render if supported or based on role */}
        {/* For simplicity, always show if localPeer exists */}
        {localPeer && (
            <Button
                variant={isScreenShared ? "default" : "outline"}
                size="icon"
                onClick={toggleScreenShare}
                aria-label={isScreenShared ? "Stop screen share" : "Start screen share"}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            >
                {isScreenShared ? <ScreenShareOff className="h-5 w-5 md:h-6 md:w-6" /> : <ScreenShare className="h-5 w-5 md:h-6 md:w-6" />}
            </Button>
        )}
        
        {/* Placeholder for future participant list toggle */}
        {/* <Button variant="outline" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-full">
          <Users className="h-5 w-5 md:h-6 md:w-6" />
        </Button> */}

        {/* Placeholder for future chat toggle */}
        {/* <Button variant="outline" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-full">
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
        </Button> */}

        <Button
          variant="destructive"
          size="icon"
          onClick={handleLeaveMeeting}
          aria-label={isHost ? "End meeting" : "Leave meeting"}
          className="h-10 w-10 md:h-12 md:w-12 rounded-full"
        >
          <PhoneOff className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </div>
    </footer>
  );
}
