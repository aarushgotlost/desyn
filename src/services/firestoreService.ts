
import { db, auth } from '@/lib/firebase'; 
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
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';


export async function getCurrentUserId(): Promise<string | null> {
  noStore();
  // This function is a placeholder. In a real server component scenario,
  // you'd get the user ID from a server-side session or similar.
  // For client components, `useAuth` hook provides the user.
  // For actions, you'd typically pass userId as an argument.
  return null; 
}

// Generic processor for Firestore document snapshots
const processDoc = <T extends { id: string; createdAt?: string | Timestamp | Date; updatedAt?: string | Timestamp | Date; lastLogin?: string | Timestamp | Date; lastMessageAt?: string | Timestamp | Date; members?: string[]; authorAvatar?: string | null; photoURL?: string | null; bannerURL?: string | null }>(docSnap: any): T => {
  const data = docSnap.data();
  const processedData: any = {
    id: docSnap.id,
    ...data,
  };

  // Standardize date fields to ISO strings
  const dateFields: (keyof T)[] = ['createdAt', 'updatedAt', 'lastLogin', 'lastMessageAt'];
  dateFields.forEach(field => {
    const fieldValue = data[field];
    if (fieldValue && typeof (fieldValue as Timestamp).toDate === 'function') {
      processedData[field] = (fieldValue as Timestamp).toDate().toISOString();
    } else if (fieldValue instanceof Date) {
      processedData[field] = fieldValue.toISOString();
    } else if (typeof fieldValue === 'string') { 
      // Attempt to parse if it might be a different date string format, or keep as is if valid ISO
      try {
        const d = new Date(fieldValue);
        if (!isNaN(d.getTime())) {
          processedData[field] = d.toISOString();
        } else {
          processedData[field] = fieldValue; // Keep original if not a parsable date
        }
      } catch (e) {
        processedData[field] = fieldValue; // Keep original on error
      }
    } else if (fieldValue) { // Fallback for numbers or other convertible types
        try {
            processedData[field] = new Date(fieldValue).toISOString();
        } catch (e) {
            // console.warn(`Could not convert field ${String(field)} to ISOString:`, fieldValue); // Avoid console logs
            processedData[field] = fieldValue; 
        }
    }
  });


  // Ensure 'members' array exists for Community type, even if empty in Firestore
  if (data.members) {
    processedData.members = data.members;
  } else if (docSnap.ref.parent.id === 'communities' || docSnap.ref.path.includes('communities')) { 
    // Heuristic to identify if it's a community document or related
    processedData.members = []; 
  }

  // Handle optional avatar/photo fields
  if ('authorId' in data) { // For Post type
      processedData.authorAvatar = data.authorAvatar || null;
  }
  if ('uid' in data) { // For UserProfile type
      processedData.photoURL = data.photoURL || null;
      processedData.bannerURL = data.bannerURL || null; // Ensure bannerURL is also handled
  }


  return processedData as T;
};

export async function getCommunities(): Promise<Community[]> {
  noStore();
  const communitiesCol = collection(db, 'communities');
  const q = query(communitiesCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Community>(docSnap));
}

export async function getCommunityDetails(communityId: string): Promise<Community | null> {
  noStore();
  if (!communityId) return null;
  const communityDocRef = doc(db, 'communities', communityId);
  const docSnap = await getDoc(communityDocRef);
  if (docSnap.exists()) {
    return processDoc<Community>(docSnap);
  }
  return null;
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
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
}

export async function getRecentPosts(count: number = 10): Promise<Post[]> {
  noStore();
  const postsCol = collection(db, 'posts');
  const q = query(postsCol, orderBy('createdAt', 'desc'), limit(count));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
}

export async function getPostDetails(postId: string): Promise<Post | null> {
  noStore();
  const postDocRef = doc(db, 'posts', postId);
  const docSnap = await getDoc(postDocRef);
  if (docSnap.exists()) {
    return processDoc<Post>(docSnap);
  }
  return null;
}


export async function getCommentsForPostSSR(postId: string): Promise<Comment[]> {
  noStore();
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Comment>(docSnap));
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
      // Ensure createdAt is consistently an ISO string
      let createdAtStr: string;
      if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
        createdAtStr = (data.createdAt as Timestamp).toDate().toISOString();
      } else if (data.createdAt instanceof Date) {
        createdAtStr = data.createdAt.toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtStr = data.createdAt; // Assume it's already ISO
      } else if (data.createdAt) {
         try {
             createdAtStr = new Date(data.createdAt).toISOString();
         } catch {
            createdAtStr = new Date().toISOString(); // Fallback
         }
      }
      else {
        createdAtStr = new Date().toISOString(); // Fallback if undefined
      }
      return {
        id: docSnap.id,
        ...data,
        createdAt: createdAtStr,
      } as Comment;
    });
    callback(comments);
  }, (error) => {
    // console.error("Error fetching comments in real-time: ", error); // Avoid console logs
    if (onError) onError(error);
  });

  return unsubscribe; 
}


export async function getAllUsersForNewChat(currentUserId: string | null, count: number = 20): Promise<UserProfile[]> {
    noStore();
    const usersCol = collection(db, 'users');
    let q;
    if (currentUserId) {
        q = query(usersCol, where('uid', '!=', currentUserId), limit(count));
    } else {
        q = query(usersCol, limit(count));
    }
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => processDoc<UserProfile>(docSnap));
    } catch (error) {
        // console.error("Error fetching users for new chat:", error); // Avoid console logs
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
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Post>(docSnap));
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
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Community>(docSnap));
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  noStore();
  if (!currentUserId || !targetUserId) return false;
  const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  const docSnap = await getDoc(followingRef);
  return docSnap.exists();
}

export async function getFollowers(userId: string, count: number = 10): Promise<Partial<UserProfile>[]> {
    noStore();
    if (!userId) return [];
    const followersColRef = collection(db, 'users', userId, 'followers');
    const q = query(followersColRef, orderBy('followedAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    
    const followerProfiles: Partial<UserProfile>[] = [];
    for (const followerDoc of snapshot.docs) {
        const followerData = followerDoc.data();
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
    return followerProfiles;
}

export async function getFollowing(userId: string, count: number = 10): Promise<Partial<UserProfile>[]> {
    noStore();
    if (!userId) return [];
    const followingColRef = collection(db, 'users', userId, 'following');
    const q = query(followingColRef, orderBy('followedAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);

    const followingProfiles: Partial<UserProfile>[] = [];
    for (const followingDoc of snapshot.docs) {
        const followingData = followingDoc.data();
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
    return followingProfiles;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    noStore();
    if (!userId) return null;
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        return processDoc<UserProfile>(docSnap);
    }
    return null;
}
