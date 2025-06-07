
// This file should NOT have 'use server';
import { db } from '@/lib/firebase';
import type { ChatMessage, ChatSession } from '@/types/messaging';
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
  onUpdate: (sessions: ChatSession[]) => void
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
  });

  return unsubscribe;
}

export function getChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  const messagesColRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limit(50)); // Get last 50 messages

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
    });
    onUpdate(messages);
  });

  return unsubscribe;
}
