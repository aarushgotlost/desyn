
"use client";

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { getActiveMeetings } from '@/services/firestoreService';
import type { Meeting } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, PlusCircle, Loader2, Users, CalendarDays, AlertTriangle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { createMeetingSession } from '@/actions/meetingActions';
import { getInitials } from '@/lib/utils';
import { DEFAULT_100MS_ROOM_ID } from '@/lib/constants';

export default function MeetingsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [isCreatingMeeting, startCreateTransition] = useTransition();

  useEffect(() => {
    async function fetchMeetings() {
      if (authLoading) return; // Wait for auth to be ready
      setIsLoadingMeetings(true);
      try {
        const activeMeetings = await getActiveMeetings();
        setMeetings(activeMeetings);
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
        toast({ title: "Error", description: "Could not load meetings.", variant: "destructive" });
      } finally {
        setIsLoadingMeetings(false);
      }
    }
    fetchMeetings();
  }, [authLoading, toast]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a meeting.", variant: "destructive" });
      return;
    }
    if (!newMeetingTitle.trim()) {
      toast({ title: "Validation Error", description: "Meeting title is required.", variant: "destructive" });
      return;
    }

    startCreateTransition(async () => {
      const result = await createMeetingSession(newMeetingTitle, newMeetingDescription, userProfile);
      if (result.success && result.meetingId) {
        toast({ title: "Meeting Created!", description: `Meeting "${newMeetingTitle}" is ready.` });
        setNewMeetingTitle('');
        setNewMeetingDescription('');
        setShowCreateForm(false);
        // Refresh meetings list
        const activeMeetings = await getActiveMeetings();
        setMeetings(activeMeetings);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  if (authLoading || isLoadingMeetings) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <Video size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Log in to view meetings</h2>
        <p className="text-muted-foreground mb-4">Please log in to create or join video meetings.</p>
        <Button asChild><Link href="/login">Log In</Link></Button>
      </div>
    );
  }
  
  if (DEFAULT_100MS_ROOM_ID === "YOUR_100MS_ROOM_ID_HERE") {
    return (
       <div className="max-w-2xl mx-auto my-8">
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" /> Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-destructive/90 space-y-2">
            <p>The meeting functionality requires a 100ms Room ID to be configured.</p>
            <p>Please update the <code className="bg-destructive/20 px-1 py-0.5 rounded text-sm">DEFAULT_100MS_ROOM_ID</code> in <code className="bg-destructive/20 px-1 py-0.5 rounded text-sm">src/lib/constants.ts</code> with a valid Room ID from your 100ms Dashboard.</p>
            <p>After updating, restart your development server.</p>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Video className="mr-3 w-8 h-8 text-primary" />
            Video Meetings
          </h1>
          <p className="text-muted-foreground">Join ongoing meetings or start a new one.</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> {showCreateForm ? 'Cancel' : 'Create New Meeting'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="shadow-xl animate-in fade-in-0 zoom-in-95">
          <CardHeader>
            <CardTitle>Create a New Meeting Session</CardTitle>
            <CardDescription>
              This will create a Desyn meeting session linked to the pre-configured 100ms room: <code className="text-xs bg-muted p-1 rounded">{DEFAULT_100MS_ROOM_ID}</code>.
              All participants will join this same 100ms room.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <Label htmlFor="meetingTitle">Meeting Title</Label>
                <Input
                  id="meetingTitle"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="e.g., Project Alpha Sync, Weekly Design Review"
                  disabled={isCreatingMeeting}
                />
              </div>
              <div>
                <Label htmlFor="meetingDescription">Meeting Description (Optional)</Label>
                <Textarea
                  id="meetingDescription"
                  value={newMeetingDescription}
                  onChange={(e) => setNewMeetingDescription(e.target.value)}
                  placeholder="Briefly describe the meeting's purpose."
                  rows={3}
                  disabled={isCreatingMeeting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreatingMeeting}>
                {isCreatingMeeting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Meeting Session"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold font-headline mb-6">Active Meetings</h2>
        {meetings.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="p-4">
                  <div className="flex items-start space-x-3 mb-2">
                    {meeting.hostProfile && (
                      <Avatar className="h-10 w-10 border">
                          <AvatarImage src={meeting.hostProfile.photoURL || undefined} alt={meeting.hostProfile.displayName || "Host"} data-ai-hint="user avatar small"/>
                          <AvatarFallback>{getInitials(meeting.hostProfile.displayName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                        <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
                           <Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link>
                        </CardTitle>
                        {meeting.hostProfile && <p className="text-xs text-muted-foreground">Hosted by {meeting.hostProfile.displayName || 'Unknown'}</p>}
                    </div>
                  </div>
                  {meeting.description && <CardDescription className="text-sm line-clamp-2 h-10">{meeting.description}</CardDescription>}

                </CardHeader>
                <CardContent className="flex-grow p-4 pt-0 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2 mb-1">
                    <Users size={14} /> <span>{meeting.participantUids.length} participant(s)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays size={14} /> <span>Created {formatDistanceToNowStrict(new Date(meeting.createdAt), { addSuffix: true })}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t mt-auto">
                  <Button asChild className="w-full" variant="default">
                    <Link href={`/meetings/${meeting.id}`}>Join Meeting</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">No active meetings right now. Why not start one?</p>
        )}
      </div>
    </div>
  );
}
