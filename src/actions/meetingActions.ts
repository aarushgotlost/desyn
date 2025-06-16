
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, arrayUnion, doc, updateDoc, increment, getDoc, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import type { Meeting } from '@/types/data';

export async function startNewMeeting(
  creatorId: string,
  creatorName: string | null,
  title?: string
): Promise<{ success: boolean; message: string; meetingId?: string }> {
  if (!creatorId) {
    return { success: false, message: 'User not authenticated.' };
  }

  const meetingsColRef = collection(db, 'meetings');
  const meetingTitle = title || `New Meeting - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const creatorParticipant = {
    uid: creatorId,
    displayName: creatorName,
    photoURL: null, // This could be fetched if userProfile is passed fully
  };

  try {
    const newMeetingData: Omit<Meeting, 'id' | 'createdAt'> & { createdAt: any } = {
      title: meetingTitle,
      createdBy: creatorId,
      createdByName: creatorName,
      participants: [creatorParticipant],
      participantUids: [creatorId],
      isActive: true, 
      createdAt: serverTimestamp(),
    };

    const meetingDocRef = await addDoc(meetingsColRef, newMeetingData);
    revalidatePath('/meetings');
    return { success: true, message: 'Meeting started successfully!', meetingId: meetingDocRef.id };
  } catch (error: any) {
    console.error('Error starting new meeting:', error);
    return { success: false, message: error.message || 'Could not start meeting.' };
  }
}

export async function joinMeeting(
  meetingId: string,
  user: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>
): Promise<{ success: boolean; message: string }> {
  if (!user || !user.uid) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!meetingId) {
    return { success: false, message: 'Meeting ID is missing.' };
  }

  const meetingRef = doc(db, 'meetings', meetingId);

  try {
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists()) {
      return { success: false, message: 'Meeting not found.' };
    }
    const meetingData = meetingSnap.data() as Meeting;

    if (!meetingData.isActive) {
        return { success: false, message: 'This meeting has ended.' };
    }

    if (meetingData.participantUids?.includes(user.uid)) {
      return { success: true, message: 'Already in meeting.' }; 
    }

    const participantToAdd = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
    };

    await updateDoc(meetingRef, {
      participants: arrayUnion(participantToAdd),
      participantUids: arrayUnion(user.uid),
    });
    revalidatePath(`/meetings`);
    revalidatePath(`/meetings/${meetingId}`);
    return { success: true, message: 'Successfully joined meeting.' };
  } catch (error: any) {
    console.error('Error joining meeting:', error);
    return { success: false, message: error.message || 'Could not join meeting.' };
  }
}

export async function sendMeetingChatMessage(
  meetingId: string,
  senderProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>,
  text: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  if (!senderProfile.uid) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!meetingId) {
    return { success: false, message: 'Meeting ID is missing.' };
  }
  if (!text.trim()) {
    return { success: false, message: 'Message text cannot be empty.' };
  }

  const messagesColRef = collection(db, 'meetings', meetingId, 'chatMessages');

  try {
    const newMessageData = {
      meetingId,
      senderId: senderProfile.uid,
      senderName: senderProfile.displayName || 'Anonymous',
      senderAvatar: senderProfile.photoURL || null,
      text: text.trim(),
      createdAt: serverTimestamp() as Timestamp,
    };

    const messageDocRef = await addDoc(messagesColRef, newMessageData);
    
    // No revalidation needed here as chat is real-time
    return { success: true, message: 'Message sent!', messageId: messageDocRef.id };
  } catch (error: any) {
    console.error('Error sending meeting chat message:', error);
    return { success: false, message: error.message || 'Could not send message.' };
  }
}


export async function endMeeting(
  meetingId: string,
  userId: string // ID of the user attempting to end the meeting
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!meetingId) {
    return { success: false, message: 'Meeting ID is missing.' };
  }

  const meetingRef = doc(db, 'meetings', meetingId);

  try {
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists()) {
      return { success: false, message: 'Meeting not found.' };
    }

    const meetingData = meetingSnap.data() as Meeting;
    if (meetingData.createdBy !== userId) {
      return { success: false, message: 'Only the host can end the meeting.' };
    }

    if (!meetingData.isActive) {
      return { success: true, message: 'Meeting has already ended.' };
    }

    await updateDoc(meetingRef, {
      isActive: false,
      // endedAt: serverTimestamp(), // Optional: if you want to store when it ended
    });

    revalidatePath(`/meetings`);
    revalidatePath(`/meetings/${meetingId}`);
    return { success: true, message: 'Meeting ended successfully.' };
  } catch (error: any) {
    console.error('Error ending meeting:', error);
    return { success: false, message: error.message || 'Could not end meeting.' };
  }
}

    