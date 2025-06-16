
import { db, auth } from '@/lib/firebase'; // Corrected import path
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, query, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { AnimationFrameData, AnimationProject } from '@/types/data';
import type { Layer } from '@/context/AnimationContext'; // Import Layer type

interface FrameStorageData {
  id?: string; // The document ID for the frame, e.g., "frame-0"
  dataUrl: string | null;
  updatedAt: Timestamp; // Firestore ServerTimestamp
  order?: number; // Optional: if you want to explicitly store order
  layers?: Layer[]; // Store layer data if it's per-frame
}


export const saveFrame = async (projectId: string, frameIndex: number, dataUrl: string | null, userId?: string | null, layers?: Layer[]) => {
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
  };

  const projectSnap = await getDoc(projectDocRef);
  if (!projectSnap.exists()) {
    // This case should ideally be handled by the /animation/create flow.
    // If reached, it means a project document wasn't created beforehand.
    projectUpdateData.name = `Untitled Project ${projectId.slice(-6)}`;
    projectUpdateData.createdBy = userId;
    projectUpdateData.fps = 12;
    projectUpdateData.createdAt = serverTimestamp() as Timestamp;
    projectUpdateData.thumbnailURL = (frameIndex === 0 && dataUrl !== null) ? dataUrl : null;
    batch.set(projectDocRef, projectUpdateData);
  } else {
    if (frameIndex === 0 && dataUrl !== null && projectSnap.data()?.thumbnailURL !== dataUrl) {
      projectUpdateData.thumbnailURL = dataUrl;
    } else if (frameIndex === 0 && dataUrl === null && projectSnap.data()?.thumbnailURL !== null) {
      // If first frame is cleared, clear thumbnail (or use a default placeholder logic if preferred)
      projectUpdateData.thumbnailURL = null;
    }
    // Only update if there are actual changes to project metadata beyond just updatedAt
    if (Object.keys(projectUpdateData).length > 1) {
        batch.update(projectDocRef, projectUpdateData);
    } else {
        // If only updatedAt is changing, ensure the update call is still made
        batch.update(projectDocRef, { updatedAt: serverTimestamp() as Timestamp });
    }
  }

  const framePayload: FrameStorageData = {
    dataUrl, // Can be null for blank frames
    updatedAt: serverTimestamp() as Timestamp,
    order: frameIndex,
    layers: layers || [], // Save current layers of the frame
  };
  batch.set(frameDocRef, framePayload, { merge: true }); // Use merge to preserve other fields if any

  try {
    await batch.commit();
  } catch (error) {
     console.error(`Error committing batch for saveFrame (project ${projectId}, frame ${frameIndex}):`, error);
     throw error;
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
        layers: data.layers || [], // Ensure layers array exists
    } as FrameStorageData;
  } else {
    return null;
  }
};

export const loadAllFrames = async (projectId: string): Promise<AnimationFrameData[]> => {
  if (!projectId) {
    console.error("Invalid projectId for loadAllFrames");
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
};

