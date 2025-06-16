
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';
import type { VideoCallSession } from '@/types/data';
import { createNotification } from '@/services/notificationService';


interface InitiateCallResult {
  success: boolean;
  callId?: string; // This is our Firestore document ID
  message: string;
}

// This function creates OUR application's record of a call session.
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
    status: 'pending', 
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
        type: 'new_message', // Consider a new 'incoming_call' type
        actor: { id: callerProfile.uid, displayName: callerProfile.displayName, avatarUrl: callerProfile.photoURL },
        message: `${callerProfile.displayName} is starting a video call with you.`,
        link: `/video-call/${callDocRef.id}`, 
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
        const callSnap = await getDoc(callDocRef);
        if (!callSnap.exists()) {
            // If the call document doesn't exist, we can't update it.
            // This might happen if a call is initiated and then quickly cancelled/errored before the doc is fully processed,
            // or if the ID is incorrect.
            console.warn(`Attempted to update status for non-existent call ID: ${appCallId}`);
            return { success: false, message: `Call session with ID ${appCallId} not found.`};
        }
        await updateDoc(callDocRef, { status, updatedAt: serverTimestamp() });
        return { success: true, message: `Call status updated to ${status}`};
    } catch (error: any) {
        console.error(`Error updating app call ${appCallId} to status ${status}:`, error);
        return { success: false, message: error.message || 'Could not update call status.'};
    }
}
