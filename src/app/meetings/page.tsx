
"use client";

import { useEffect, useState, useTransition, Fragment } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, PlusCircle, Users, ScreenShare, Mic, Settings2, Loader2, ArrowRight } from "lucide-react";
// import type { Metadata } from 'next'; // Metadata needs to be static for client components or handled differently
import Image from "next/image";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startNewMeeting, joinMeeting } from '@/actions/meetingActions';
import { getMeetings } from '@/services/firestoreService';
import type { Meeting } from '@/types/data';
import { formatDistanceToNowStrict } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';


export default function MeetingsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isStartingMeeting, startStartingMeetingTransition] = useTransition();
  const [isJoiningMeetingMap, setIsJoiningMeetingMap] = useState<Record<string, boolean>>({});
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  async function fetchMeetings() {
    setIsLoadingMeetings(true);
    try {
      const fetchedMeetings = await getMeetings();
      setMeetings(fetchedMeetings);
    } catch (error) {
      toast({ title: "Error", description: "Could not load meetings.", variant: "destructive" });
    } finally {
      setIsLoadingMeetings(false);
    }
  }

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleStartNewMeeting = () => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to start a meeting.", variant: "destructive" });
      return;
    }
    startStartingMeetingTransition(async () => {
      const result = await startNewMeeting(user.uid, userProfile.displayName);
      if (result.success && result.meetingId) {
        toast({ title: "Meeting Started!", description: result.message });
        fetchMeetings(); 
        router.push(`/meetings/${result.meetingId}`);
      } else {
        toast({ title: "Error Starting Meeting", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleJoinMeeting = (meetingId: string) => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to join a meeting.", variant: "destructive" });
      return;
    }
     setIsJoiningMeetingMap(prev => ({ ...prev, [meetingId]: true }));
     startStartingMeetingTransition(async () => { 
      const result = await joinMeeting(meetingId, { uid: user.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL });
      if (result.success) {
        toast({ title: "Joined Meeting!", description: result.message });
        router.push(`/meetings/${meetingId}`); 
      } else {
        toast({ title: "Error Joining Meeting", description: result.message, variant: "destructive" });
      }
      setIsJoiningMeetingMap(prev => ({ ...prev, [meetingId]: false }));
    });
  };


  if (authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center justify-center md:justify-start">
            <Video className="mr-3 w-7 h-7 sm:w-8 sm:h-8 text-primary" /> 
            Meetings
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Collaborate with video, audio, and screen sharing.</p>
        </div>
        <Button 
          size="lg" 
          onClick={handleStartNewMeeting} 
          disabled={isStartingMeeting || !user}
          className="w-full md:w-auto"
        >
          {isStartingMeeting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
          Start New Meeting
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Your Meetings</CardTitle>
          <CardDescription>Join ongoing meetings or review past ones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingMeetings ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : meetings.length > 0 ? (
            meetings.map((meeting) => {
              const isJoiningThisMeeting = isJoiningMeetingMap[meeting.id] || false;
              const currentUserIsParticipant = user && meeting.participantUids.includes(user.uid);
              return (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-3">
                  <div className="flex-grow">
                    <Link href={`/meetings/${meeting.id}`}>
                        <CardTitle className="text-lg hover:text-primary">{meeting.title}</CardTitle>
                    </Link>
                    <CardDescription className="text-xs mt-1">
                      Started by {meeting.createdByName || 'User'} &bull; {formatDistanceToNowStrict(new Date(meeting.createdAt), { addSuffix: true })} &bull; {meeting.participants.length} participant(s)
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-auto flex-shrink-0">
                    {meeting.isActive ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleJoinMeeting(meeting.id)}
                        disabled={isJoiningThisMeeting}
                        className="w-full"
                      >
                        {isJoiningThisMeeting ? (
                          <Fragment>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...
                          </Fragment>
                        ) : (
                           currentUserIsParticipant ? (
                            <Fragment>
                              Open Meeting <ArrowRight className="ml-2 h-4 w-4" />
                            </Fragment>
                          ) : (
                            <Fragment>
                              Join Meeting <ArrowRight className="ml-2 h-4 w-4" />
                            </Fragment>
                          )
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <Link href={`/meetings/${meeting.id}`}>View Details</Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                 <CardContent className="py-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm text-muted-foreground">Participants:</span>
                    <div className="flex -space-x-2 overflow-hidden">
                      {meeting.participants.slice(0, 5).map((p, i) => (
                        <Avatar key={p.uid || i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background">
                          <AvatarImage src={p.photoURL || `https://placehold.co/40x40.png?text=${getInitials(p.displayName)}`} data-ai-hint="participant avatar"/>
                          <AvatarFallback>{getInitials(p.displayName)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {meeting.participants.length > 5 && (
                        <Avatar className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-muted text-muted-foreground text-xs flex items-center justify-center">
                          +{meeting.participants.length - 5}
                        </Avatar>
                      )}
                    </div>
                  </div>
                  {meeting.isActive && currentUserIsParticipant && ( // Only show controls if user is participant and meeting active
                    <div className="mt-2 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium mb-2 text-center text-green-600 dark:text-green-400">Meeting in Progress</p>
                      <div className="flex justify-center items-center space-x-2 sm:space-x-3">
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Toggle Microphone (Placeholder)" disabled>
                          <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Toggle Video (Placeholder)" disabled>
                          <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Share Screen (Placeholder)" disabled>
                          <ScreenShare className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Meeting Settings (Placeholder)" disabled>
                          <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )})
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Video size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No Meetings Yet</h3>
              <p className="text-sm">Start a new meeting to collaborate with your team.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">How Meetings Work (Placeholder)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>This section is a placeholder to illustrate where information about Desyn's meeting features would go.</p>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong>Video & Audio Conferencing:</strong> Connect face-to-face with high-quality video and audio (future feature).</li>
                <li><strong>Screen Sharing:</strong> Share your entire screen or specific application windows for presentations or demos (future feature).</li>
                <li><strong>Real-time Collaboration:</strong> Work together on projects like animations with integrated tools (future feature).</li>
                <li><strong>In-Meeting Chat:</strong> Discuss ideas and share links without interrupting the main conversation (future feature).</li>
            </ul>
            <p className="pt-2 text-xs italic">Note: The actual implementation of real-time meeting features is complex and not part of this UI prototype stage.</p>
        </CardContent>
      </Card>
    </div>
  );
}

