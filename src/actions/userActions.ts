
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  writeBatch,
  increment,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/contexts/AuthContext';

async function revalidateProfilePaths(userId: string, otherUserId?: string) {
  revalidatePath(`/profile`); // Current user's main profile page
  // Later, if dynamic profile pages exist:
  // revalidatePath(`/profile/${userId}`);
  if (otherUserId) {
    // revalidatePath(`/profile/${otherUserId}`);
  }
}

export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; message: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { success: false, message: 'Invalid user IDs.' };
  }

  const batch = writeBatch(db);

  // Add targetUser to currentUser's "following" subcollection & update currentUser's "followingCount"
  const currentUserFollowingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  batch.set(currentUserFollowingRef, { userId: targetUserId, followedAt: serverTimestamp() });
  const currentUserRef = doc(db, 'users', currentUserId);
  batch.update(currentUserRef, { followingCount: increment(1) });

  // Add currentUser to targetUser's "followers" subcollection & update targetUser's "followersCount"
  const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  batch.set(targetUserFollowersRef, { userId: currentUserId, followedAt: serverTimestamp() });
  const targetUserRef = doc(db, 'users', targetUserId);
  batch.update(targetUserRef, { followersCount: increment(1) });

  try {
    await batch.commit();
    await revalidateProfilePaths(currentUserId, targetUserId);
    return { success: true, message: 'Successfully followed user.' };
  } catch (error: any) {
    console.error('Error following user:', error);
    return { success: false, message: error.message || 'Could not follow user.' };
  }
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; message: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { success: false, message: 'Invalid user IDs.' };
  }

  const batch = writeBatch(db);

  // Remove targetUser from currentUser's "following" subcollection & update currentUser's "followingCount"
  const currentUserFollowingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
  batch.delete(currentUserFollowingRef);
  const currentUserRef = doc(db, 'users', currentUserId);
  batch.update(currentUserRef, { followingCount: increment(-1) });

  // Remove currentUser from targetUser's "followers" subcollection & update targetUser's "followersCount"
  const targetUserFollowersRef = doc(db, 'users', targetUserId, 'followers', currentUserId);
  batch.delete(targetUserFollowersRef);
  const targetUserRef = doc(db, 'users', targetUserId);
  batch.update(targetUserRef, { followersCount: increment(-1) });

  try {
    await batch.commit();
     await revalidateProfilePaths(currentUserId, targetUserId);
    return { success: true, message: 'Successfully unfollowed user.' };
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    return { success: false, message: error.message || 'Could not unfollow user.' };
  }
}

    