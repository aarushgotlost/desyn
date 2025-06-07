
import { db, auth } from '@/lib/firebase'; 
import type { Community, Post, Comment } from '@/types/data'; // Added Comment
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
  onSnapshot, // Added for real-time comment fetching if needed client-side directly
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';


export async function getCurrentUserId(): Promise<string | null> {
  noStore(); // This is a server-side utility, but auth state is best read client-side
  // For server components, if you absolutely need user ID, you'd get it from auth state passed down
  // or by using a library that bridges server-side auth.
  // For now, this function is a placeholder as direct auth.currentUser access is client-side.
  // Client components will use useAuth() hook.
  return null; 
}

const processDoc = <T extends { id: string; createdAt?: Timestamp | Date; updatedAt?: Timestamp | Date; lastLogin?: Timestamp | Date; lastMessageAt?: Timestamp | Date; members?: string[]; authorAvatar?: string | null; photoURL?: string | null }>(docSnap: any): T => {
  const data = docSnap.data();
  const processedData: any = {
    id: docSnap.id,
    ...data,
  };

  // Convert Firestore Timestamps to JS Date objects for serializability and client-side use
  const dateFields: (keyof T)[] = ['createdAt', 'updatedAt', 'lastLogin', 'lastMessageAt'];
  dateFields.forEach(field => {
    if (data[field] && typeof (data[field] as Timestamp).toDate === 'function') {
      processedData[field] = (data[field] as Timestamp).toDate();
    } else if (data[field]) { // If it's already a string or number from a previous toDate() or serverTimestamp direct value
        processedData[field] = new Date(data[field]);
    }
  });


  if (data.members) {
    processedData.members = data.members;
  } else if (docSnap.ref.parent.id === 'communities' || docSnap.ref.path.includes('communities')) { 
    processedData.members = []; 
  }

  // Ensure avatar/photoURL fields are at least null if not present
  if ('authorId' in data) { // Check if it's a Post-like object
      processedData.authorAvatar = data.authorAvatar || null;
  }
  if ('uid' in data) { // Check if it's a UserProfile-like object
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


// This function is for initial server-side fetch of comments if needed.
// Real-time updates should be handled by a client-side onSnapshot listener (e.g., in CommentList.tsx)
export async function getCommentsForPostSSR(postId: string): Promise<Comment[]> {
  noStore();
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Comment>(docSnap));
}

// Function to set up a real-time listener for comments (to be used client-side)
export function getCommentsForPostRealtime(
  postId: string,
  callback: (comments: Comment[]) => void,
  onError?: (error: Error) => void
): () => void {
  // This function should NOT have 'noStore()' as it's for client-side real-time updates.
  const commentsColRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsColRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(docSnap => processDoc<Comment>(docSnap));
    callback(comments);
  }, (error) => {
    console.error("Error fetching comments in real-time: ", error);
    if (onError) onError(error);
  });

  return unsubscribe; // Return the unsubscribe function
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

    
