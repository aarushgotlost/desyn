
import { db, auth } from '@/lib/firebase'; // Corrected import path
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, query, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { AnimationFrameData, AnimationProject } from '@/types/data';

interface FrameStorageData {
  id?: string; // The document ID for the frame, e.g., "frame-0"
  dataUrl: string | null;
  updatedAt: Timestamp; // Firestore ServerTimestamp
  order?: number; // Optional: if you want to explicitly store order
  layers?: any[]; // Store layer data if it's per-frame
}


export const saveFrame = async (projectId: string, frameIndex: number, dataUrl: string | null, userId?: string | null) => {
  if (!projectId || typeof frameIndex !== 'number') {
    console.error("Invalid parameters for saveFrame: projectId or frameIndex missing.");
    return;
  }
  
  const projectDocRef = doc(db, 'projects', projectId);
  const frameDocId = `frame-${frameIndex}`;
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameDocId);

  const batch = writeBatch(db);

  if (dataUrl !== null) { // Only save frame if dataUrl is not null
    const framePayload: FrameStorageData = {
      dataUrl,
      updatedAt: serverTimestamp() as Timestamp,
      order: frameIndex,
    };
    batch.set(frameDocRef, framePayload, { merge: true });
  }

  // Project document should already exist from the create flow.
  // We only update its 'updatedAt' timestamp and potentially the thumbnail.
  const projectUpdateData: Partial<AnimationProject & {updatedAt: Timestamp, thumbnailURL?: string | null}> = {
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  // Update thumbnail only if this is the first frame being saved and it has data
  // Or if a specific logic for thumbnail update is implemented (e.g. user chooses thumbnail frame)
  if (frameIndex === 0 && dataUrl !== null) {
    const projectSnap = await getDoc(projectDocRef);
    if (projectSnap.exists()) {
        const currentProjectData = projectSnap.data() as AnimationProject;
        // Only update thumbnail if it's not already set or if a new one is explicitly provided
        // For simplicity, if frame 0 is saved and has data, we set/update its thumbnail.
        if (dataUrl) { // Check ensures dataUrl is not null before setting as thumbnail
             projectUpdateData.thumbnailURL = dataUrl;
        }
    }
  }
  
  batch.update(projectDocRef, projectUpdateData); // Use update instead of set with merge if we're sure it exists
  
  try {
    await batch.commit();
    console.log(`Frame ${frameIndex} and project ${projectId} metadata updated.`);
  } catch (error) {
     console.error(`Error committing batch for saveFrame (project ${projectId}, frame ${frameIndex}):`, error);
     // Check if projectDocRef actually exists if batch.update fails
     const checkProjectSnap = await getDoc(projectDocRef);
     if (!checkProjectSnap.exists()) {
         console.error(`Project document ${projectId} does not exist. This should have been created by the /animation/create flow.`);
         // As a fallback, attempt to create it, though this indicates a flow issue
         const fallbackProjectData: Partial<AnimationProject & {createdAt: Timestamp, updatedAt: Timestamp, createdBy?: string}> = {
             name: `Untitled Project ${projectId.slice(-4)}`,
             fps: 12,
             createdAt: serverTimestamp() as Timestamp,
             updatedAt: serverTimestamp() as Timestamp,
             thumbnailURL: frameIndex === 0 && dataUrl ? dataUrl : null
         };
         if (userId) fallbackProjectData.createdBy = userId;
         await setDoc(projectDocRef, fallbackProjectData, { merge: true });
         console.warn(`Fallback: Created missing project document ${projectId}.`);
         // Retry saving the frame data (optional, or just log)
         if (dataUrl !== null) {
             const framePayloadRetry: FrameStorageData = { dataUrl, updatedAt: serverTimestamp() as Timestamp, order: frameIndex };
             await setDoc(frameDocRef, framePayloadRetry, { merge: true });
         }
     } else {
        // If project exists but update failed, it's another issue.
        throw error; // Re-throw original error if project exists.
     }
  }
};


export const loadFrame = async (projectId: string, frameIndex: number): Promise<FrameStorageData | null> => {
  if (!projectId || typeof frameIndex !== 'number') {
    console.error("Invalid parameters for loadFrame");
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
        layers: data.layers,
    } as FrameStorageData;
  } else {
    // console.log(`Frame ${frameIndex} does not exist for project ${projectId}`);
    return null;
  }
};

export const loadAllFrames = async (projectId: string): Promise<AnimationFrameData[]> => {
  if (!projectId) {
    console.error("Invalid projectId for loadAllFrames");
    return [];
  }
  const framesColRef = collection(db, 'projects', projectId, 'frames');
  const q = query(framesColRef, orderBy('order', 'asc')); // Order by the 'order' field
  
  try {
    const querySnapshot = await getDocs(q);
    const frames: AnimationFrameData[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      frames.push({
        id: docSnap.id, // e.g., "frame-0"
        dataUrl: data.dataUrl,
        layers: data.layers || [],
        order: data.order,
        // Note: Timestamps are not converted to ISO string here, keep as Firestore Timestamps if needed or convert in context
      } as AnimationFrameData);
    });
    return frames;
  } catch (error) {
    console.error("Error loading all frames: ", error);
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
      return {
        id: docSnap.id,
        name: data.name || `Untitled Animation ${projectId.substring(projectId.length - 6)}`,
        createdBy: data.createdBy,
        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate ? (data.updatedAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        thumbnailURL: data.thumbnailURL || null,
        fps: data.fps || 12,
      } as AnimationProject;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching project metadata for ${projectId}:`, error);
    return null;
  }
};

// Save project metadata (like name, fps, etc.)
export const saveProjectMetadata = async (projectId: string, metadata: Partial<AnimationProject>) => {
  if (!projectId) {
    console.error("Project ID is required to save metadata.");
    return;
  }
  const projectDocRef = doc(db, 'projects', projectId);
  const dataToSave = { ...metadata, updatedAt: serverTimestamp() };
  await setDoc(projectDocRef, dataToSave, { merge: true });
  console.log(`Project metadata for ${projectId} saved.`);
};
