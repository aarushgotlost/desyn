
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Community } from '@/types/data';
import type { UserProfile } from '@/contexts/AuthContext'; // For senderProfile

export async function toggleCommunityMembership(
  communityId: string,
  userId: string
): Promise<{ success: boolean; message: string; isJoined?: boolean }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!communityId) {
    return { success: false, message: 'Community ID is missing.' };
  }

  const communityRef = doc(db, 'communities', communityId);

  try {
    const communitySnap = await getDoc(communityRef);
    if (!communitySnap.exists()) {
      return { success: false, message: 'Community not found.' };
    }

    const communityData = communitySnap.data() as Community;
    const isCurrentlyMember = communityData.members?.includes(userId);

    if (isCurrentlyMember) {
      // User wants to leave
      await updateDoc(communityRef, {
        members: arrayRemove(userId),
        memberCount: increment(-1),
      });
      revalidatePath(`/communities/${communityId}`);
      revalidatePath(`/communities`); // Also revalidate the list page
      return { success: true, message: 'Successfully left community.', isJoined: false };
    } else {
      // User wants to join
      await updateDoc(communityRef, {
        members: arrayUnion(userId),
        memberCount: increment(1),
      });
      revalidatePath(`/communities/${communityId}`);
      revalidatePath(`/communities`);
      return { success: true, message: 'Successfully joined community.', isJoined: true };
    }
  } catch (error: any) {
    console.error('Error toggling community membership:', error);
    return { success: false, message: error.message || 'Could not update membership.' };
  }
}


export async function sendCommunityMessage(
  communityId: string,
  senderProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>, // Use Pick for only necessary fields
  text: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  if (!senderProfile.uid) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!communityId) {
    return { success: false, message: 'Community ID is missing.' };
  }
  if (!text.trim()) {
    return { success: false, message: 'Message text cannot be empty.' };
  }

  const messagesColRef = collection(db, 'communities', communityId, 'messages');

  try {
    const newMessageData = {
      communityId,
      senderId: senderProfile.uid,
      senderName: senderProfile.displayName || 'Anonymous',
      senderAvatar: senderProfile.photoURL || null,
      text: text.trim(),
      createdAt: serverTimestamp() as Timestamp,
    };

    const messageDocRef = await addDoc(messagesColRef, newMessageData);
    
    // Optionally, update community's last message info (not revalidating path here as it's real-time)
    // const communityRef = doc(db, 'communities', communityId);
    // await updateDoc(communityRef, {
    //   lastMessageAt: serverTimestamp(),
    //   lastMessageText: text.trim().substring(0, 50), // Store a snippet
    // });

    return { success: true, message: 'Message sent!', messageId: messageDocRef.id };
  } catch (error: any) {
    console.error('Error sending community message:', error);
    return { success: false, message: error.message || 'Could not send message.' };
  }
}
