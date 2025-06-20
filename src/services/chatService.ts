
'use server';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/contexts/AuthContext';
import type { ChatSession, ChatParticipant } from '@/types/messaging';
import { createNotification } from '@/services/notificationService';
import type { NotificationActor } from '@/types/notifications';
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
  getDoc,
  limit,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

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
  const sortedParticipantUids = [currentUserProfile.uid, otherUserProfile.uid].sort();

  // More direct query for an existing chat between these two users
  const q = query(
    chatsRef,
    where('participantUids', '==', sortedParticipantUids),
    limit(1) // Expect at most one such chat
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Existing chat found
    const existingChatDoc = querySnapshot.docs[0];
    return existingChatDoc.id;
  }

  // No existing chat, create a new one
  const currentUserParticipant = createParticipant(currentUserProfile);
  const otherUserParticipant = createParticipant(otherUserProfile);

  const newChatData: Omit<ChatSession, 'id'> = {
    participants: [currentUserParticipant, otherUserParticipant],
    participantUids: sortedParticipantUids, // Already sorted
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    lastMessageText: 'Chat started.',
    lastMessageAt: serverTimestamp() as Timestamp,
    lastMessageSenderId: '', // System message or leave empty
  };

  const chatDocRef = await addDoc(chatsRef, newChatData);
  
  // Revalidate paths that might display chat lists or previews
  revalidatePath('/messages');
  // If individual chat pages were server-rendered and might need revalidation, add:
  // revalidatePath(`/messages/${chatDocRef.id}`);
  
  return chatDocRef.id;
}

export async function sendMessage(
  chatId: string,
  senderProfile: UserProfile,
  text: string
): Promise<void> {
  if (!text.trim()) return;
  if (!senderProfile || !senderProfile.uid || !senderProfile.displayName) {
    console.error("Sender profile is incomplete for sending message notification.");
    // Potentially throw an error or return if sender display name is crucial
  }


  const chatDocRef = doc(db, 'chats', chatId);
  const messagesColRef = collection(chatDocRef, 'messages');

  const newMessage: {
    chatId: string;
    senderId: string;
    senderName: string | null;
    senderAvatar?: string | null;
    text: string;
    // createdAt will be added with serverTimestamp
  } = {
    chatId,
    senderId: senderProfile.uid,
    senderName: senderProfile.displayName,
    senderAvatar: senderProfile.photoURL,
    text: text.trim(),
  };

  const batch = writeBatch(db);

  const messageDocRef = doc(messagesColRef);
  batch.set(messageDocRef, { ...newMessage, createdAt: serverTimestamp() });

  batch.update(chatDocRef, {
    lastMessageText: text.trim(),
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderProfile.uid,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  revalidatePath(`/messages/${chatId}`);
  revalidatePath('/messages');

  // Create notifications for other participants
  try {
    const chatSnap = await getDoc(chatDocRef);
    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as ChatSession;
      // Ensure senderProfile.displayName is not null for the notification actor.
      // It's already checked above, but good to be defensive.
      const actorDisplayName = senderProfile.displayName || 'Someone';
      const actor: NotificationActor = {
        id: senderProfile.uid,
        displayName: actorDisplayName,
        avatarUrl: senderProfile.photoURL,
      };

      for (const participant of chatData.participants) {
        if (participant.uid !== senderProfile.uid) {
          await createNotification({
            userId: participant.uid,
            type: 'new_message',
            actor,
            message: `${actorDisplayName} sent you a new message.`,
            link: `/messages/${chatId}`,
            relatedEntityId: chatId,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error creating notification for new message:", error);
  }
}
