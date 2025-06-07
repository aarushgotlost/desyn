
import { db, auth } from '@/lib/firebase'; // Added auth
import type { Community, Post } from '@/types/data';
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


// Helper to get current user ID on the server (basic example, might need more robust solution for edge cases or if not using server actions directly with auth context)
// This is a simplified approach. For robust server-side auth in Next.js App Router,
// you'd typically rely on patterns provided by auth libraries like NextAuth.js, or pass tokens via cookies.
// For this context, if this is called from a server component that doesn't have easy access to useAuth(),
// it's a placeholder. The client component CommunityJoinButton will use useAuth().
export async function getCurrentUserId(): Promise<string | null> {
  noStore(); // Opt out of caching for this function if it relies on dynamic auth state
  // This is a very basic way and might not always work depending on auth state propagation to server components.
  // A more reliable method for server components is usually specific to the auth setup (e.g., NextAuth.js `getServerSession`).
  // For client components calling server actions, the UID is usually passed as an argument.
  // For now, let's assume this function might not be fully reliable on its own in all server contexts.
  // The CommunityJoinButton on the client will provide the definitive UID.
  
  // The `auth.currentUser` object is primarily for client-side use.
  // If you need the user ID in a Server Component for data fetching that *depends* on the user,
  // you'd typically use a server-side session mechanism.
  // For now, returning null, and the client component will handle it.
  return null; 
}


// Helper to convert Firestore Timestamps to Date objects for client-side processing if needed
// And to ensure all fields are present, even if undefined in Firestore
const processDoc = <T extends { id: string; createdAt?: Timestamp | Date; members?: string[] }>(docSnap: any): T => {
  const data = docSnap.data();
  const processedData = {
    id: docSnap.id,
    ...data,
    // Ensure members array exists for communities
    members: data.members || [],
  };

  // Convert Timestamps to Dates if they exist, or keep as is if already Date (e.g., from serverTimestamp())
  if (data.createdAt && data.createdAt.toDate) {
    processedData.createdAt = data.createdAt.toDate();
  }
  if (data.lastMessageAt && data.lastMessageAt.toDate) {
    processedData.lastMessageAt = data.lastMessageAt.toDate();
  }
   if (data.updatedAt && data.updatedAt.toDate) {
    processedData.updatedAt = data.updatedAt.toDate();
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

// Example of a service to get all users for the "New Chat" page (placeholder functionality)
// This would need proper pagination and indexing in a real app.
export async function getAllUsersForNewChat(currentUserId: string | null, count: number = 20): Promise<any[]> {
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
        return snapshot.docs.map(docSnap => ({
            uid: docSnap.id,
            displayName: docSnap.data().displayName || "Unknown User",
            photoURL: docSnap.data().photoURL,
            email: docSnap.data().email,
        }));
    } catch (error) {
        console.error("Error fetching users for new chat:", error);
        // Depending on Firestore rules, this might fail if not authenticated,
        // or if indexes are required for more complex queries.
        return [];
    }
}
