
// This file should NOT have 'use server';
import { db } from '@/lib/firebase';
import type { ChatMessage, ChatSession, CommunityChatMessage } from '@/types/messaging';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  QuerySnapshot,
  DocumentData,
  doc, 
} from 'firebase/firestore';

export function getUserChatSessions(
  userId: string,
  onUpdate: (sessions: ChatSession[]) => void,
  onError?: (error: Error) => void // Optional error callback
): () => void {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participantUids', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const sessions: ChatSession[] = [];
    querySnapshot.forEach((docSnap) => {
      sessions.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
    });
    onUpdate(sessions);
  },
  (error) => { // Firestore onSnapshot error handling
    console.error("Error in getUserChatSessions snapshot: ", error);
    if (onError) {
      onError(error);
    }
  });

  return unsubscribe;
}

export function getChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void // Optional error callback
): () => void {
  const messagesColRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limit(100)); // Get last 100 messages

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
    });
    onUpdate(messages);
  },
  (error) => { // Firestore onSnapshot error handling
    console.error("Error in getChatMessages snapshot: ", error);
    if (onError) {
      onError(error);
    }
  });

  return unsubscribe;
}


export function getCommunityChatMessages(
  communityId: string,
  onUpdate: (messages: CommunityChatMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  const messagesColRef = collection(db, 'communities', communityId, 'messages');
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limit(100)); // Get last 100 messages

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages: CommunityChatMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() } as CommunityChatMessage);
    });
    onUpdate(messages);
  },
  (error) => {
    console.error("Error in getCommunityChatMessages snapshot: ", error);
    if (onError) {
      onError(error);
    }
  });

  return unsubscribe;
}
