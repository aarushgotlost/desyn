
"use client";

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { getCommunityChatMessages } from '@/services/chatSubscriptionService';
import { sendCommunityMessage } from '@/actions/communityActions';
import type { CommunityChatMessage } from '@/types/messaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageSquareText } from 'lucide-react';
import { MessageBubble } from '@/components/messaging/MessageBubble'; // Reusable MessageBubble
import { useToast } from '@/hooks/use-toast';

interface CommunityChatInterfaceProps {
  communityId: string;
}

export function CommunityChatInterface({ communityId }: CommunityChatInterfaceProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CommunityChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!communityId || authLoading) return;

    // User must be logged in to participate or view community chat
    if (!user || !userProfile) {
      setIsLoadingMessages(false); // Stop loading if user is not authenticated
      return;
    }

    setIsLoadingMessages(true);
    const unsubscribe = getCommunityChatMessages(
      communityId,
      (newMessages) => {
        setMessages(newMessages);
        setIsLoadingMessages(false);
      },
      (error) => {
        console.error("Error fetching community messages:", error);
        toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
        setIsLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [communityId, user, userProfile, authLoading, toast]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !user || !userProfile || isSending) return;

    setIsSending(true);
    try {
      const senderInfo = {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
      };
      const result = await sendCommunityMessage(communityId, senderInfo, newMessageText);
      if (result.success) {
        setNewMessageText('');
      } else {
        toast({ title: "Error", description: result.message || "Could not send message.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <MessageSquareText size={48} className="mx-auto mb-4 opacity-50" />
        <p>Please log in to join the community chat.</p>
      </div>
    );
  }
  
  // If still loading messages and there are none yet, show loader
  if (isLoadingMessages && messages.length === 0) {
     return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-20rem)] md:h-[calc(100vh-18rem)] border rounded-lg shadow-inner bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {messages.length === 0 && !isLoadingMessages && (
          <p className="text-center text-muted-foreground py-8">
            No messages in this community yet. Be the first to say something!
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            currentUserId={user.uid}
            isCommunityChat={true}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4 bg-muted/50">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            className="flex-1 bg-background"
            disabled={isSending}
            aria-label="Community chat message input"
          />
          <Button type="submit" size="icon" disabled={!newMessageText.trim() || isSending} aria-label="Send message">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
