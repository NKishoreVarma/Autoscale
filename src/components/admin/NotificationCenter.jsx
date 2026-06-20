import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  X, Users, Inbox, Clock, CreditCard, CheckSquare, Bell, 
  Building2, FolderKanban, Calendar, Archive, Check, ArchiveRestore 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons = {
  new_lead: Users,
  new_booking: Calendar,
  lead_converted: Building2,
  project_created: FolderKanban,
  project_completed: CheckSquare,
  new_inquiry: Inbox,
  project_deadline: Clock,
  payment_due: CreditCard,
  task_assigned: CheckSquare,
  meeting_booked: Calendar
};

const typeColors = {
  new_lead: 'text-amber-400 bg-amber-950/20 border-amber-500/20',
  new_booking: 'text-blue-400 bg-blue-950/20 border-blue-500/20',
  lead_converted: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20',
  project_created: 'text-purple-400 bg-purple-950/20 border-purple-500/20',
  project_completed: 'text-violet-400 bg-violet-950/20 border-violet-500/20',
  new_inquiry: 'text-blue-400 bg-blue-950/20 border-blue-500/20',
  project_deadline: 'text-rose-400 bg-rose-950/20 border-rose-500/20',
  payment_due: 'text-orange-400 bg-orange-950/20 border-orange-500/20',
  task_assigned: 'text-purple-400 bg-purple-950/20 border-purple-500/20',
  meeting_booked: 'text-blue-400 bg-blue-950/20 border-blue-500/20'
};

function formatTimestamp(ts) {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function isToday(ts) {
  if (!ts?.toDate) return false;
  const date = ts.toDate();
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
}

export default function NotificationCenter({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unread'); // 'unread' | 'all' | 'archived'

  useEffect(() => {
    // Listen to the most recent 100 notifications for fast client-side switching
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.error('NotificationCenter listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleArchive = async (e, notifId) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'notifications', notifId), { archived: true });
    } catch (err) {
      console.error('Error archiving notification:', err);
    }
  };

  const handleUnarchive = async (e, notifId) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'notifications', notifId), { archived: false });
    } catch (err) {
      console.error('Error unarchiving notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read && !n.archived).forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  // Filter local listings in client memory for optimal tab speeds
  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read && !n.archived;
    if (activeTab === 'archived') return n.archived === true;
    return !n.archived; // 'all' tab filters out archived notifications
  });

  const todayNotifs = filteredNotifs.filter(n => isToday(n.createdAt));
  const earlierNotifs = filteredNotifs.filter(n => !isToday(n.createdAt));
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-black border-l border-white/10 h-full flex flex-col z-10"
          >
            {/* Header */}
            <div className="flex flex-col border-b border-white/10 bg-white/[0.01]">
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
                    NOTIFICATION CENTER
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && activeTab === 'unread' && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold tracking-wider uppercase text-gray-400 hover:text-white transition px-2 py-1 rounded hover:bg-white/5"
                    >
                      Mark All Read
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs list row */}
              <div className="flex px-6 gap-4 border-t border-white/5">
                {[
                  { id: 'unread', label: 'Unread' },
                  { id: 'all', label: 'All Activity' },
                  { id: 'archived', label: 'Archived' }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-3 text-[10px] font-bold tracking-wider uppercase relative transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5E0ED7]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
                </div>
              ) : filteredNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Bell className="w-8 h-8 text-gray-700" />
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold font-mono">
                    No records found
                  </span>
                  <p className="text-[10px] text-gray-600 font-light max-w-xs text-center normal-case leading-relaxed">
                    {activeTab === 'unread' 
                      ? 'You are all caught up! No unread notifications.' 
                      : activeTab === 'archived' 
                        ? 'Archive folder is empty.' 
                        : 'No recent activities recorded.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Today Section */}
                  {todayNotifs.length > 0 && (
                    <div>
                      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
                        <span className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                          Today
                        </span>
                      </div>
                      {todayNotifs.map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          notif={notif}
                          onMarkRead={handleMarkRead}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          activeTab={activeTab}
                        />
                      ))}
                    </div>
                  )}

                  {/* Earlier Section */}
                  {earlierNotifs.length > 0 && (
                    <div>
                      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
                        <span className="text-[9px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                          Earlier
                        </span>
                      </div>
                      {earlierNotifs.map((notif) => (
                        <NotificationItem
                          key={notif.id}
                          notif={notif}
                          onMarkRead={handleMarkRead}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          activeTab={activeTab}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NotificationItem({ notif, onMarkRead, onArchive, onUnarchive, activeTab }) {
  const Icon = typeIcons[notif.type] || Bell;
  const colorClass = typeColors[notif.type] || 'text-gray-400 bg-white/5 border-white/10';

  return (
    <div
      onClick={() => !notif.read && onMarkRead(notif.id)}
      className={`w-full text-left px-6 py-4 border-b border-white/5 flex gap-4 items-start transition duration-200 hover:bg-white/[0.02] relative group ${
        !notif.read ? 'bg-white/[0.01] cursor-pointer' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center mt-0.5 ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-8">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider truncate ${
            !notif.read ? 'text-white' : 'text-gray-400'
          }`}>
            {notif.title || 'Notification'}
          </span>
          {!notif.read && (
            <div className="w-2 h-2 rounded-full bg-[#5E0ED7] flex-shrink-0" />
          )}
        </div>
        <p className={`text-xs leading-relaxed font-light ${
          !notif.read ? 'text-gray-300' : 'text-gray-500'
        }`}>
          {notif.message || ''}
        </p>
        <span className="text-[9px] text-gray-600 font-mono mt-0.5">
          {formatTimestamp(notif.createdAt)}
        </span>
      </div>

      {/* Action triggers displayed on hover */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/80 px-1.5 py-1 backdrop-blur-md rounded-lg border border-white/10">
        {!notif.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notif.id);
            }}
            className="p-1 rounded hover:bg-white/5 text-emerald-400 hover:text-emerald-300 transition"
            title="Mark as Read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        {activeTab === 'archived' ? (
          <button
            onClick={(e) => onUnarchive(e, notif.id)}
            className="p-1 rounded hover:bg-white/5 text-purple-400 hover:text-purple-300 transition"
            title="Unarchive"
          >
            <ArchiveRestore className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={(e) => onArchive(e, notif.id)}
            className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white transition"
            title="Archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
