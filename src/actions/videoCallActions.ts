
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';
import type { VideoCallSession } from '@/types/data';
import { createNotification } from '@/services/notificationService';
import { USER_ROLES_100MS, DEFAULT_100MS_ROOM_ID } from '@/lib/constants';


interface InitiateCallResult {
  success: boolean;
  callId?: string; // This is our Firestore document ID
  message: string;
}

// This function creates OUR application's record of a call session.
// It does NOT interact with 100ms API directly.
export async function initiateVideoCall(
  calleeId: string,
  callerProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL' | 'fcmTokens'>,
  calleeProfile: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL' | 'fcmTokens'>
): Promise<InitiateCallResult> {
  if (!callerProfile.uid) {
    return { success: false, message: 'Caller not authenticated.' };
  }
  if (callerProfile.uid === calleeId) {
    return { success: false, message: 'Cannot call yourself.' };
  }

  const videoCallsRef = collection(db, 'videoCalls');
  const newCallData: Omit<VideoCallSession, 'id' | 'createdAt' | 'updatedAt'> = {
    callerId: callerProfile.uid,
    calleeId: calleeId,
    callerName: callerProfile.displayName || 'Caller',
    calleeName: calleeProfile.displayName || 'Callee',
    // callerFcmTokens and calleeFcmTokens are already part of UserProfile, not stored duplicatively here
    // We also don't store 100ms offer/answer anymore.
    // The 100ms room ID is fixed via constants for this basic setup.
    status: 'pending', // Our app's status for the call session
  };

  try {
    const callDocRef = await addDoc(videoCallsRef, {
      ...newCallData,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    });

    // Notify the callee about the incoming call using Desyn's notification system
    if (calleeProfile.uid && callerProfile.displayName) {
       await createNotification({
        userId: calleeProfile.uid,
        type: 'new_message', // Or a new 'incoming_call' type if defined
        actor: { id: callerProfile.uid, displayName: callerProfile.displayName, avatarUrl: callerProfile.photoURL },
        message: `${callerProfile.displayName} is starting a video call with you.`,
        link: `/video-call/${callDocRef.id}`, // Link to our app's call page
        relatedEntityId: callDocRef.id,
      });
    }

    return { success: true, callId: callDocRef.id, message: 'Call initiated.' };
  } catch (error: any) {
    console.error('Error initiating video call session:', error);
    return { success: false, message: error.message || 'Could not initiate call session.' };
  }
}

// This updates OUR application's record of the call session status.
export async function updateCallStatus(
    appCallId: string, 
    status: VideoCallSession['status']
): Promise<{success: boolean; message: string}> {
    if (!appCallId) return { success: false, message: 'Application Call ID is missing.'};
    const callDocRef = doc(db, 'videoCalls', appCallId);
    try {
        await updateDoc(callDocRef, { status, updatedAt: serverTimestamp() });
        return { success: true, message: `Call status updated to ${status}`};
    } catch (error: any) {
        console.error(`Error updating app call ${appCallId} to status ${status}:`, error);
        return { success: false, message: error.message || 'Could not update call status.'};
    }
}


// This action is responsible for providing the 100ms Auth Token for the client.
// In a real app, this would involve a secure backend call to 100ms to generate a token.
// For this prototype, it's hardcoded for guest, and indicates need for manual host token.
const PROTOTYPE_GUEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoyLCJ0eXBlIjoiYXBwIiwiYXBwX2RhdGEiOm51bGwsImFjY2Vzc19rZXkiOiI2ODUwMTAyMGJkMGRhYjVmOWEwMTI4YWQiLCJyb2xlIjoiZ3Vlc3QiLCJyb29tX2lkIjoiNjg1MDEzMDVhNDhjYTYxYzQ2NDc0MGU3IiwidXNlcl9pZCI6ImEyY2FhYjcyLTMxOWEtNDI5YS05MTkwLTM2OWJhYTI0NDhjOCIsImV4cCI6MTc1MDE2NTQ0MCwianRpIjoiYjc5Y2EyMjctNTVjZS00MmNmLTg0NjEtYzRmNTA3N2QwMDFkIiwiaWF0IjoxNzUwMDc5MDQwLCJpc3MiOiI2ODUwMTAyMGJkMGRhYjVmOWEwMTI4YWIiLCJuYmYiOjE3NTAwNzkwNDAsInN1YiI6ImFwaSJ9.0ALU1v2WrZo8phrYvky1vX-yLtyXkOJ0i785LRtK2jk";

interface Get100msTokenResult {
  success: boolean;
  token?: string;
  message?: string;
}
export async function get100msTokenAction(
  appCallId: string, // Our app's call ID, for context if needed
  role: string, // 'host' or 'guest' (maps to USER_ROLES_100MS.SPEAKER or .LISTENER)
  userId: string // The user ID requesting the token
): Promise<Get100msTokenResult> {
  
  if (DEFAULT_100MS_ROOM_ID === "YOUR_100MS_ROOM_ID_HERE") {
    return {
      success: false,
      message: "100ms Room ID is not configured in constants.ts. Cannot generate token."
    };
  }

  console.log(`get100msTokenAction called for appCallId: ${appCallId}, role: ${role}, userId: ${userId}`);
  
  // SIMULATION: In a real app, this would call your backend to securely generate a 100ms token.
  // Your backend would use your 100ms App Secret and Room ID.
  if (role === USER_ROLES_100MS.LISTENER) { // Guest role
    return {
      success: true,
      token: PROTOTYPE_GUEST_TOKEN,
      message: "Prototype guest token provided."
    };
  } else if (role === USER_ROLES_100MS.SPEAKER) { // Host role
    // For the prototype, the host needs to get a token manually from the 100ms dashboard.
    // This action will indicate that a token is needed, but won't provide one automatically.
    // The UI on the meeting page should prompt the host for this token.
    // This is because the PROTOTYPE_GUEST_TOKEN will not have host permissions.
    return {
      success: false, // Indicate token not provided automatically
      message: `Host token required. For this prototype, please obtain a '${USER_ROLES_100MS.SPEAKER}' role auth token from your 100ms Dashboard for Room ID: ${DEFAULT_100MS_ROOM_ID} and paste it into the UI. A secure backend is required for real token generation.`
    };
  } else {
    return {
      success: false,
      message: `Unknown role: ${role}. Cannot provide token.`
    };
  }
}
