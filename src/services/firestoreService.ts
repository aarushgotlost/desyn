
import { db, auth } from '@/lib/firebase'; 
import type { Community, Post, Comment, Meeting } from '@/types/data';
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
  // This is a placeholder. In a real app, you'd get the current user's ID from an auth session.
  // For now, we'll assume client-side components handle auth state.
  // If server-side auth is set up, this would be different.
  // For the purpose of this prototype, if auth.currentUser is available (during server rendering in some contexts or if cached), use it.
  // This is generally NOT how you get current user ID reliably in Next.js App Router server components.
  // Auth state should be managed through context or session providers.
  // return auth.currentUser ? auth.currentUser.uid : null; 
  return null; // Let client components use useAuth()
}

const processDoc = <T extends { id: string; createdAt?: string | Timestamp | Date; updatedAt?: string | Timestamp | Date; lastLogin?: string | Timestamp | Date; lastMessageAt?: string | Timestamp | Date; members?: string[]; authorAvatar?: string | null; photoURL?: string | null; bannerURL?: string | null; followersCount?: number; followingCount?: number; skills?: string[]; hostProfile?: any; participants?: any[]; }>(docSnap: any): T => {
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
    } else if (fieldValue) { 
        try {
            processedData[field] = new Date(fieldValue).toISOString();
        } catch (e) {
            processedData[field] = fieldValue; 
        }
    }
  });


  if (data.members) {
    processedData.members = data.members;
  } else if (docSnap.ref.parent.id === 'communities' || docSnap.ref.path.includes('communities')) { 
    processedData.members = []; 
  }

  if ('authorId' in data) { 
      processedData.authorAvatar = data.authorAvatar || null;
  }
  
  // Check for user profile specific fields
  if (typeof data.uid !== 'undefined' || docSnap.ref.parent.id === 'users') { 
      processedData.photoURL = data.photoURL || null;
      processedData.bannerURL = data.bannerURL || null;
      processedData.followersCount = data.followersCount || 0;
      processedData.followingCount = data.followingCount || 0;
      processedData.bio = data.bio || '';
      processedData.skills = data.skills || [];
      processedData.interests = data.interests || [];
      processedData.onboardingCompleted = typeof data.onboardingCompleted === 'boolean' ? data.onboardingCompleted : false;
  }
  
  // Process meeting specific fields
  if (docSnap.ref.parent.id === 'meetings') {
    if (data.hostProfile) {
        processedData.hostProfile = data.hostProfile;
    }
    if (data.participants) {
        processedData.participants = data.participants.map((p: any) => ({
            ...p,
            joinedAt: (p.joinedAt as Timestamp)?.toDate ? (p.joinedAt as Timestamp).toDate().toISOString() : new Date(p.joinedAt).toISOString(),
        }));
    } else {
        processedData.participants = [];
    }
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
            // Sort client-side after filtering to avoid composite index if displayName is primary sort
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
  // Query for users, excluding the current user, ordered by displayName
  const q = query(
    usersCol,
    where('uid', '!=', currentUserId),
    where('onboardingCompleted', '==', true), // Only users who completed onboarding
    orderBy('uid'), // Firestore requires an orderBy on a field involved in inequality filter
    // limit(count) // Apply limit if needed
  );
  
  const snapshot = await getDocs(q);
  // Manually sort by displayName after fetching, as Firestore might not allow orderBy('displayName') with '!=' on 'uid'
  return snapshot.docs
    .map(docSnap => processDoc<UserProfile>(docSnap))
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
    .slice(0, count); // Apply limit after sorting
}


// Meeting specific firestore services
export async function getActiveMeetings(): Promise<Meeting[]> {
  noStore();
  const meetingsCol = collection(db, 'meetings');
  const q = query(meetingsCol, where('isActive', '==', true), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => processDoc<Meeting>(docSnap));
}

export async function getMeetingDetailsFirestore(meetingId: string): Promise<Meeting | null> {
  noStore();
  if (!meetingId) return null;
  const meetingDocRef = doc(db, 'meetings', meetingId);
  const docSnap = await getDoc(meetingDocRef);
  if (docSnap.exists()) {
    return processDoc<Meeting>(docSnap);
  }
  return null;
}
