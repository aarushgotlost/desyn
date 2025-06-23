
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { AnimationProject } from '@/types/data';

// A helper function to process Firestore doc into our type
const processAnimationDoc = (doc: any): AnimationProject => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
        frames: data.frames || [],
    } as AnimationProject;
}

export async function createAnimationProject(
  name: string,
  userId: string
): Promise<{ success: boolean; projectId?: string; message: string }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }

  try {
    const newProjectData = {
      name,
      ownerId: userId,
      collaborators: [userId],
      thumbnail: null,
      width: 1280,
      height: 720,
      fps: 24,
      frames: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'animations'), newProjectData);

    revalidatePath('/animation');
    return { success: true, projectId: docRef.id, message: 'Project created.' };
  } catch (error: any) {
    console.error("Error creating animation project:", error);
    return { success: false, message: error.message || 'Could not create project.' };
  }
}

export async function getUserAnimations(userId: string): Promise<AnimationProject[]> {
    if (!userId) return [];
    try {
        const q = query(
            collection(db, 'animations'),
            where('collaborators', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processAnimationDoc);
    } catch (error) {
        console.error("Error fetching user animations:", error);
        return [];
    }
}


export async function getAnimationDetails(animationId: string): Promise<AnimationProject | null> {
    try {
        const projectRef = doc(db, 'animations', animationId);
        const docSnap = await getDoc(projectRef);
        if (docSnap.exists()) {
            return processAnimationDoc(docSnap);
        }
        return null;
    } catch (error) {
        console.error("Error fetching animation details:", error);
        return null;
    }
}

export async function updateAnimationData(
  animationId: string,
  payload: Partial<Pick<AnimationProject, 'frames' | 'thumbnail' | 'fps'>>
): Promise<{ success: boolean; message: string }> {
  try {
    const projectRef = doc(db, 'animations', animationId);
    
    // Create a new object for the update payload to avoid modifying the original payload
    const updatePayload: { [key: string]: any } = {
        ...payload,
        updatedAt: serverTimestamp(),
    };
    
    await updateDoc(projectRef, updatePayload);
    
    revalidatePath(`/animation/${animationId}`);
    revalidatePath('/animation');
    
    return { success: true, message: 'Project updated.' };
  } catch (error: any) {
    console.error("Error updating animation data:", error);
    return { success: false, message: error.message || 'Could not update project.' };
  }
}
