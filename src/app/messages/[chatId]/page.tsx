
"use client";

import { use, useEffect, useState, useRef, FormEvent } from 'react'; 
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage } from '@/services/chatService'; 
import { getChatMessages } from '@/services/chatSubscriptionService'; 
import type { ChatMessage, ChatParticipant } from '@/types/messaging';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ArrowLeft, Film } from 'lucide-react'; // Film icon
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { getInitials } from '@/lib/utils';
import Link from 'next/link'; // Link component

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ChatParticipant | null>(null);
  
  const chatContentRef = useRef<HTMLDivElement>(null);
  const initialLoadDoneRef = useRef(false);

  const resolvedParams = use(params as unknown as Promise<{ chatId: string }>);
  const chatId = resolvedParams.chatId;

  useEffect(() => {
    const scrollableElement = chatContentRef.current;
    if (!scrollableElement) return;

    if (!isLoadingMessages && !initialLoadDoneRef.current && messages.length > 0) {
      scrollableElement.scrollTop = scrollableElement.scrollHeight;
      initialLoadDoneRef.current = true;
    } else if (initialLoadDoneRef.current && messages.length > 0) {
      const isNearBottom = scrollableElement.scrollHeight - scrollableElement.scrollTop <= scrollableElement.clientHeight + 200; 
      const lastMessage = messages[messages.length - 1];
      const lastMessageIsOurs = lastMessage && user && lastMessage.senderId === user.uid;

      if (isNearBottom || lastMessageIsOurs) {
          const timer = setTimeout(() => {
              if (scrollableElement) { 
                scrollableElement.scrollTop = scrollableElement.scrollHeight;
              }
          }, 0);
          return () => clearTimeout(timer);
      }
    }
  }, [messages, isLoadingMessages, user]);


  useEffect(() => {
    if (authLoading || !chatId) return; 
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
        router.push('/messages');
      }
    };
    fetchChatDetails();

    setIsLoadingMessages(true);
    initialLoadDoneRef.current = false; 
    const unsubscribe = getChatMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [chatId, user, userProfile, authLoading, router]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !user || !userProfile || isSending || !chatId) return;

    setIsSending(true);
    try {
      await sendMessage(chatId, userProfile, newMessageText);
      setNewMessageText('');
    } catch (error) {
      // console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || (isLoadingMessages && messages.length === 0 && !otherParticipant)) { 
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <p className="text-center mt-8">Please log in to view messages.</p>;
  }

  return (
    <Card className="h-[calc(100vh-8rem-4rem)] md:h-[calc(100vh-8rem-1rem)] flex flex-col shadow-xl">
      <CardHeader className="border-b p-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/messages')} aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {otherParticipant && (
            <Avatar>
              <AvatarImage src={otherParticipant.photoURL || undefined} alt={otherParticipant.displayName || 'User avatar'} data-ai-hint="chat partner avatar" />
              <AvatarFallback>{getInitials(otherParticipant.displayName)}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1">
            <CardTitle className="text-lg">{otherParticipant?.displayName || 'Chat'}</CardTitle>
          </div>
          <Button variant="outline" size="icon" asChild title="Go to Meeting Room">
            <Link href="/meeting-room">
              <Film className="h-5 w-5" />
              <span className="sr-only">Go to Meeting Room</span>
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent ref={chatContentRef} className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {messages.length === 0 && !isLoadingMessages && (
          <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} currentUserId={user.uid} />
        ))}
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            className="flex-1"
            disabled={isSending || !chatId}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={!newMessageText.trim() || isSending || !chatId} aria-label="Send message">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
