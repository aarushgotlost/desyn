
"use client";

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveMeetings } from '@/services/firestoreService';
import { createMeetingAction } from '@/actions/meetingActions';
import type { Meeting } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Video, Users, CalendarDays, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function MeetingsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isCreatingMeeting, startCreatingTransition] = useTransition();
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchMeetings() {
      setIsLoadingMeetings(true);
      try {
        const activeMeetings = await getActiveMeetings();
        setMeetings(activeMeetings);
      } catch (error) {
        console.error("Error fetching meetings:", error);
        toast({ title: "Error", description: "Could not load meetings.", variant: "destructive" });
      } finally {
        setIsLoadingMeetings(false);
      }
    }
    fetchMeetings();
  }, [toast]);

  const handleCreateMeeting = async () => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a meeting.", variant: "destructive" });
      return;
    }
    if (!newMeetingTitle.trim()) {
      toast({ title: "Validation Error", description: "Meeting title cannot be empty.", variant: "destructive" });
      return;
    }

    startCreatingTransition(async () => {
      const result = await createMeetingAction(newMeetingTitle, userProfile);
      if (result.success && result.meetingId) {
        toast({ title: "Meeting Created!", description: `Meeting "${newMeetingTitle}" has been created.` });
        setNewMeetingTitle('');
        setIsCreateDialogOpen(false);
        router.push(`/meetings/${result.meetingId}`);
      } else {
        toast({ title: "Error Creating Meeting", description: result.message, variant: "destructive" });
      }
    });
  };
  
  if (authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Video className="mr-3 w-8 h-8 text-primary" />
            Live Meetings
          </h1>
          <p className="text-muted-foreground">Join ongoing meetings or start a new one.</p>
        </div>
        {user && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Meeting</DialogTitle>
                <DialogDescription>
                  Enter a title for your new meeting. Click create when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="meeting-title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="meeting-title"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., Project Alpha Sync"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleCreateMeeting} disabled={isCreatingMeeting}>
                  {isCreatingMeeting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Meeting
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoadingMeetings ? (
        <div className="flex justify-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : meetings.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="p-4">
                 <div className="flex items-center space-x-3 mb-2">
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={meeting.hostProfile.photoURL || undefined} alt={meeting.hostProfile.displayName || "Host"} data-ai-hint="user avatar small"/>
                        <AvatarFallback>{getInitials(meeting.hostProfile.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xs text-muted-foreground">Hosted by</p>
                        <p className="text-sm font-medium text-foreground">{meeting.hostProfile.displayName || "Host"}</p>
                    </div>
                </div>
                <CardTitle className="text-lg font-semibold line-clamp-2">{meeting.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center"><CalendarDays size={14} className="mr-1.5" /> Created {formatDistanceToNowStrict(new Date(meeting.createdAt), { addSuffix: true })}</p>
                  <p className="flex items-center"><Users size={14} className="mr-1.5" /> {meeting.participants.length} participant(s)</p>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t mt-auto">
                <Button asChild className="w-full">
                  <Link href={`/meetings/${meeting.id}`}>
                    <LogIn className="mr-2 h-4 w-4" /> Join Meeting
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <Video size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">No Active Meetings</h3>
          <p className="text-sm">Why not start one?</p>
        </div>
      )}
       {!user && !authLoading && (
          <Card className="mt-8 text-center p-6 bg-muted/30">
            <CardTitle className="mb-2">Log In to Participate</CardTitle>
            <CardDescription className="mb-4">Please log in or sign up to create or join meetings.</CardDescription>
            <div className="flex gap-2 justify-center">
              <Button asChild><Link href="/login">Log In</Link></Button>
              <Button asChild variant="outline"><Link href="/signup">Sign Up</Link></Button>
            </div>
          </Card>
        )}
    </div>
  );
}
