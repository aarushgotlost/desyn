
"use client";

import type { ChatMessage, CommunityChatMessage, MeetingChatMessage } from '@/types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useTransition } from 'react';
import { deleteChatMessage } from '@/actions/chatActions'; 
import { useToast } from '@/hooks/use-toast';

interface BaseMessage {
  id: string;
  senderId: string;
  senderName: string | null;
  senderAvatar?: string | null;
  text: string;
  createdAt: string; // ISO string
}
interface MessageBubbleProps {
  message: BaseMessage & { chatId?: string; communityId?: string; meetingId?: string }; // Union of possible message types
  currentUserId: string;
  isCommunityChat?: boolean; 
  isMeetingChat?: boolean;
}

export function MessageBubble({ message, currentUserId, isCommunityChat = false, isMeetingChat = false }: MessageBubbleProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  let messageTimestamp = 'Sending...';
  if (message.createdAt) {
    try {
      const dateToFormat = new Date(message.createdAt);
      if (!isNaN(dateToFormat.getTime())) {
         messageTimestamp = format(dateToFormat, 'p'); 
      }
    } catch (e) {
      // Error parsing date
    }
  }

  const canDelete = isCurrentUser && !isCommunityChat && !isMeetingChat && message.chatId;

  const handleDelete = async () => {
    if (!canDelete || !message.chatId || isDeleting || isPending) return; 

    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteChatMessage(message.chatId as string, message.id, currentUserId);
      if (result.success) {
        // UI update will be handled by real-time subscription
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsDeleting(false);
    });
  };
  
  return (
    <div className={`group flex items-start space-x-2 py-2 ${isCurrentUser ? 'justify-end' : ''}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName || 'User avatar'} data-ai-hint="sender avatar small" />
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`relative max-w-[70%] p-3 rounded-xl shadow-sm ${
          isCurrentUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground border rounded-bl-none'
        }`}
      >
        {!isCurrentUser && (isCommunityChat || isMeetingChat) && (
           <p className="text-xs font-medium mb-0.5 text-muted-foreground">{message.senderName || "User"}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70 text-left'}`}>
          {messageTimestamp}
        </p>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`absolute -top-2 -left-2 h-6 w-6 p-0.5 rounded-full bg-card/80 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${isCurrentUser ? '-right-2 -left-auto' : '-left-2 -right-auto'}`}
                disabled={isDeleting || isPending}
                aria-label="Delete message"
              >
                {isDeleting || isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this message. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting || isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting || isPending} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName || 'User avatar'} data-ai-hint="current user avatar small" />
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
