
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp, query, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import type { AnimationFrameData, AnimationProject } from '@/types/data';
import type { Layer, Frame } from '@/context/AnimationContext'; // Added Frame import

interface FrameStorageData {
  id?: string; 
  dataUrl: string | null;
  updatedAt: Timestamp; 
  order?: number; 
  layers?: Layer[]; 
}


export const saveFrameToDb = async (
  projectId: string,
  frameIndex: number,
  dataUrl: string | null,
  userId: string, 
  layers?: Layer[]
) => {
  if (!projectId || typeof frameIndex !== 'number') {
    throw new Error("Project ID and frame index are required to save frame data.");
  }
  if (!userId) {
    throw new Error("User ID is required to save frame data.");
  }

  const projectDocRef = doc(db, 'projects', projectId);
  const frameDocId = `frame-${frameIndex}`;
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameDocId);

  const batch = writeBatch(db);

  const projectSnap = await getDoc(projectDocRef);
  if (!projectSnap.exists()) {
    throw new Error(`Project with ID ${projectId} not found. Please ensure the project is created before saving frames.`);
  }

  const projectUpdatePayload: { [key: string]: any } = {
    updatedAt: serverTimestamp() as Timestamp,
  };

  if (frameIndex === 0) {
    const currentThumbnail = projectSnap.data()?.thumbnailURL;
    if (dataUrl !== null && currentThumbnail !== dataUrl) {
      projectUpdatePayload.thumbnailURL = dataUrl;
    } else if (dataUrl === null && currentThumbnail !== null) {
      projectUpdatePayload.thumbnailURL = null; 
    }
  }
  batch.update(projectDocRef, projectUpdatePayload);

  const framePayload: FrameStorageData = {
    dataUrl, 
    updatedAt: serverTimestamp() as Timestamp,
    order: frameIndex,
    layers: layers || [], 
  };
  batch.set(frameDocRef, framePayload, { merge: true }); 

  try {
    await batch.commit();
  } catch (error) {
     console.error("Error committing frame save batch:", error);
     throw error; 
  }
};


export const saveAllFramesToDb = async (
  projectId: string,
  frames: Frame[], // Use the Frame type from context
  userId: string,
  projectName?: string, // Optional, for initial creation if needed
  projectFps?: number     // Optional, for initial creation if needed
) => {
  if (!projectId) {
    throw new Error("Project ID is required to save all frames.");
  }
  if (!userId) {
    throw new Error("User ID is required to save all frames.");
  }
  if (!frames || frames.length === 0) {
    // console.log("No frames to save."); // Or throw an error, or return silently
    return;
  }

  const batch = writeBatch(db);
  const projectDocRef = doc(db, 'projects', projectId);

  // Prepare project document update/creation
  const projectSnap = await getDoc(projectDocRef);
  const projectDataToUpdate: { [key: string]: any } = {
    updatedAt: serverTimestamp() as Timestamp,
  };

  if (frames[0]?.dataUrl) {
    projectDataToUpdate.thumbnailURL = frames[0].dataUrl;
  } else if (projectSnap.exists() && projectSnap.data()?.thumbnailURL) {
    // If first frame is now blank, but project had a thumbnail, clear it
    projectDataToUpdate.thumbnailURL = null;
  }


  if (!projectSnap.exists()) {
    // This case should ideally be handled by the create animation flow.
    // If it happens, create the project with basic info.
    projectDataToUpdate.name = projectName || `Untitled Project ${projectId.substring(projectId.length - 6)}`;
    projectDataToUpdate.createdBy = userId;
    projectDataToUpdate.fps = projectFps || 12;
    projectDataToUpdate.createdAt = serverTimestamp() as Timestamp;
    batch.set(projectDocRef, projectDataToUpdate);
  } else {
    batch.update(projectDocRef, projectDataToUpdate);
  }

  // Prepare frame documents
  frames.forEach((frame, index) => {
    const frameDocId = `frame-${index}`; // Or use frame.id if it's structured like that
    const frameDocRef = doc(db, 'projects', projectId, 'frames', frameDocId);
    const framePayload: FrameStorageData = {
      dataUrl: frame.dataUrl,
      updatedAt: serverTimestamp() as Timestamp,
      order: index,
      layers: frame.layers || [],
    };
    batch.set(frameDocRef, framePayload, { merge: true });
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error("Error committing save all frames batch:", error);
    throw error;
  }
};


export const loadFrame = async (projectId: string, frameIndex: number): Promise<FrameStorageData | null> => {
  if (!projectId || typeof frameIndex !== 'number') {
    return null;
  }
  const frameDocRef = doc(db, 'projects', projectId, 'frames', `frame-${frameIndex}`);
  const docSnap = await getDoc(frameDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        dataUrl: data.dataUrl,
        updatedAt: data.updatedAt, 
        order: data.order,
        layers: data.layers || [], 
    } as FrameStorageData;
  } else {
    return null;
  }
};

export const loadAllFrames = async (projectId: string): Promise<AnimationFrameData[]> => {
  if (!projectId) {
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
        layers: data.layers || [], 
        order: data.order,
      } as AnimationFrameData);
    });
    return frames;
  } catch (error) {
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
    return null;
  }
};

export const saveProjectMetadata = async (projectId: string, metadata: Partial<AnimationProject>) => {
  if (!projectId) {
    return;
  }
  const projectDocRef = doc(db, 'projects', projectId);
  const dataToSave = { ...metadata, updatedAt: serverTimestamp() };
  await setDoc(projectDocRef, dataToSave, { merge: true });
};
