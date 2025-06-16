
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, query, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { AnimationFrameData, AnimationProject } from '@/types/data';
import type { Layer } from '@/context/AnimationContext';

interface FrameStorageData {
  id?: string; // The document ID for the frame, e.g., "frame-0"
  dataUrl: string | null;
  updatedAt: Timestamp; // Firestore ServerTimestamp
  order?: number; // Optional: if you want to explicitly store order
  layers?: Layer[]; // Store layer data if it's per-frame
}


export const saveFrameToDb = async (
  projectId: string,
  frameIndex: number,
  dataUrl: string | null,
  userId: string, // userId is now non-optional
  layers?: Layer[]
) => {
  if (!projectId || typeof frameIndex !== 'number') {
    throw new Error("Project ID and frame index are required to save frame data.");
  }
  // userId is guaranteed by the type signature.

  const projectDocRef = doc(db, 'projects', projectId);
  const frameDocId = `frame-${frameIndex}`;
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameDocId);

  const batch = writeBatch(db);

  // Check if project document exists. It should, due to the create flow.
  const projectSnap = await getDoc(projectDocRef);
  if (!projectSnap.exists()) {
    // This is an unexpected situation. The project document should have been created by createAnimationProject.
    throw new Error(`Project with ID ${projectId} not found. Frame save aborted as project integrity is compromised.`);
  }

  // Project exists, prepare to update its 'updatedAt' and potentially 'thumbnailURL'
  const projectUpdatePayload: { [key: string]: any } = {
    updatedAt: serverTimestamp() as Timestamp,
  };

  // Only update thumbnailURL if it's the first frame (index 0)
  if (frameIndex === 0) {
    const currentThumbnail = projectSnap.data()?.thumbnailURL;
    if (dataUrl !== null && currentThumbnail !== dataUrl) {
      projectUpdatePayload.thumbnailURL = dataUrl;
    } else if (dataUrl === null && currentThumbnail !== null) {
      projectUpdatePayload.thumbnailURL = null; // Clear thumbnail if first frame is cleared
    }
  }
  batch.update(projectDocRef, projectUpdatePayload);


  // Frame document data
  const framePayload: FrameStorageData = {
    dataUrl, // Can be null for blank frames
    updatedAt: serverTimestamp() as Timestamp,
    order: frameIndex,
    layers: layers || [], // Save current layers of the frame, default to empty array if undefined
  };
  batch.set(frameDocRef, framePayload, { merge: true }); // Use set with merge for frames

  try {
    await batch.commit();
  } catch (error) {
     throw error; // Re-throw to be caught by the context
  }
};


export const loadFrame = async (projectId: string, frameIndex: number): Promise<FrameStorageData | null> => {
  if (!projectId || typeof frameIndex !== 'number') {
    // console.error("Invalid parameters for loadFrame"); // No console logs
    return null;
  }
  const frameDocRef = doc(db, 'projects', projectId, 'frames', `frame-${frameIndex}`);
  const docSnap = await getDoc(frameDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        dataUrl: data.dataUrl,
        updatedAt: data.updatedAt, // This will be a Firestore Timestamp
        order: data.order,
        layers: data.layers || [], // Ensure layers array exists
    } as FrameStorageData;
  } else {
    return null;
  }
};

export const loadAllFrames = async (projectId: string): Promise<AnimationFrameData[]> => {
  if (!projectId) {
    // console.error("Invalid projectId for loadAllFrames"); // No console logs
    return [];
  }
  const framesColRef = collection(db, 'projects', projectId, 'frames');
  const q = query(framesColRef, orderBy('order', 'asc'));

  try {
    const querySnapshot = await getDocs(q);
    const frames: AnimationFrameData[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      frames.push({
        id: docSnap.id,
        dataUrl: data.dataUrl,
        layers: data.layers || [], // Ensure layers array exists
        order: data.order,
      } as AnimationFrameData);
    });
    return frames;
  } catch (error) {
    // console.error("Error loading all frames: ", error); // No console logs
    return [];
  }
};

export const getProjectMetadata = async (projectId: string): Promise<AnimationProject | null> => {
  if (!projectId) return null;
  const projectDocRef = doc(db, 'projects', projectId);
  try {
    const docSnap = await getDoc(projectDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const createdAt = data.createdAt;
      const updatedAt = data.updatedAt;
      return {
        id: docSnap.id,
        name: data.name || `Untitled Animation ${projectId.substring(projectId.length - 6)}`,
        createdBy: data.createdBy,
        createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (createdAt ? new Date(createdAt).toISOString() : new Date().toISOString()),
        updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString()),
        thumbnailURL: data.thumbnailURL || null,
        fps: data.fps || 12,
      } as AnimationProject;
    }
    return null;
  } catch (error) {
    // console.error(`Error fetching project metadata for ${projectId}:`, error); // No console logs
    return null;
  }
};

// Save project metadata (like name, fps, etc.) - typically from a settings page, not frame save
export const saveProjectMetadata = async (projectId: string, metadata: Partial<AnimationProject>) => {
  if (!projectId) {
    // console.error("Project ID is required to save metadata."); // No console logs
    return;
  }
  const projectDocRef = doc(db, 'projects', projectId);
  const dataToSave = { ...metadata, updatedAt: serverTimestamp() };
  await setDoc(projectDocRef, dataToSave, { merge: true });
};
