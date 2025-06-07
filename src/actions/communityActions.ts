
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Community } from '@/types/data';

export async function toggleCommunityMembership(
  communityId: string,
  userId: string
): Promise<{ success: boolean; message: string; isJoined?: boolean }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!communityId) {
    return { success: false, message: 'Community ID is missing.' };
  }

  const communityRef = doc(db, 'communities', communityId);

  try {
    const communitySnap = await getDoc(communityRef);
    if (!communitySnap.exists()) {
      return { success: false, message: 'Community not found.' };
    }

    const communityData = communitySnap.data() as Community;
    const isCurrentlyMember = communityData.members?.includes(userId);

    if (isCurrentlyMember) {
      // User wants to leave
      await updateDoc(communityRef, {
        members: arrayRemove(userId),
        memberCount: increment(-1),
      });
      revalidatePath(`/communities/${communityId}`);
      revalidatePath(`/communities`); // Also revalidate the list page
      return { success: true, message: 'Successfully left community.', isJoined: false };
    } else {
      // User wants to join
      await updateDoc(communityRef, {
        members: arrayUnion(userId),
        memberCount: increment(1),
      });
      revalidatePath(`/communities/${communityId}`);
      revalidatePath(`/communities`);
      return { success: true, message: 'Successfully joined community.', isJoined: true };
    }
  } catch (error: any) {
    console.error('Error toggling community membership:', error);
    return { success: false, message: error.message || 'Could not update membership.' };
  }
}
