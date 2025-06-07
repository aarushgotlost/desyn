
'use server';
import { db } from '@/lib/firebase';
import type { Notification, NotificationType, NotificationActor } from '@/types/notifications';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';

const processNotificationDoc = (docSnap: any): Notification => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    type: data.type,
    actor: data.actor,
    message: data.message,
    link: data.link,
    isRead: data.isRead,
    createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : new Date(data.createdAt as any).toISOString(),
    relatedEntityId: data.relatedEntityId,
  } as Notification;
};

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  actor: NotificationActor | null;
  message: string;
  link: string;
  relatedEntityId?: string;
}

export async function createNotification(data: CreateNotificationData): Promise<void> {
  try {
    const notificationsColRef = collection(db, 'notifications');
    await addDoc(notificationsColRef, {
      ...data,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    // Depending on the importance, you might want to throw the error
    // or handle it more gracefully (e.g., log to a dedicated error service)
  }
}

export async function getUserNotifications(
  userId: string,
  count: number = 20,
  onlyUnread: boolean = false
): Promise<Notification[]> {
  noStore();
  if (!userId) return [];

  const notificationsColRef = collection(db, 'notifications');
  let q = query(
    notificationsColRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  if (onlyUnread) {
    q = query(
      notificationsColRef,
      where('userId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(processNotificationDoc);
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
    noStore();
    if (!userId) return 0;
    const notificationsColRef = collection(db, 'notifications');
    const q = query(
        notificationsColRef,
        where('userId', '==', userId),
        where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}
