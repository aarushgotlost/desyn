
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
// Import the types from the flow file, but not the flow function itself for this bypass
import type { GenerateTokenInput, GenerateTokenOutput } from '@/ai/flows/generate100msTokenFlow';

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
    joinedAt: new Date().toISOString(), 
  };

  const newMeetingData: Omit<Meeting, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
    title: title.trim(),
    description: description?.trim() || '',
    roomId100ms: DEFAULT_100MS_ROOM_ID, 
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
  role: string = USER_ROLES_100MS.LISTENER 
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
      joinedAt: serverTimestamp() as unknown as string, 
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

  // --- TEMPORARY PROTOTYPE BYPASS for Genkit API key error ---
  console.warn(
      `SECURITY WARNING (ACTION BYPASS): Using a hardcoded prototype 100ms token for room ${roomId100ms}, user ${userId}, role ${role}.` +
      ` This is NOT for production. A real backend is required for secure token generation.`
  );
  // This is the token provided by the user.
  const PROTOTYPE_GUEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoyLCJ0eXBlIjoiYXBwIiwiYXBwX2RhdGEiOm51bGwsImFjY2Vzc19rZXkiOiI2ODUwMTAyMGJkMGRhYjVmOWEwMTI4YWQiLCJyb2xlIjoiZ3Vlc3QiLCJyb29tX2lkIjoiNjg1MDEzMDVhNDhjYTYxYzQ2NDc0MGU3IiwidXNlcl9pZCI6ImEyY2FhYjcyLTMxOWEtNDI5YS05MTkwLTM2OWJhYTI0NDhjOCIsImV4cCI6MTc1MDE2NTQ0MCwianRpIjoiYjc5Y2EyMjctNTVjZS00MmNmLTg0NjEtYzRmNTA3N2QwMDFkIiwiaWF0IjoxNzUwMDc5MDQwLCJpc3MiOiI2ODUwMTAyMGJkMGRhYjVmOWEwMTI4YWIiLCJuYmYiOjE3NTAwNzkwNDAsInN1YiI6ImFwaSJ9.0ALU1v2WrZo8phrYvky1vX-yLtyXkOJ0i785LRtK2jk";

  if (role === USER_ROLES_100MS.LISTENER || role === USER_ROLES_100MS.SPEAKER) { // Using constants for roles
    return {
      token: PROTOTYPE_GUEST_TOKEN,
      message: "Using a hardcoded prototype token (from action bypass due to Genkit config). This is insecure and for development testing only. Replace with real backend token generation for production."
    };
  }
  return {
    error: "Token generation is simulated for this role (from action bypass).",
    message: "For this prototype, a hardcoded token is used for 'guest'/'host'. A secure backend is required for real token generation for all roles."
  };
  // --- END TEMPORARY PROTOTYPE BYPASS ---

  // Original code to call Genkit flow (will be bypassed by the above for now)
  // const input: GenerateTokenInput = { userId, roomId: roomId100ms, role };
  // try {
  //   const result = await generate100msToken(input); // generate100msToken is the flow wrapper
  //   return result;
  // } catch (error: any) {
  //   console.error("Error calling generate100msToken flow:", error);
  //   return { error: "Failed to process token request.", message: error.message || "Unknown error in Genkit flow." };
  // }
}

