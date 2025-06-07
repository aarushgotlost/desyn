
"use client";

import type { ChatMessage } from '@/types/messaging'; // Assuming ChatMessage can be a base for CommunityChatMessage too
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const nameParts = name.split(' ').filter(Boolean);
  if (nameParts.length === 0) return '?';
  return nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

interface MessageBubbleProps {
  message: { // Can be ChatMessage or CommunityChatMessage
    id: string;
    senderId: string;
    senderName: string | null;
    senderAvatar?: string | null;
    text: string;
    createdAt: any; // Firestore Timestamp or Date
  };
  currentUserId: string;
  isCommunityChat?: boolean; // To slightly alter styling or info if needed
}

export function MessageBubble({ message, currentUserId, isCommunityChat = false }: MessageBubbleProps) {
  const isCurrentUser = message.senderId === currentUserId;

  let messageTimestamp = 'Sending...';
  if (message.createdAt) {
    if (message.createdAt.toDate) { // Firestore Timestamp
      messageTimestamp = format(message.createdAt.toDate(), 'p');
    } else if (message.createdAt instanceof Date) { // Already a JS Date
      messageTimestamp = format(message.createdAt, 'p');
    } else { // Fallback for other potential date representations
      try {
        messageTimestamp = format(new Date(message.createdAt), 'p');
      } catch (e) {
        // Keep 'Sending...' or some error indicator
      }
    }
  }
  
  return (
    <div className={`flex items-start space-x-2 py-2 ${isCurrentUser ? 'justify-end' : ''}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName || 'User'} data-ai-hint="user avatar" />
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
          isCurrentUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground border rounded-bl-none'
        }`}
      >
        {!isCurrentUser && isCommunityChat && (
           <p className="text-xs font-medium mb-0.5 text-muted-foreground">{message.senderName || "User"}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70 text-left'}`}>
          {messageTimestamp}
        </p>
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName || 'User'} data-ai-hint="user avatar" />
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
