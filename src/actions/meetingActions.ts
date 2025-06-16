
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, arrayUnion, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
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
  const meetingTitle = title || `New Meeting - ${new Date().toLocaleTimeString()}`;

  const creatorParticipant = {
    uid: creatorId,
    displayName: creatorName,
    photoURL: null, // Basic info, can be expanded if full profile is passed
  };

  try {
    const newMeetingData: Omit<Meeting, 'id' | 'createdAt'> & { createdAt: any } = {
      title: meetingTitle,
      createdBy: creatorId,
      createdByName: creatorName,
      participants: [creatorParticipant],
      participantUids: [creatorId],
      isActive: true, // Default to active when created
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

    if (meetingData.participantUids?.includes(user.uid)) {
      return { success: true, message: 'Already in meeting.' }; // Or a different message
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
