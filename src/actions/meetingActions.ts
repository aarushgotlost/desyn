
'use server';

import { db } from '@/lib/firebase';
import { doc, addDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp, getDoc, collection } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import type { Meeting, MeetingParticipant } from '@/types/data';

export async function createMeetingAction(
  title: string,
  hostProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>
): Promise<{ success: boolean; message: string; meetingId?: string }> {
  if (!hostProfile || !hostProfile.uid) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!title.trim()) {
    return { success: false, message: 'Meeting title cannot be empty.' };
  }

  const meetingsColRef = collection(db, 'meetings');
  try {
    // Construct the initial participant with a client-side timestamp for 'joinedAt'
    const initialParticipantForFirestore = {
      uid: hostProfile.uid,
      displayName: hostProfile.displayName,
      photoURL: hostProfile.photoURL,
      joinedAt: new Date(), // Use client's current time for the host's initial join
    };

    const newMeetingData: Omit<Meeting, 'id' | 'createdAt' | 'participants'> & {
      createdAt: Timestamp;
      // For the initial data, joinedAt will be a Date object, which Firestore converts to Timestamp.
      // Our MeetingParticipant type expects a string (ISO) on read, handled by processDoc.
      participants: Array<Omit<MeetingParticipant, 'joinedAt'> & { joinedAt: Date }>;
    } = {
      title: title.trim(),
      createdBy: hostProfile.uid,
      hostProfile: {
        uid: hostProfile.uid,
        displayName: hostProfile.displayName,
        photoURL: hostProfile.photoURL,
      },
      isActive: true,
      participants: [initialParticipantForFirestore],
      createdAt: serverTimestamp() as Timestamp,
    };

    const meetingDocRef = await addDoc(meetingsColRef, newMeetingData);
    revalidatePath('/meetings');
    return { success: true, message: 'Meeting created successfully!', meetingId: meetingDocRef.id };
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return { success: false, message: error.message || 'Could not create meeting.' };
  }
}

export async function joinMeetingAction(
  meetingId: string,
  userProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>
): Promise<{ success: boolean; message: string }> {
  if (!userProfile || !userProfile.uid) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!meetingId) {
    return { success: false, message: 'Meeting ID is missing.' };
  }

  const meetingRef = doc(db, 'meetings', meetingId);
  try {
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists() || !meetingSnap.data()?.isActive) {
      return { success: false, message: 'Meeting not found or has ended.' };
    }
    
    const meetingData = meetingSnap.data() as Meeting;
    const isAlreadyParticipant = meetingData.participants.some(p => p.uid === userProfile.uid);

    if (isAlreadyParticipant) {
      return { success: true, message: 'Already a participant. You can join the video call.' };
    }

    // For arrayUnion, serverTimestamp() should be fine as it's an update operation.
    // If this also causes issues, we'd change it to new Date().toISOString() or new Date().
    const newParticipantForFirestore = {
      uid: userProfile.uid,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      joinedAt: serverTimestamp(), 
    };

    await updateDoc(meetingRef, {
      participants: arrayUnion(newParticipantForFirestore),
    });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/meetings');
    return { success: true, message: 'Successfully joined meeting.' };
  } catch (error: any) {
    console.error('Error joining meeting:', error);
    return { success: false, message: error.message || 'Could not join meeting.' };
  }
}

export async function endMeetingAction(
  meetingId: string,
  userId: string
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

    await updateDoc(meetingRef, {
      isActive: false,
    });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/meetings');
    return { success: true, message: 'Meeting ended successfully.' };
  } catch (error: any) {
    console.error('Error ending meeting:', error);
    return { success: false, message: error.message || 'Could not end meeting.' };
  }
}
