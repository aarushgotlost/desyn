
import { db } from '@/lib/firebase';
import type { ChatMessage, ChatSession, CommunityChatMessage, MeetingChatMessage } from '@/types/messaging';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  QuerySnapshot,
  DocumentData,
  Timestamp, 
} from 'firebase/firestore';

// Helper to convert Firestore Timestamps in a session object to ISO strings
const processChatSessionData = (docSnap: DocumentData): ChatSession => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date(data.createdAt).toISOString(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate ? (data.updatedAt as Timestamp).toDate().toISOString() : new Date(data.updatedAt).toISOString(),
    lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate ? (data.lastMessageAt as Timestamp).toDate().toISOString() : undefined,
  } as ChatSession;
};

// Helper to convert Firestore Timestamps in a message object to ISO strings
const processChatMessageData = (docSnap: DocumentData): ChatMessage => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date(data.createdAt).toISOString(),
  } as ChatMessage;
};

const processCommunityChatMessageData = (docSnap: DocumentData): CommunityChatMessage => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date(data.createdAt).toISOString(),
  } as CommunityChatMessage;
};

const processMeetingChatMessageData = (docSnap: DocumentData): MeetingChatMessage => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date(data.createdAt).toISOString(),
  } as MeetingChatMessage;
};


export function getUserChatSessions(
  userId: string,
  onUpdate: (sessions: ChatSession[]) => void,
  onError?: (error: Error) => void 
): () => void {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participantUids', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const sessions: ChatSession[] = querySnapshot.docs.map(processChatSessionData);
    onUpdate(sessions);
  },
  (error) => { 
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
  onError?: (error: Error) => void 
): () => void {
  const messagesColRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limit(100)); 

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages: ChatMessage[] = querySnapshot.docs.map(processChatMessageData);
    onUpdate(messages);
  },
  (error) => { 
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
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limit(100)); 

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages: CommunityChatMessage[] = querySnapshot.docs.map(processCommunityChatMessageData);
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

export function getMeetingChatMessages(
  meetingId: string,
  onUpdate: (messages: MeetingChatMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  const messagesColRef = collection(db, 'meetings', meetingId, 'chatMessages');
  const q = query(messagesColRef, orderBy('createdAt', 'asc'), limit(100));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const messages: MeetingChatMessage[] = querySnapshot.docs.map(processMeetingChatMessageData);
    onUpdate(messages);
  },
  (error) => {
    console.error("Error in getMeetingChatMessages snapshot: ", error);
    if (onError) {
      onError(error);
    }
  });

  return unsubscribe;
}
