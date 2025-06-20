
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChatSessions } from '@/services/chatSubscriptionService';
import type { ChatSession } from '@/types/messaging';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquareText, UserPlus, Loader2, AlertTriangle, Search } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation'; 
import { getInitials } from '@/lib/utils';

function ChatListItem({ session, currentUserUid }: { session: ChatSession; currentUserUid: string }) {
  const otherParticipant = session.participants.find(p => p.uid !== currentUserUid);

  if (!otherParticipant) return null;

  const lastMessageDate = session.lastMessageAt ? new Date(session.lastMessageAt) : null; 

  return (
    <Link href={`/messages/${session.id}`} passHref>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4 flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={otherParticipant.photoURL || undefined} alt={otherParticipant.displayName || 'User'} data-ai-hint="user avatar" />
            <AvatarFallback>{getInitials(otherParticipant.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="font-semibold truncate">{otherParticipant.displayName || 'Unknown User'}</p>
              {lastMessageDate && (
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNowStrict(lastMessageDate, { addSuffix: true })}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {session.lastMessageSenderId === currentUserUid ? 'You: ' : ''}
              {session.lastMessageText || 'No messages yet.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter(); 

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    if (authLoading || !user) {
      setIsLoadingSessions(false);
      return;
    }

    setIsLoadingSessions(true);
    const unsubscribe = getUserChatSessions(user.uid, (sessions) => {
      setChatSessions(sessions);
      setIsLoadingSessions(false);
      setError(null);
    }, (err) => { 
      console.error("Error fetching chat sessions:", err);
      setError("Failed to load chat sessions. Please try again.");
      setIsLoadingSessions(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, authLoading]);

  const filteredSessions = chatSessions.filter(session => {
    const otherParticipant = session.participants.find(p => p.uid !== user?.uid);
    return otherParticipant?.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
  });


  if (authLoading || isLoadingSessions) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="shadow-xl max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>Please log in to view your messages.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild><Link href="/login">Log In</Link></Button>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
       <Card className="shadow-xl max-w-md mx-auto my-8">
        <CardHeader className="items-center">
           <AlertTriangle className="w-12 h-12 text-destructive mb-2" />
          <CardTitle>Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  const handleNewChat = () => {
    router.push('/messages/new'); 
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-2xl font-bold font-headline flex items-center">
              <MessageSquareText className="mr-3 w-7 h-7 text-primary" />
              Your Chats
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <UserPlus className="mr-2 h-4 w-4" /> New Chat
            </Button>
          </div>
          <CardDescription>
            Your direct messages with other users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search chats..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {filteredSessions.length > 0 ? (
              <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 mt-4">
                {filteredSessions.map(session => (
                  <ChatListItem key={session.id} session={session} currentUserUid={user.uid} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <MessageSquareText size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Chats Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start a conversation by clicking "New Chat" or from a user's profile.
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
