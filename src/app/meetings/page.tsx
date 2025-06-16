
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, PlusCircle, Users, ScreenShare, Mic, MicOff, VideoOff, Settings2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from 'next';
import Image from "next/image";

export const metadata: Metadata = {
  title: 'Meetings - Desyn',
  description: 'Collaborate with your team in real-time video meetings on Desyn.',
};

// Placeholder data - in a real app, this would come from a backend/service
const placeholderMeetings = [
  { id: "1", title: "Project Alpha - Weekly Sync", participants: 3, isActive: true, type: "Team Sync" },
  { id: "2", title: "Animation Review - Episode 3", participants: 5, isActive: false, type: "Review" },
  { id: "3", title: "Quick Brainstorm", participants: 2, isActive: true, type: "Ad-hoc" },
];

export default function MeetingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center">
            <Video className="mr-3 w-8 h-8 text-primary" /> 
            Meetings
          </h1>
          <p className="text-muted-foreground">Collaborate with video, audio, and screen sharing.</p>
        </div>
        <Button size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Start New Meeting
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Your Meetings</CardTitle>
          <CardDescription>Join ongoing meetings or review past ones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {placeholderMeetings.length > 0 ? (
            placeholderMeetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                  <div>
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    <CardDescription className="text-xs">{meeting.type} &bull; {meeting.participants} participants</CardDescription>
                  </div>
                  <Button variant={meeting.isActive ? "default" : "outline"} size="sm">
                    {meeting.isActive ? "Join Meeting" : "View Details"}
                  </Button>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm text-muted-foreground">Participants:</span>
                    <div className="flex -space-x-2 overflow-hidden">
                      {[...Array(meeting.participants)].map((_, i) => (
                        <Avatar key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background">
                          <AvatarImage src={`https://placehold.co/40x40.png?text=U${i+1}`} data-ai-hint="participant avatar"/>
                          <AvatarFallback>U{i+1}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                  {/* Placeholder for active meeting controls */}
                  {meeting.isActive && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium mb-2 text-center text-green-600 dark:text-green-400">Meeting in Progress</p>
                      <div className="flex justify-center items-center space-x-3">
                        <Button variant="outline" size="icon" title="Toggle Microphone (Placeholder)">
                          <Mic className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" title="Toggle Video (Placeholder)">
                          <Video className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" title="Share Screen (Placeholder)">
                          <ScreenShare className="h-5 w-5" />
                        </Button>
                         <Button variant="ghost" size="icon" title="Meeting Settings (Placeholder)">
                          <Settings2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                 <CardFooter className="text-xs text-muted-foreground pt-2">
                  <p>Placeholder: Add friends, view agenda, chat, etc.</p>
                </CardFooter>
              </Card>
            ))
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
            <CardTitle>How Meetings Work (Placeholder)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>This section is a placeholder to illustrate where information about Desyn's meeting features would go.</p>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong>Video & Audio Conferencing:</strong> Connect face-to-face with high-quality video and audio.</li>
                <li><strong>Screen Sharing:</strong> Share your entire screen or specific application windows for presentations or demos.</li>
                <li><strong>Add Friends/Team:</strong> Invite your Desyn connections or team members to join your meetings.</li>
                <li><strong>In-Meeting Chat:</strong> Discuss ideas and share links without interrupting the main conversation.</li>
                <li><strong>Tearix2D Integration:</strong> Launch collaborative animation sessions directly within a meeting context (future).</li>
            </ul>
            <p className="pt-2 text-xs italic">Note: The actual implementation of these real-time features is complex and not part of this UI prototype.</p>
        </CardContent>
      </Card>
    </div>
  );
}
