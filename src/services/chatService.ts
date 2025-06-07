
'use server';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/contexts/AuthContext';
import type { ChatSession, ChatParticipant } from '@/types/messaging';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

// Helper to create participant objects
const createParticipant = (profile: UserProfile | ChatParticipant): ChatParticipant => ({
  uid: profile.uid,
  displayName: profile.displayName,
  photoURL: profile.photoURL,
});


export async function getOrCreateDirectChat(
  currentUserProfile: UserProfile,
  otherUserProfile: UserProfile
): Promise<string> {
  const chatsRef = collection(db, 'chats');
  // Query for existing chats involving both users
  const q = query(
    chatsRef,
    where('participantUids', 'array-contains', currentUserProfile.uid),
  );

  const querySnapshot = await getDocs(q);
  let existingChat: ChatSession | null = null;

  querySnapshot.forEach(docSnap => {
    const chat = docSnap.data() as ChatSession;
    if (chat.participantUids.includes(otherUserProfile.uid) && chat.participantUids.length === 2) {
      existingChat = { ...chat, id: docSnap.id };
    }
  });


  if (existingChat) {
    return existingChat.id;
  }

  // Create a new chat
  const currentUserParticipant = createParticipant(currentUserProfile);
  const otherUserParticipant = createParticipant(otherUserProfile);

  const newChatData: Omit<ChatSession, 'id'> = {
    participants: [currentUserParticipant, otherUserParticipant],
    participantUids: [currentUserProfile.uid, otherUserProfile.uid].sort(), // Sort for consistent querying
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    lastMessageText: 'Chat started.',
    lastMessageAt: serverTimestamp() as Timestamp,
    lastMessageSenderId: '', // System message or leave empty
  };

  const chatDocRef = await addDoc(chatsRef, newChatData);
  return chatDocRef.id;
}

export async function sendMessage(
  chatId: string,
  senderProfile: UserProfile,
  text: string
): Promise<void> {
  if (!text.trim()) return;

  const chatDocRef = doc(db, 'chats', chatId);
  const messagesColRef = collection(chatDocRef, 'messages');

  const newMessage: {
    chatId: string;
    senderId: string;
    senderName: string | null;
    senderAvatar?: string | null;
    text: string;
    // createdAt will be added with serverTimestamp
  } = { // Omitting 'id' and 'createdAt' from type as they are handled by Firestore/auto-gen
    chatId,
    senderId: senderProfile.uid,
    senderName: senderProfile.displayName,
    senderAvatar: senderProfile.photoURL,
    text: text.trim(),
  };

  const batch = writeBatch(db);

  // Add new message
  const messageDocRef = doc(messagesColRef); // Auto-generate ID
  batch.set(messageDocRef, { ...newMessage, createdAt: serverTimestamp() });

  // Update chat session's last message details
  batch.update(chatDocRef, {
    lastMessageText: text.trim(),
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderProfile.uid,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
