
import { db } from '@/lib/firebase'; // Corrected import path
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';

interface FrameData {
  dataUrl: string;
  updatedAt: number | any; // Allow Firebase ServerTimestamp
  // Potentially other metadata like layer info, order, etc.
}

export const saveFrame = async (projectId: string, frameIndex: number, dataUrl: string) => {
  if (!projectId || typeof frameIndex !== 'number' || !dataUrl) {
    console.error("Invalid parameters for saveFrame");
    return;
  }
  const frameDocRef = doc(db, 'projects', projectId, 'frames', `frame-${frameIndex}`);
  const framePayload: FrameData = {
    dataUrl,
    updatedAt: serverTimestamp() // Use serverTimestamp for consistency
  };
  await setDoc(frameDocRef, framePayload, { merge: true }); // Use merge:true to update if exists
  console.log(`Frame ${frameIndex} saved for project ${projectId}`);
};

export const loadFrame = async (projectId: string, frameIndex: number): Promise<FrameData | null> => {
  if (!projectId || typeof frameIndex !== 'number') {
    console.error("Invalid parameters for loadFrame");
    return null;
  }
  const frameDocRef = doc(db, 'projects', projectId, 'frames', `frame-${frameIndex}`);
  const docSnap = await getDoc(frameDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as FrameData;
  } else {
    console.log(`Frame ${frameIndex} does not exist for project ${projectId}`);
    return null;
  }
};

export const loadAllFrames = async (projectId: string): Promise<any[]> => {
  if (!projectId) {
    console.error("Invalid projectId for loadAllFrames");
    return [];
  }
  const framesColRef = collection(db, 'projects', projectId, 'frames');
  // Assuming frames are named like 'frame-0', 'frame-1', etc.
  // Firestore orders lexicographically, so 'frame-10' comes before 'frame-2'.
  // A robust solution would involve storing an 'order' field.
  // For simplicity, we fetch and then sort client-side if names are simple.
  // Or, use a query with orderBy if an 'orderIndex' field exists.
  const q = query(framesColRef, orderBy('updatedAt')); // Example: order by updatedAt, or ideally an 'orderIndex'
  
  try {
    const querySnapshot = await getDocs(q);
    const frames: any[] = [];
    querySnapshot.forEach((docSnap) => {
      // Extract frame index from doc ID like "frame-0"
      const frameId = docSnap.id;
      const match = frameId.match(/^frame-(\d+)$/);
      const index = match ? parseInt(match[1], 10) : -1;

      frames.push({ id: docSnap.id, index, ...docSnap.data() });
    });
    // Sort by extracted index if necessary
    frames.sort((a, b) => a.index - b.index);
    return frames.map(f => ({id: f.id, ...f})); // Return sorted frames without the temporary index
  } catch (error) {
    console.error("Error loading all frames: ", error);
    return [];
  }
};

// Example structure for a project document (optional, can be managed elsewhere)
export const getProjectDetails = async (projectId: string) => {
  const projectDocRef = doc(db, 'projects', projectId);
  const docSnap = await getDoc(projectDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};
