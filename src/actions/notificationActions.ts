
'use server';
import { db }_ from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }
  if (!notificationId) {
    return { success: false, message: 'Notification ID is missing.' };
  }

  const notificationRef = doc(db, 'notifications', notificationId);

  try {
    // Optional: Check if the notification actually belongs to the user before marking read
    // const notificationSnap = await getDoc(notificationRef);
    // if (!notificationSnap.exists() || notificationSnap.data()?.userId !== userId) {
    //   return { success: false, message: 'Notification not found or access denied.' };
    // }

    await updateDoc(notificationRef, { isRead: true });
    revalidatePath('/notifications');
    // Consider revalidating a specific path if the notification count is displayed elsewhere and needs server-side update
    // For client-side components fetching count, they would refetch or use a listener.
    return { success: true, message: 'Notification marked as read.' };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { success: false, message: error.message || 'Could not mark notification as read.' };
  }
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }

  const notificationsColRef = collection(db, 'notifications');
  const q = query(
    notificationsColRef,
    where('userId', '==', userId),
    where('isRead', '==', false)
  );

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: true, message: 'No unread notifications to mark.' };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { isRead: true });
    });
    await batch.commit();

    revalidatePath('/notifications');
    return { success: true, message: 'All notifications marked as read.' };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, message: error.message || 'Could not mark all notifications as read.' };
  }
}
