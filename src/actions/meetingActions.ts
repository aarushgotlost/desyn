
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  getDoc,
  collection,
  arrayRemove,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';
import type { Meeting, MeetingParticipant } from '@/types/data';
import { DEFAULT_100MS_ROOM_ID, USER_ROLES_100MS } from '@/lib/constants';
import { generate100msToken, type GenerateTokenInput, type GenerateTokenOutput } from '@/ai/flows/generate100msTokenFlow';

export async function createMeetingSession(
  title: string,
  description: string | undefined,
  hostProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>
): Promise<{ success: boolean; message: string; meetingId?: string }> {
  if (!hostProfile.uid) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!title.trim()) {
    return { success: false, message: 'Meeting title cannot be empty.' };
  }

  const initialParticipant: MeetingParticipant = {
    uid: hostProfile.uid,
    displayName: hostProfile.displayName,
    photoURL: hostProfile.photoURL,
    role: USER_ROLES_100MS.SPEAKER, // Host is typically a speaker
    joinedAt: new Date().toISOString(), // Client-generated timestamp for initial participant in an array
  };

  const newMeetingData: Omit<Meeting, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
    title: title.trim(),
    description: description?.trim() || '',
    roomId100ms: DEFAULT_100MS_ROOM_ID, // Use the default room ID from constants
    hostUid: hostProfile.uid,
    hostProfile: {
      uid: hostProfile.uid,
      displayName: hostProfile.displayName,
      photoURL: hostProfile.photoURL,
    },
    participants: [initialParticipant],
    participantUids: [hostProfile.uid],
    isActive: true,
    createdAt: serverTimestamp() as Timestamp,
  };

  try {
    const meetingsColRef = collection(db, 'meetings');
    const meetingDocRef = await addDoc(meetingsColRef, newMeetingData);
    revalidatePath('/meetings');
    return { success: true, message: 'Meeting created successfully.', meetingId: meetingDocRef.id };
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return { success: false, message: error.message || 'Could not create meeting.' };
  }
}

export async function joinMeetingSession(
  meetingId: string,
  userProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>,
  role: string = USER_ROLES_100MS.LISTENER // Default role for joining
): Promise<{ success: boolean; message: string }> {
  if (!userProfile.uid) {
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

    const participant: MeetingParticipant = {
      uid: userProfile.uid,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      role: role,
      joinedAt: serverTimestamp() as unknown as string, // Firestore handles serverTimestamp in arrayUnion
    };

    await updateDoc(meetingRef, {
      participants: arrayUnion(participant),
      participantUids: arrayUnion(userProfile.uid),
    });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/meetings');
    return { success: true, message: 'Successfully joined meeting.' };
  } catch (error: any) {
    console.error('Error joining meeting:', error);
    return { success: false, message: error.message || 'Could not join meeting.' };
  }
}

export async function endMeetingSession(
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
    if (meetingSnap.data()?.hostUid !== userId) {
      return { success: false, message: 'Only the host can end the meeting.' };
    }

    await updateDoc(meetingRef, {
      isActive: false,
      endedAt: serverTimestamp(),
    });
    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath('/meetings');
    return { success: true, message: 'Meeting ended.' };
  } catch (error: any) {
    console.error('Error ending meeting:', error);
    return { success: false, message: error.message || 'Could not end meeting.' };
  }
}


export async function get100msTokenAction(
  userId: string,
  roomId100ms: string,
  role: string
): Promise<GenerateTokenOutput> {
  if (!userId || !roomId100ms || !role) {
    return { error: "User ID, Room ID, and Role are required.", message: "Ensure all parameters are provided." };
  }

  const input: GenerateTokenInput = { userId, roomId: roomId100ms, role };
  try {
    const result = await generate100msToken(input);
    return result;
  } catch (error: any) {
    console.error("Error calling generate100msToken flow:", error);
    return { error: "Failed to process token request.", message: error.message || "Unknown error in Genkit flow." };
  }
}
