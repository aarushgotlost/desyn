
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache'; // May not be strictly necessary due to real-time updates
import type { ChatMessage } from '@/types/messaging';


async function updateChatLastMessage(chatId: string, batch?: FirebaseFirestore.WriteBatch) {
  const messagesColRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesColRef, orderBy('createdAt', 'desc'), limit(1));
  const lastMessageSnapshot = await getDocs(q);

  const chatDocRef = doc(db, 'chats', chatId);
  let updateData: any = { updatedAt: serverTimestamp() };

  if (!lastMessageSnapshot.empty) {
    const lastMessage = lastMessageSnapshot.docs[0].data() as ChatMessage;
    updateData.lastMessageText = lastMessage.text;
    updateData.lastMessageAt = lastMessage.createdAt instanceof Timestamp ? lastMessage.createdAt : serverTimestamp(); // Ensure it's a timestamp
    updateData.lastMessageSenderId = lastMessage.senderId;
  } else {
    // No messages left or if preferred, set to a specific state
    updateData.lastMessageText = 'No messages yet.';
    updateData.lastMessageAt = serverTimestamp();
    updateData.lastMessageSenderId = ''; // Or a system ID
  }
  
  if (batch) {
      batch.update(chatDocRef, updateData);
  } else {
      await updateDoc(chatDocRef, updateData);
  }
}


export async function deleteChatMessage(
  chatId: string,
  messageId: string,
  currentUserId: string
): Promise<{ success: boolean; message: string }> {
  if (!currentUserId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!chatId || !messageId) {
    return { success: false, message: 'Chat ID or Message ID is missing.' };
  }

  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

  try {
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      return { success: false, message: 'Message not found.' };
    }

    const messageData = messageSnap.data() as ChatMessage;
    if (messageData.senderId !== currentUserId) {
      return { success: false, message: 'User not authorized to delete this message.' };
    }

    const batch = writeBatch(db);
    batch.delete(messageRef); // Delete the message

    // After preparing the delete in batch, update the last message info also in batch
    // This updateChatLastMessage now needs to be adapted or called carefully
    // For simplicity, we'll fetch the new last message *after* the batch commit
    // However, a more robust way involves either a transaction or ensuring the update logic
    // doesn't rely on the just-deleted message.

    // Let's try to get the *second to last* message *before* deleting,
    // or handle it after commit. Simpler for now: update after commit.
    
    await batch.commit();

    // Now, update the chat's last message details
    await updateChatLastMessage(chatId);


    // Revalidation might not be strictly needed if using real-time listeners for messages
    // but can be useful if there are server-rendered components displaying chat previews.
    revalidatePath(`/messages/${chatId}`);
    revalidatePath('/messages'); // For the chat list page

    return { success: true, message: 'Message deleted.' };
  } catch (error: any) {
    console.error('Error deleting chat message:', error);
    return { success: false, message: error.message || 'Could not delete message.' };
  }
}
