
import { db, auth, app } from '@/lib/firebase';
import type { Community, Post, Comment, AnimationProject, AnimationFrameData, CollaboratorProfile } from '@/types/data'; // Added Animation types
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  deleteDoc, // Added deleteDoc
  setDoc // Added setDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable, type HttpsCallable } from 'firebase/functions'; // Added for Cloud Functions
import { unstable_noStore as noStore } from 'next/cache';


export async function getCurrentUserId(): Promise<string | null> {
  noStore();
  // This is a placeholder. In a real app, you'd get this from your auth state.
  // For client components, useAuth().user.uid. For server, it's more complex.
  // For now, assuming client-side usage where auth context provides it or SSR passes it.
  // If your actual `getCurrentUserId` is different, use that.
  // THIS WILL BE NULL ON SERVER COMPONENTS UNLESS AUTH STATE IS PASSED.
  return auth.currentUser?.uid || null;
}


const processDoc = <T extends { id: string; createdAt?: string | Timestamp | Date; updatedAt?: string | Timestamp | Date; lastLogin?: string | Timestamp | Date; lastMessageAt?: string | Timestamp | Date; members?: string[]; authorAvatar?: string | null; photoURL?: string | null; bannerURL?: string | null; followersCount?: number; followingCount?: number; skills?: string[]; likes?: number; commentsCount?: number; memberCount?: number; }>(docSnap: any): T => {
  const data = docSnap.data();
  const processedData: any = {
    id: docSnap.id,
    ...data,
  };

  const dateFields: (keyof T)[] = ['createdAt', 'updatedAt', 'lastLogin', 'lastMessageAt']; 
  dateFields.forEach(field => {
    const fieldValue = data[field];
    if (fieldValue && typeof (fieldValue as Timestamp).toDate === 'function') {
      processedData[field] = (fieldValue as Timestamp).toDate().toISOString();
    } else if (fieldValue instanceof Date) {
      processedData[field] = fieldValue.toISOString();
    } else if (typeof fieldValue === 'string') {
      try {
            const d = new Date(fieldValue);
            if (!isNaN(d.getTime())) { 
              processedData[field] = d.toISOString();
            } else {
              processedData[field] = fieldValue; 
            }
      } catch (e) {
        processedData[field] = fieldValue; 
      }
    } else if (fieldValue && typeof fieldValue === 'object' && fieldValue.seconds && fieldValue.nanoseconds) { 
        try {
            processedData[field] = new Timestamp(fieldValue.seconds, fieldValue.nanoseconds).toDate().toISOString();
        } catch (e) {
            processedData[field] = null;
        }
    }
  });


  if (data.members && docSnap.ref.parent.id === 'communities') {
    processedData.members = data.members;
  } else if (docSnap.ref.parent.id === 'communities' || docSnap.ref.path.includes('communities')) {
    // Ensure members array exists even if empty, for communities
    processedData.members = Array.isArray(data.members) ? data.members : [];
  }


  if ('authorId' in data) { // For Posts
      processedData.authorAvatar = data.authorAvatar || null;
  }

  // For UserProfile specific fields
  if (typeof data.uid !== 'undefined' || docSnap.ref.parent.id === 'users') {
      processedData.photoURL = data.photoURL || null;
      processedData.bannerURL = data.bannerURL || null;
      processedData.followersCount = typeof data.followersCount === 'number' ? data.followersCount : 0;
      processedData.followingCount = typeof data.followingCount === 'number' ? data.followingCount : 0;
      processedData.bio = data.bio || '';
      processedData.skills = data.skills || [];
      processedData.interests = data.interests || [];
      processedData.onboardingCompleted = typeof data.onboardingCompleted === 'boolean' ? data.onboardingCompleted : false;
  }

  
  if ('likes' in data) { // For Posts
    processedData.likes = typeof data.likes === 'number' ? data.likes : 0;
  }
  if ('commentsCount' in data) { // For Posts
    processedData.commentsCount = typeof data.commentsCount === 'number' ? data.commentsCount : 0;
  }
  if ('memberCount' in data && docSnap.ref.parent.id === 'communities') { // For Communities
    processedData.memberCount = typeof data.memberCount === 'number' ? data.memberCount : 0;
  }
  
  // For AnimationProject specific fields
  if (docSnap.ref.parent.id === 'projects') {
    processedData.allowedUsers = Array.isArray(data.allowedUsers) ? data.allowedUsers : [];
    processedData.fps = typeof data.fps === 'number' ? data.fps : 12;
    processedData.width = typeof data.width === 'number' ? data.width : 640;
    processedData.height = typeof data.height === 'number' ? data.height : 360;
    processedData.totalFrames = typeof data.totalFrames === 'number' ? data.totalFrames : 0;
  }


  return processedData as T;
};


// --- Standard App Functions (Communities, Posts, etc.) ---
// ... (keep existing functions like getCommunities, getCommunityDetails, etc.)
export async function getCommunities(): Promise<Community[]> {
  noStore();
  const communitiesCol = collection(db, 'communities');
  const q = query(communitiesCol, orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Community>(docSnap));
  } catch (error) {
    console.error("Error fetching communities:", error);
    return [];
  }
}

export async function getCommunityDetails(communityId: string): Promise<Community | null> {
  noStore();
  if (!communityId) return null;
  const communityDocRef = doc(db, 'communities', communityId);
  try {
    const docSnap = await getDoc(communityDocRef);
    if (docSnap.exists()) {
      return processDoc<Community>(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching community details for ${communityId}:`, error);
    return null;
  }
}

export async function getPostsForCommunity(communityId: string, count: number = 10): Promise<Post[]> {
  noStore();
  const postsCol = collection(db, 'posts');
  const q = query(
    postsCol,
    where('communityId', '==', communityId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
  } catch (error) {
    console.error(`Error fetching posts for community ${communityId}:`, error);
    return [];
  }
}

export async function getRecentPosts(count: number = 10): Promise<Post[]> {
  noStore();
  const postsCol = collection(db, 'posts');
  const q = query(postsCol, orderBy('createdAt', 'desc'), limit(count));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    return [];
  }
}

export async function getPostDetails(postId: string): Promise<Post | null> {
  noStore();
  const postDocRef = doc(db, 'posts', postId);
  try {
    const docSnap = await getDoc(postDocRef);
    if (docSnap.exists()) {
      return processDoc<Post>(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching post details for ${postId}:`, error);
    return null;
  }
}


export async function getCommentsForPostSSR(postId: string): Promise<Comment[]> {
  noStore();
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Comment>(docSnap));
  } catch (error) {
    console.error(`Error fetching comments SSR for post ${postId}:`, error);
    return [];
  }
}

export function getCommentsForPostRealtime(
  postId: string,
  callback: (comments: Comment[]) => void,
  onError?: (error: Error) => void
): () => void {
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      let createdAtStr: string;
      if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
        createdAtStr = (data.createdAt as Timestamp).toDate().toISOString();
      } else if (data.createdAt instanceof Date) {
        createdAtStr = data.createdAt.toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt;
      } else if (data.createdAt) {
         try {
             createdAtStr = new Date(data.createdAt).toISOString();
         } catch {
            createdAtStr = new Date().toISOString();
         }
      }
      else {
        createdAtStr = new Date().toISOString();
      }
      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAtStr,
      } as Comment;
    });
    callback(comments);
  }, (error) => {
    console.error("Error in getCommentsForPostRealtime snapshot: ", error);
    if (onError) onError(error);
  });

  return unsubscribe;
}


export async function getDiscoverableUsers(currentUserId: string | null, count: number = 20): Promise<UserProfile[]> {
    noStore();
    const usersCol = collection(db, 'users');
    let q;
    if (currentUserId) {
        q = query(
            usersCol,
            where('onboardingCompleted', '==', true),
            where('uid', '!=', currentUserId), // Exclude current user
            orderBy('uid'), // Firestore requires orderBy on the field used in inequality
            // orderBy('displayName', 'asc'), // Then sort by name, but this might need another index
            limit(count)
        );
    } else {
        // Fallback if no current user, or show all discoverable users
        q = query(usersCol, where('onboardingCompleted', '==', true), orderBy('displayName', 'asc'), limit(count));
    }

    try {
        const snapshot = await getDocs(q);
        let users = snapshot.docs.map(docSnap => processDoc<UserProfile>(docSnap));
        // Client-side sort if initial sort wasn't by displayName due to inequality constraint
        if (currentUserId) {
            users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        }
        return users;
    } catch (error) {
        console.error("Error fetching discoverable users:", error);
        return [];
    }
}

export async function getUserPosts(userId: string, count: number = 10): Promise<Post[]> {
  noStore();
  if (!userId) return [];
  const postsCol = collection(db, 'posts');
  const q = query(
    postsCol,
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    return [];
  }
}

export async function getUserJoinedCommunities(userId: string): Promise<Community[]> {
  noStore();
  if (!userId) return [];
  const communitiesCol = collection(db, 'communities');
  const q = query(
    communitiesCol,
    where('members', 'array-contains', userId),
    orderBy('name', 'asc')
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<Community>(docSnap));
  } catch (error) {
    console.error(`Error fetching joined communities for user ${userId}:`, error);
    return [];
  }
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  noStore();
  if (!currentUserId || !targetUserId) return false;
  try {
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    const docSnap = await getDoc(followingRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

export async function getFollowers(userId: string, count: number = 10): Promise<Partial<UserProfile>[]> {
    noStore();
    if (!userId) return [];
    const followersColRef = collection(db, 'users', userId, 'followers');
    const q = query(followersColRef, orderBy('followedAt', 'desc'), limit(count));

    try {
      const snapshot = await getDocs(q);
      const followerProfiles: Partial<UserProfile>[] = [];
      for (const followerDoc of snapshot.docs) {
          const followerData = followerDoc.data();
          if (followerData.userId) {
            const userProfileDoc = await getDoc(doc(db, 'users', followerData.userId));
            if (userProfileDoc.exists()) {
                const profile = processDoc<UserProfile>(userProfileDoc);
                followerProfiles.push({
                    uid: userProfileDoc.id,
                    displayName: profile.displayName,
                    photoURL: profile.photoURL,
                });
            }
          }
      }
      return followerProfiles;
    } catch (error) {
      console.error(`Error fetching followers for user ${userId}:`, error);
      return [];
    }
}

export async function getFollowing(userId: string, count: number = 10): Promise<Partial<UserProfile>[]> {
    noStore();
    if (!userId) return [];
    const followingColRef = collection(db, 'users', userId, 'following');
    const q = query(followingColRef, orderBy('followedAt', 'desc'), limit(count));
    try {
      const snapshot = await getDocs(q);
      const followingProfiles: Partial<UserProfile>[] = [];
      for (const followingDoc of snapshot.docs) {
          const followingData = followingDoc.data();
          if (followingData.userId) {
            const userProfileDoc = await getDoc(doc(db, 'users', followingData.userId));
            if (userProfileDoc.exists()) {
                const profile = processDoc<UserProfile>(userProfileDoc);
                followingProfiles.push({
                    uid: userProfileDoc.id,
                    displayName: profile.displayName,
                    photoURL: profile.photoURL,
                });
            }
          }
      }
      return followingProfiles;
    } catch (error) {
      console.error(`Error fetching following for user ${userId}:`, error);
      return [];
    }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    noStore();
    if (!userId) return null;
    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return processDoc<UserProfile>(docSnap);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        return null;
    }
}

export async function getAllUsersForNewChat(currentUserId: string, count: number = 50): Promise<UserProfile[]> {
  noStore();
  const usersCol = collection(db, 'users');
  const q = query(
    usersCol,
    where('uid', '!=', currentUserId), // Exclude current user
    where('onboardingCompleted', '==', true), // Only onboarded users
    orderBy('uid'), // Firestore requires orderBy on the field used in inequality
    // orderBy('displayName', 'asc'), // This would need a composite index
    limit(count)
  );

  try {
    const snapshot = await getDocs(q);
    // Client-side sort by displayName as Firestore composite index might not be set up for uid != and displayName sort
    return snapshot.docs
      .map(docSnap => processDoc<UserProfile>(docSnap))
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
      .slice(0, count);
  } catch (error) {
    console.error("Error fetching all users for new chat:", error);
    return [];
  }
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
    noStore();
    if (!email) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email), limit(1));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return processDoc<UserProfile>(querySnapshot.docs[0]);
        }
        return null;
    } catch (error) {
        console.error(`Error finding user by email ${email}:`, error);
        return null;
    }
}

// --- Tearix 2D Animation Functions ---

export async function createAnimationProject(
  projectData: Pick<AnimationProject, 'title' | 'ownerId' | 'fps' | 'width' | 'height'>
): Promise<string> {
  const projectsColRef = collection(db, 'projects');
  const newProject: Omit<AnimationProject, 'id'> = {
    ...projectData,
    createdAt: serverTimestamp() as unknown as string, // Firestore handles conversion
    updatedAt: serverTimestamp() as unknown as string,
    allowedUsers: [projectData.ownerId],
    totalFrames: 0, // Initial project has 0 frames, first frame added by client
    thumbnailUrl: null,
  };
  const docRef = await addDoc(projectsColRef, newProject);
  return docRef.id;
}

export async function getUserAnimationProjects(userId: string): Promise<AnimationProject[]> {
  noStore();
  const projectsColRef = collection(db, 'projects');
  // Query for projects where the user is in the allowedUsers array
  const q = query(
    projectsColRef,
    where('allowedUsers', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<AnimationProject>(docSnap));
  } catch (error) {
    console.error(`Error fetching animation projects for user ${userId}:`, error);
    // Check error message for index creation link if it's an index issue
    if (error.message.includes("query requires an index")) {
        console.warn("Firestore query requires a custom index. Please create it in the Firebase console. The error message usually provides a direct link.");
    }
    return [];
  }
}

export async function getAnimationProjectMetadata(projectId: string): Promise<AnimationProject | null> {
  noStore();
  const projectDocRef = doc(db, 'projects', projectId);
  try {
    const docSnap = await getDoc(projectDocRef);
    if (docSnap.exists()) {
      return processDoc<AnimationProject>(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching animation project metadata for ${projectId}:`, error);
    return null;
  }
}

export async function updateAnimationProjectMetadata(
  projectId: string,
  dataToUpdate: Partial<Pick<AnimationProject, 'title' | 'fps' | 'width' | 'height' | 'totalFrames' | 'thumbnailUrl'>>
): Promise<void> {
  const projectDocRef = doc(db, 'projects', projectId);
  await updateDoc(projectDocRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
}

export async function saveAnimationFrame(projectId: string, frameData: AnimationFrameData): Promise<void> {
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameData.id);
  // Ensure projectId is part of the frameData to be saved, matching Firestore rules
  const dataToSet = {
    ...frameData,
    projectId: projectId, // Explicitly set projectId in the document
    updatedAt: serverTimestamp(),
  };
  if (!frameData.createdAt) { // If it's a new frame without a client-set createdAt
    dataToSet.createdAt = serverTimestamp();
  }
  await setDoc(frameDocRef, dataToSet, { merge: true }); // Use setDoc with merge to create or update
}

export async function loadAllAnimationFrames(projectId: string): Promise<AnimationFrameData[]> {
  noStore();
  const framesColRef = collection(db, 'projects', projectId, 'frames');
  const q = query(framesColRef, orderBy('frameNumber', 'asc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => processDoc<AnimationFrameData>(docSnap));
  } catch (error) {
    console.error(`Error loading frames for project ${projectId}:`, error);
    return [];
  }
}

export async function deleteAnimationFrame(projectId: string, frameId: string): Promise<void> {
  const frameDocRef = doc(db, 'projects', projectId, 'frames', frameId);
  await deleteDoc(frameDocRef);
}

export async function updateAnimationFrameOrderBatch(projectId: string, frames: Pick<AnimationFrameData, 'id' | 'frameNumber'>[]): Promise<void> {
  const batch = writeBatch(db);
  frames.forEach(frame => {
    const frameRef = doc(db, 'projects', projectId, 'frames', frame.id);
    batch.update(frameRef, { frameNumber: frame.frameNumber, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

// Cloud function caller
let addFriendToAnimationProjectCallable: HttpsCallable<{ projectId: string; friendEmail: string; }, { success: boolean; message: string; collaborator?: CollaboratorProfile }> | null = null;

export async function callAddFriendToAnimationProject(projectId: string, friendEmail: string): Promise<{ success: boolean; message: string; collaborator?: CollaboratorProfile }> {
  if (!addFriendToAnimationProjectCallable) {
    const functions = getFunctions(app); // Pass the FirebaseApp instance
    addFriendToAnimationProjectCallable = httpsCallable(functions, 'addFriendToAnimationProject');
  }
  try {
    const result = await addFriendToAnimationProjectCallable({ projectId, friendEmail });
    return result.data as { success: boolean; message: string; collaborator?: CollaboratorProfile };
  } catch (error: any) {
    console.error("Error calling addFriendToAnimationProject:", error);
    return { success: false, message: error.message || "Failed to add collaborator." };
  }
}

export async function getCollaboratorProfiles(uids: string[]): Promise<CollaboratorProfile[]> {
  if (!uids || uids.length === 0) return [];
  noStore();
  const profiles: CollaboratorProfile[] = [];
  // Firestore 'in' queries are limited to 30 elements. For more, batch or fetch individually.
  // For simplicity, fetching individually here. Batching is better for >10-30 UIDs.
  for (const uid of uids) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        profiles.push({
          uid: userDoc.id,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          email: data.email || null,
        });
      }
    } catch (error) {
      console.error(`Error fetching profile for UID ${uid}:`, error);
    }
  }
  return profiles;
}

