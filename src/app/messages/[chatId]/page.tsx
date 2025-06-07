
"use client";

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage } from '@/services/chatService'; // sendMessage is a Server Action
import { getChatMessages } from '@/services/chatSubscriptionService'; // getChatMessages is for client-side listeners
import type { ChatMessage, ChatParticipant } from '@/types/messaging';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation'; 
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble, getInitials } from '@/components/messaging/MessageBubble';


export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ChatParticipant | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = params.chatId;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !userProfile) {
      router.push('/login');
      return;
    }

    const fetchChatDetails = async () => {
      const chatDocRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatDocRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        if (chatData && chatData.participants) {
          const otherP = chatData.participants.find((p: ChatParticipant) => p.uid !== user.uid);
          setOtherParticipant(otherP || null);
        }
      } else {
        // Handle chat not found, maybe redirect
        console.error("Chat not found");
        router.push('/messages');
      }
    };
    fetchChatDetails();

    setIsLoadingMessages(true);
    const unsubscribe = getChatMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching chat messages:", error);
      setIsLoadingMessages(false);
      // Optionally show toast to user
    });

    return () => unsubscribe();
  }, [chatId, user, userProfile, authLoading, router]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !user || !userProfile || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(chatId, userProfile, newMessageText);
      setNewMessageText('');
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally show toast
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || (isLoadingMessages && messages.length === 0)) { // Show loader if auth is loading or if messages are loading and none are displayed yet
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) {
    // This case should be handled by the redirect in useEffect, but as a fallback:
    return <p className="text-center mt-8">Please log in to view messages.</p>;
  }

  return (
    <Card className="h-[calc(100vh-8rem-4rem)] md:h-[calc(100vh-8rem-1rem)] flex flex-col shadow-xl"> {/* Adjust height for header and potential footer/padding */}
      <CardHeader className="border-b p-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/messages')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {otherParticipant && (
            <Avatar>
              <AvatarImage src={otherParticipant.photoURL || undefined} alt={otherParticipant.displayName || 'User'} data-ai-hint="user avatar" />
              <AvatarFallback>{getInitials(otherParticipant.displayName)}</AvatarFallback>
            </Avatar>
          )}
          <div>
            <CardTitle className="text-lg">{otherParticipant?.displayName || 'Chat'}</CardTitle>
            {/* <CardDescription>Online</CardDescription> Placeholder */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-0.5"> {/* Reduced space-y for tighter bubbles */}
        {messages.length === 0 && !isLoadingMessages && (
          <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} currentUserId={user.uid} />
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            className="flex-1"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={!newMessageText.trim() || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
