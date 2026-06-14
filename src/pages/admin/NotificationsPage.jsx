import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Bell, Check, Trash2, Calendar, Users, MessageSquare, ShieldAlert, AlertCircle
} from 'lucide-react';

const NOTIFICATION_ICONS = {
  new_lead: Users,
  new_client: ShieldAlert,
  new_booking: Calendar,
  new_contact: MessageSquare,
  system: AlertCircle
};

const ICON_COLORS = {
  new_lead: 'text-amber-400 bg-amber-950/20 border-amber-500/20',
  new_client: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20',
  new_booking: 'text-blue-400 bg-blue-950/20 border-blue-500/20',
  new_contact: 'text-purple-400 bg-purple-950/20 border-purple-500/20',
  system: 'text-rose-400 bg-rose-950/20 border-rose-500/20'
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync notifications list (limited to 50 for display performance)
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error listening to notifications:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error('Error committing mark all as read batch:', err);
    }
  };

  const handleDeleteNotif = async (notifId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex-grow flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            WORKSPACE LOGS
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            ALERT CENTER
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="bg-white/5 hover:bg-white/10 text-white text-xs font-semibold tracking-wider rounded-lg px-4 py-2 border border-white/10 transition duration-200 uppercase flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All As Read</span>
          </button>
        )}
      </div>

      {/* Main Alert List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider p-6 rounded-xl border border-white/5 bg-white/[0.01]">
            No system notifications or alerts recorded.
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
            const colorClass = ICON_COLORS[notif.type] || 'text-gray-400 bg-white/5 border-white/10';

            return (
              <div
                key={notif.id}
                className={`p-5 rounded-xl border flex gap-4 items-start justify-between transition relative overflow-hidden ${
                  notif.read 
                    ? 'border-white/5 bg-white/[0.005] opacity-60' 
                    : 'border-white/10 bg-white/[0.02] shadow-[0_0_15px_rgba(255,255,255,0.01)]'
                }`}
              >
                {/* Unread indicator line */}
                {!notif.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#5E0ED7]" />
                )}

                <div className="flex gap-4 items-start">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      {notif.title}
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5E0ED7]" />
                      )}
                    </span>
                    <p className="text-xs text-gray-400 font-light leading-relaxed normal-case">
                      {notif.message}
                    </p>
                    <span className="text-[9px] text-gray-600 font-mono mt-1">
                      {notif.createdAt?.toDate 
                        ? notif.createdAt.toDate().toLocaleString('en-IN') 
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="w-7 h-7 rounded-full border border-white/10 hover:border-white/20 text-gray-400 hover:text-white flex items-center justify-center transition"
                      title="Mark as Read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotif(notif.id)}
                    className="w-7 h-7 rounded-full border border-red-500/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 flex items-center justify-center transition"
                    title="Delete Alert"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
