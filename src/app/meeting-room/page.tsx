
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Film, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Animation Meeting Room - Desyn',
  description: 'Collaborate on animations and chat with your team in real-time.',
};

export default function MeetingRoomPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <Film className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline">Animation Meeting Room</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Welcome to your collaborative animation space. Launch the animator and start creating together!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-10">
          <div className="text-center">
            <Image 
              src="https://placehold.co/600x300.png" 
              alt="Animation collaboration placeholder" 
              width={600} 
              height={300} 
              className="mx-auto rounded-lg shadow-md border"
              data-ai-hint="collaboration animation team" 
            />
            <Button asChild size="lg" className="mt-8 text-lg px-8 py-6">
              <Link href="/meeting-room/animator">
                <Film className="mr-2 h-5 w-5" /> Launch Tearix2D Animator
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              This will open the Tearix2D animation tool.
            </p>
          </div>

          <Card className="mt-10">
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Team Chat</CardTitle>
              <CardDescription>Discuss your project in real-time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-48 border rounded-md p-3 bg-muted/50 overflow-y-auto">
                <p className="text-sm text-muted-foreground italic">Chat messages will appear here...</p>
                {/* Placeholder for actual chat messages */}
              </div>
              <div className="flex space-x-2">
                <Input type="text" placeholder="Type your message..." className="flex-1" disabled />
                <Button variant="outline" size="icon" disabled>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Chat functionality is a placeholder.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
