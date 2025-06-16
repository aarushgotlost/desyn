
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

  console.warn(
      `SECURITY WARNING (ACTION BYPASS): Token generation is simulated for room ${roomId100ms}, user ${userId}, role ${role}.` +
      ` This is NOT for production. A real backend is required for secure token generation.`
  );
  
  const PROTOTYPE_GUEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoyLCJ0eXBlIjoiYXBwIiwiYXBwX2RhdGEiOm51bGwsImFjY2Vzc19rZXkiOiI2ODUwMTAyMGJkMGRhYjVmOWEwMTI4YWQiLCJyb2xlIjoiZ3Vlc3QiLCJyb29tX2lkIjoiNjg1MDEzMDVhNDhjYTYxYzQ2NDc0MGU3IiwidXNlcl9pZCI6ImEyY2FhYjcyLTMxOWEtNDI5YS05MTkwLTM2OWJhYTI0NDhjOCIsImV4cCI6MTc1MDE2NTQ0MCwianRpIjoiYjc5Y2EyMjctNTVjZS00MmNmLTg0NjEtYzRmNTA3N2QwMDFkIiwiaWF0IjoxNzUwMDc5MDQwLCJpc3MiOiI2ODUwMTAyMGJkMGRhYjVmOWEwMTI4YWIiLCJuYmYiOjE3NTAwNzkwNDAsInN1YiI6ImFwaSJ9.0ALU1v2WrZo8phrYvky1vX-yLtyXkOJ0i785LRtK2jk";

  if (role === USER_ROLES_100MS.LISTENER) { // 'guest'
    return {
      token: PROTOTYPE_GUEST_TOKEN,
      message: "Using a hardcoded prototype GUEST token (from action bypass). This is insecure and for development testing only. Ensure this token matches the Room ID and has 'guest' role permissions on your 100ms dashboard."
    };
  } else if (role === USER_ROLES_100MS.SPEAKER) { // 'host'
    // We don't have a hardcoded host token. So, we must prompt for it.
    return {
      // token: undefined, // Explicitly no token is provided by the action for hosts
      error: "Host-specific token required.",
      message: "You are joining as a HOST. The current prototype only has an automatic GUEST token. Please obtain a HOST-specific auth token from your 100ms Dashboard for the configured Room ID and paste it into the UI. This is a prototype limitation for host roles."
    };
  }

  // Fallback for any other roles or issues
  return {
    error: `Token generation is simulated for role: ${role}. This role is not configured for automatic prototype token.`,
    message: "A secure backend is required for real token generation for all roles. Ensure your requested role is either 'guest' or 'host' as defined in constants."
  };
}
