
import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  writeBatch,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import type { VideoCallSession } from '@/types/data';

const ICE_CANDIDATE_BATCH_DELAY = 100; // ms
let iceCandidateBatch: RTCIceCandidateInit[] = [];
let iceCandidateBatchTimeout: NodeJS.Timeout | null = null;


const processCallSessionDoc = (docSnap: any): VideoCallSession | null => {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const processedData: any = {
    id: docSnap.id,
    ...data,
  };
  const dateFields: (keyof VideoCallSession)[] = ['createdAt', 'updatedAt'];
  dateFields.forEach(field => {
    const fieldValue = data[field];
    if (fieldValue && typeof (fieldValue as Timestamp).toDate === 'function') {
      processedData[field] = (fieldValue as Timestamp).toDate().toISOString();
    } else if (fieldValue instanceof Date) {
      processedData[field] = fieldValue.toISOString();
    }
  });
  return processedData as VideoCallSession;
};


export async function getCallDetails(callId: string): Promise<VideoCallSession | null> {
  const callDocRef = doc(db, 'videoCalls', callId);
  const callSnap = await getDoc(callDocRef);
  return processCallSessionDoc(callSnap);
}

export async function sendOffer(callId: string, offer: RTCSessionDescriptionInit, callerId: string) {
  const callDocRef = doc(db, 'videoCalls', callId);
  await updateDoc(callDocRef, {
    offer,
    status: 'offered',
    updatedAt: serverTimestamp(),
  });
}

export async function sendAnswer(callId: string, answer: RTCSessionDescriptionInit, calleeId: string) {
  const callDocRef = doc(db, 'videoCalls', callId);
  await updateDoc(callDocRef, {
    answer,
    status: 'answered', // Or 'connected' if this implies connection
    updatedAt: serverTimestamp(),
  });
}

export function onCallSessionUpdate(
  callId: string,
  callback: (callSession: VideoCallSession | null) => void
): () => void {
  const callDocRef = doc(db, 'videoCalls', callId);
  return onSnapshot(callDocRef, (docSnap) => {
    callback(processCallSessionDoc(docSnap));
  });
}


export async function addIceCandidate(callId: string, currentUserId: string, targetUserId: string, candidate: RTCIceCandidateInit) {
  // Candidates from currentUserId are for targetUserId to consume
  const candidatesCollectionRef = collection(db, 'videoCalls', callId, `${targetUserId}_candidates`);
  iceCandidateBatch.push(candidate);

  if (iceCandidateBatchTimeout) {
    clearTimeout(iceCandidateBatchTimeout);
  }

  iceCandidateBatchTimeout = setTimeout(async () => {
    if (iceCandidateBatch.length === 0) return;

    const batch = writeBatch(db);
    iceCandidateBatch.forEach(cand => {
      const candidateDocRef = doc(candidatesCollectionRef); // Auto-generate ID
      batch.set(candidateDocRef, cand);
    });
    
    try {
      await batch.commit();
      iceCandidateBatch = []; // Clear the batch
    } catch (error) {
      console.error("Error writing ICE candidate batch:", error);
      // Handle error, maybe retry individual candidates or log
    }
    iceCandidateBatchTimeout = null;
  }, ICE_CANDIDATE_BATCH_DELAY);
}


export function onIceCandidate(
  callId: string,
  listeningForCandidatesOfUserId: string, // The ID of the *other* user, whose candidates we are listening for
  callback: (candidate: RTCIceCandidateInit) => void
): () => void {
  // We listen to the collection named after *our* userId, where the other user sends *their* candidates *for us*.
  const candidatesCollectionRef = collection(db, 'videoCalls', callId, `${listeningForCandidatesOfUserId}_candidates`);
  const q = query(candidatesCollectionRef, orderBy('timestamp', 'asc')); // Assuming you add a timestamp field

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback(change.doc.data() as RTCIceCandidateInit);
        // Optional: Delete candidate after processing to keep collection clean
        // deleteDoc(change.doc.ref); 
      }
    });
  });
}


export async function cleanupCallData(callId: string) {
  const callDocRef = doc(db, 'videoCalls', callId);
  const callSnap = await getDoc(callDocRef);
  if (!callSnap.exists()) return;
  const callData = callSnap.data() as VideoCallSession;

  const batch = writeBatch(db);

  const callerCandidatesRef = collection(db, 'videoCalls', callId, `${callData.callerId}_candidates`);
  const calleeCandidatesRef = collection(db, 'videoCalls', callId, `${callData.calleeId}_candidates`);

  const callerCandidatesSnap = await getDocs(callerCandidatesRef);
  callerCandidatesSnap.forEach(doc => batch.delete(doc.ref));

  const calleeCandidatesSnap = await getDocs(calleeCandidatesRef);
  calleeCandidatesSnap.forEach(doc => batch.delete(doc.ref));
  
  // Optionally, delete the main call document or mark it as 'ended'
  // batch.delete(callDocRef); 
  // Or update status:
  batch.update(callDocRef, { status: 'ended', offer: null, answer: null, updatedAt: serverTimestamp() });


  await batch.commit();
}

// Helper function to add timestamp to candidates before sending (if needed, but Firestore serverTimestamp is better for collections)
// If using orderBy on candidates, ensure they have a consistent timestamp field.
// For simplicity, this example might rely on document order or a client-set timestamp if strictly needed for ordering.
// Firestore's serverTimestamp is ideal for creation time.
// If candidates are added with { ...candidate, timestamp: serverTimestamp() }, you can orderBy('timestamp').
// For `addIceCandidate`, we're adding documents to a subcollection. Firestore handles this well.
// The onSnapshot for ICE candidates might need adjustment if explicit ordering is crucial and serverTimestamp isn't directly on each candidate doc.
// A common pattern is to add candidate and then delete, so ordering becomes less critical.
// The provided `onIceCandidate` uses `orderBy('timestamp', 'asc')`.
// So, when adding candidates, ensure they get a `timestamp` field.
// Modifying addIceCandidate to include client-side timestamp if serverTimestamp is tricky for batching non-doc writes.
// Let's refine addIceCandidate to use client-side timestamp for ordering, simpler for this context.

export async function addIceCandidateWithClientTimestamp(callId: string, currentUserId: string, targetUserId: string, candidate: RTCIceCandidateInit) {
  const candidatesCollectionRef = collection(db, 'videoCalls', callId, `${targetUserId}_candidates`);
  const candidateWithTimestamp = { ...candidate, timestamp: new Date().toISOString() };
  
  // Batching logic remains the same
  iceCandidateBatch.push(candidateWithTimestamp);

  if (iceCandidateBatchTimeout) {
    clearTimeout(iceCandidateBatchTimeout);
  }

  iceCandidateBatchTimeout = setTimeout(async () => {
    if (iceCandidateBatch.length === 0) return;
    const batch = writeBatch(db);
    iceCandidateBatch.forEach(cand => {
      const candidateDocRef = doc(candidatesCollectionRef);
      batch.set(candidateDocRef, cand);
    });
    
    try {
      await batch.commit();
      iceCandidateBatch = [];
    } catch (error) {
      console.error("Error writing ICE candidate batch:", error);
    }
    iceCandidateBatchTimeout = null;
  }, ICE_CANDIDATE_BATCH_DELAY);
}
