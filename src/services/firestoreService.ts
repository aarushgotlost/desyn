
import { db, auth } from '@/lib/firebase'; 
import type { Community, Post } from '@/types/data';
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
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';


export async function getCurrentUserId(): Promise<string | null> {
  noStore(); 
  return null; 
}

const processDoc = <T extends { id: string; createdAt?: Timestamp | Date; members?: string[]; authorAvatar?: string | null; photoURL?: string | null }>(docSnap: any): T => {
  const data = docSnap.data();
  const processedData: any = {
    id: docSnap.id,
    ...data,
  };

  if (data.members) {
    processedData.members = data.members;
  } else if (docSnap.ref.parent.id === 'communities' || docSnap.ref.path.includes('communities')) { 
    processedData.members = []; // Ensure members array exists for communities if field is missing
  }


  if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    processedData.createdAt = data.createdAt.toDate();
  }
  if (data.lastMessageAt && typeof data.lastMessageAt.toDate === 'function') {
    processedData.lastMessageAt = data.lastMessageAt.toDate();
  }
  if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
    processedData.updatedAt = data.updatedAt.toDate();
  }
   if (data.lastLogin && typeof data.lastLogin.toDate === 'function') {
    processedData.lastLogin = data.lastLogin.toDate();
  }

  // Ensure avatar/photoURL fields are at least null if not present
  if (data.authorId) { // Check if it's a Post-like object
      processedData.authorAvatar = data.authorAvatar || null;
  }
  if (data.uid) { // Check if it's a UserProfile-like object
      processedData.photoURL = data.photoURL || null;
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
        console.error("Error fetching users for new chat:", error);
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
    orderBy('name', 'asc') // Or 'createdAt' or another relevant field
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

// Basic versions for getFollowers/getFollowing, can be expanded with pagination
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
            const profile = userProfileDoc.data();
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
            const profile = userProfileDoc.data();
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

    