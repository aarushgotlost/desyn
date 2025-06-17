
import { db, auth, app } from '@/lib/firebase';
import type { Community, Post, Comment } from '@/types/data';
import type { UserProfile } from '@/contexts/AuthContext';
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
  // serverTimestamp, // No longer used directly here after animation removal
  // addDoc, // No longer used directly here after animation removal
  // updateDoc, // No longer used directly here after animation removal
  // arrayUnion, // No longer used directly here after animation removal
  // arrayRemove, // No longer used directly here after animation removal
  // writeBatch, // No longer used directly here after animation removal
  // deleteDoc,  // No longer used directly here after animation removal
  // setDoc  // No longer used directly here after animation removal
} from 'firebase/firestore';
// import { getFunctions, httpsCallable, type HttpsCallable } from 'firebase/functions'; // No longer needed if no callable functions are used from client
import { unstable_noStore as noStore } from 'next/cache';


export async function getCurrentUserId(): Promise<string | null> {
  noStore();
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
    processedData.members = Array.isArray(data.members) ? data.members : [];
  }


  if ('authorId' in data) { 
      processedData.authorAvatar = data.authorAvatar || null;
  }

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

  
  if ('likes' in data) { 
    processedData.likes = typeof data.likes === 'number' ? data.likes : 0;
  }
  if ('commentsCount' in data) { 
    processedData.commentsCount = typeof data.commentsCount === 'number' ? data.commentsCount : 0;
  }
  if ('memberCount' in data && docSnap.ref.parent.id === 'communities') { 
    processedData.memberCount = typeof data.memberCount === 'number' ? data.memberCount : 0;
  }
  
  return processedData as T;
};


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
            where('uid', '!=', currentUserId), 
            orderBy('uid'), 
            limit(count)
        );
    } else {
        q = query(usersCol, where('onboardingCompleted', '==', true), orderBy('displayName', 'asc'), limit(count));
    }

    try {
        const snapshot = await getDocs(q);
        let users = snapshot.docs.map(docSnap => processDoc<UserProfile>(docSnap));
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
    where('uid', '!=', currentUserId), 
    where('onboardingCompleted', '==', true), 
    orderBy('uid'), 
    limit(count)
  );

  try {
    const snapshot = await getDocs(q);
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

// --- Animation Project Functions (Removed) ---
// All functions related to animation projects have been removed.
// Example: createAnimationProject, getAnimationProjectDetails, etc.

// Firebase callable function invoker for animation (Removed)
// const functions = getFunctions(app);
// export const addCollaboratorToAnimationProject = httpsCallable... (Removed)
