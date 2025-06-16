
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
    // Construct the initial participant directly for clarity
    const initialParticipantForFirestore = {
      uid: hostProfile.uid,
      displayName: hostProfile.displayName, // This can be null if user's profile displayName is null
      photoURL: hostProfile.photoURL,       // This can be null
      joinedAt: serverTimestamp(), // Use serverTimestamp() directly
    };

    const newMeetingData: Omit<Meeting, 'id' | 'createdAt' | 'participants'> & { 
      createdAt: Timestamp; 
      participants: Array<Omit<MeetingParticipant, 'joinedAt'> & { joinedAt: any }>; // Allow 'any' for serverTimestamp on write
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
      // If they are already a participant (e.g. host, or joined before), just confirm success.
      // The UI on the meeting page should then allow them to connect to Jitsi.
      return { success: true, message: 'Already a participant. You can join the video call.' };
    }

    const newParticipantForFirestore = {
      uid: userProfile.uid,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      joinedAt: serverTimestamp(), // Use serverTimestamp() directly
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

    
