
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getCurrentUserId } from '@/services/firestoreService'; // Assuming this can get current user ID or you pass it
import type { UserProfile } from '@/contexts/AuthContext';
import type { VideoCallSession } from '@/types/data';
import { createNotification } from '@/services/notificationService'; // For notifying the callee

interface InitiateCallResult {
  success: boolean;
  callId?: string;
  message: string;
}

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
    callerFcmTokens: callerProfile.fcmTokens || [],
    calleeFcmTokens: calleeProfile.fcmTokens || [],
    status: 'pending',
  };

  try {
    const callDocRef = await addDoc(videoCallsRef, {
      ...newCallData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notify the callee (optional, basic notification)
    if (calleeProfile.uid && callerProfile.displayName) {
       await createNotification({
        userId: calleeProfile.uid,
        type: 'new_message', // Using existing type, could be 'incoming_call'
        actor: { id: callerProfile.uid, displayName: callerProfile.displayName, avatarUrl: callerProfile.photoURL },
        message: `${callerProfile.displayName} is calling you.`,
        link: `/video-call/${callDocRef.id}`,
        relatedEntityId: callDocRef.id,
      });
    }


    return { success: true, callId: callDocRef.id, message: 'Call initiated.' };
  } catch (error: any) {
    console.error('Error initiating video call:', error);
    return { success: false, message: error.message || 'Could not initiate call.' };
  }
}

export async function updateCallStatus(callId: string, status: VideoCallSession['status']): Promise<{success: boolean; message: string}> {
    if (!callId) return { success: false, message: 'Call ID is missing.'};
    const callDocRef = doc(db, 'videoCalls', callId);
    try {
        await updateDoc(callDocRef, { status, updatedAt: serverTimestamp() });
        return { success: true, message: `Call status updated to ${status}`};
    } catch (error: any) {
        console.error(`Error updating call ${callId} to status ${status}:`, error);
        return { success: false, message: error.message || 'Could not update call status.'};
    }
}
