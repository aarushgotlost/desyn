
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
  if (dataUrl === null) {
    // console.warn(`Attempted to save null dataUrl for frame ${frameIndex} in project ${projectId}. Skipping save for this frame.`);
    // Depending on desired behavior, you might still want to update the project's updatedAt timestamp
    // For now, we'll just update project timestamp if other conditions met
  }

  const projectDocRef = doc(db, 'projects', projectId);
  const frameDocId = `frame-${frameIndex}`;
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameDocId);

  const batch = writeBatch(db);

  const framePayload: FrameStorageData = {
    dataUrl,
    updatedAt: serverTimestamp() as Timestamp,
    order: frameIndex,
  };
  batch.set(frameDocRef, framePayload, { merge: true });

  // Ensure project document exists and update its 'updatedAt'
  const projectSnap = await getDoc(projectDocRef);
  const projectUpdateData: Partial<AnimationProject & {createdAt: Timestamp, updatedAt: Timestamp}> = {
    updatedAt: serverTimestamp() as Timestamp,
  };

  if (!projectSnap.exists()) {
    projectUpdateData.name = `Untitled Animation ${projectId.substring(projectId.length - 6)}`;
    projectUpdateData.createdAt = serverTimestamp() as Timestamp;
    if (userId) {
      projectUpdateData.createdBy = userId;
    }
    projectUpdateData.fps = 12; // Default FPS
    // Set initial thumbnail or other defaults if necessary
  }
  
  batch.set(projectDocRef, projectUpdateData, { merge: true });
  
  await batch.commit();
  console.log(`Frame ${frameIndex} and project ${projectId} metadata saved/updated.`);
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
