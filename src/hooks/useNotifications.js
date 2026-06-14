import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(99)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error('Notifications listener error:', error);
      setUnreadCount(0);
    });

    return () => unsubscribe();
  }, []);

  return { unreadCount };
}
