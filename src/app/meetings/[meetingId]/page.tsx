
"use client";

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Users, ScreenShare, Mic, Settings2, ArrowLeft, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getMeetingDetails } from '@/services/firestoreService';
import { joinMeeting } from '@/actions/meetingActions';
import type { Meeting } from '@/types/data';
import { formatDistanceToNowStrict } from 'date-fns';
import { getInitials } from '@/lib/utils';

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

  const handleJoinMeeting = () => {
    if (!user || !userProfile || !meeting) {
      toast({ title: "Error", description: "Cannot join meeting.", variant: "destructive" });
      return;
    }
    startJoiningTransition(async () => {
      const result = await joinMeeting(meeting.id, { uid: user.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL });
      if (result.success) {
        toast({ title: "Joined Meeting!", description: result.message });
        // Re-fetch meeting details to update participant list
        const updatedMeeting = await getMeetingDetails(meeting.id);
        if (updatedMeeting) setMeeting(updatedMeeting);
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
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <Button variant="outline" size="sm" onClick={() => router.push('/meetings')} className="mb-3 sm:mb-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> All Meetings
              </Button>
              <CardTitle className="text-2xl sm:text-3xl font-bold font-headline mt-1">{meeting.title}</CardTitle>
              <CardDescription className="text-sm">
                Hosted by {meeting.createdByName || 'User'} &bull; Created {formatDistanceToNowStrict(new Date(meeting.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-center">
               <Button onClick={copyMeetingLink} variant="outline" size="sm">
                {hasCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                {hasCopied ? 'Copied!' : 'Copy Link'}
              </Button>
              {!currentUserIsParticipant && meeting.isActive && (
                <Button onClick={handleJoinMeeting} disabled={isJoining} size="sm">
                  {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Join Meeting
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Video Area Placeholder */}
            <div className="md:col-span-2 h-64 md:h-96 bg-muted rounded-lg flex flex-col items-center justify-center border shadow-inner">
              <Video className="h-24 w-24 text-muted-foreground opacity-50" />
              <p className="mt-4 text-muted-foreground text-lg">Main Video Feed Area</p>
              <p className="text-xs text-muted-foreground">(Video conferencing not yet implemented)</p>
               {meeting.isActive && currentUserIsParticipant && (
                <div className="mt-6 p-3 flex justify-center items-center space-x-3">
                    <Button variant="outline" size="lg" title="Toggle Microphone (Placeholder)" disabled>
                    <Mic className="h-6 w-6" />
                    </Button>
                    <Button variant="destructive" size="lg" title="Leave Meeting (Placeholder)" disabled>
                        <Video className="h-6 w-6 rotate-45" /> {/* Using video icon for hang up, or use PhoneOff */}
                    </Button>
                    <Button variant="outline" size="lg" title="Toggle Video (Placeholder)" disabled>
                    <Video className="h-6 w-6" />
                    </Button>
                    <Button variant="outline" size="lg" title="Share Screen (Placeholder)" disabled>
                    <ScreenShare className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Meeting Settings (Placeholder)" disabled>
                    <Settings2 className="h-6 w-6" />
                    </Button>
                </div>
              )}
            </div>

            {/* Participants List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Participants ({meeting.participants.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {meeting.participants.map(p => (
                  <div key={p.uid} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.photoURL || undefined} alt={p.displayName || 'User'} data-ai-hint="participant avatar"/>
                      <AvatarFallback>{getInitials(p.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{p.displayName || 'User'}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Chat (Placeholder)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 border rounded-md p-3 bg-muted/50 flex items-center justify-center">
                <p className="text-muted-foreground italic">Chat functionality is a placeholder.</p>
              </div>
            </CardContent>
          </Card>

        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
                {!meeting.isActive ? "This meeting has ended or is not currently active." : "This meeting is currently active (placeholder status)."}
            </p>
         </CardFooter>
      </Card>
    </div>
  );
}
