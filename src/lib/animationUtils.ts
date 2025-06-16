
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
    throw new Error("Project ID and frame index are required.");
  }
  if (!userId) {
    console.error("User ID is missing for saveFrame operation.");
    throw new Error("User authentication is required to save.");
  }
  
  const projectDocRef = doc(db, 'projects', projectId);
  const frameDocId = `frame-${frameIndex}`;
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameDocId);

  const batch = writeBatch(db);

  // Project document data to be set or updated
  const projectUpdateData: { [key: string]: any } = {
    updatedAt: serverTimestamp() as Timestamp,
    // Potentially other metadata to update on any save, e.g., lastFrameSaved: frameIndex
  };

  // Check if project document exists, create if not
  const projectSnap = await getDoc(projectDocRef);
  if (!projectSnap.exists()) {
    projectUpdateData.name = `Untitled Project ${projectId.slice(-6)}`; // Default name
    projectUpdateData.createdBy = userId;
    projectUpdateData.fps = 12; // Default FPS
    projectUpdateData.createdAt = serverTimestamp() as Timestamp;
    if (frameIndex === 0 && dataUrl !== null) {
      projectUpdateData.thumbnailURL = dataUrl;
    } else {
      projectUpdateData.thumbnailURL = null;
    }
    batch.set(projectDocRef, projectUpdateData); // Set initial project data
  } else {
    // If project exists, only update specific fields if necessary
    if (frameIndex === 0 && dataUrl !== null) {
      projectUpdateData.thumbnailURL = dataUrl;
    }
    batch.update(projectDocRef, projectUpdateData); // Update existing project
  }


  if (dataUrl !== null) { // Only save frame if dataUrl is not null
    const framePayload: FrameStorageData = {
      dataUrl,
      updatedAt: serverTimestamp() as Timestamp,
      order: frameIndex,
      // layers: [] // TODO: Add current layers of the frame here if they are managed
    };
    batch.set(frameDocRef, framePayload, { merge: true });
  } else {
    // If dataUrl is null, it means the frame is blank.
    // We might still want to save a "blank" frame document to preserve its order/existence,
    // or delete it if it was previously saved and now cleared.
    // For now, let's just save a minimal entry if it's new, or update timestamp.
    // This behavior might need refinement based on desired UX for blank frames.
    const blankFramePayload = {
        dataUrl: null,
        updatedAt: serverTimestamp() as Timestamp,
        order: frameIndex,
    };
    batch.set(frameDocRef, blankFramePayload, { merge: true });
  }
  
  try {
    await batch.commit();
    // console.log(`Batch committed for project ${projectId}, frame ${frameIndex}.`);
  } catch (error) {
     console.error(`Error committing batch for saveFrame (project ${projectId}, frame ${frameIndex}):`, error);
     throw error; // Re-throw to be caught by calling function for user feedback
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

// Save project metadata (like name, fps, etc.) - typically from a settings page, not frame save
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
