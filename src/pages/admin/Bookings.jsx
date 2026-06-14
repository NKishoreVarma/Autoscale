import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import {
  Search, X, Check, Calendar, Trash2, Clock, Mail, Phone, User, Edit2, AlertCircle, CheckCircle2
} from 'lucide-react';

const STATUS_COLORS = {
  Pending: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Approved: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Scheduled: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Completed: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Rejected: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
  Cancelled: 'border-rose-500/20 text-rose-400 bg-rose-950/10'
};

export default function Bookings() {
  const { userRole, userProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Reschedule/Schedule states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [saving, setSaving] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Reset page index on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const isSuperAdmin = userRole === 'super_admin';

  // Listen to bookings collection (replaces appointments) with limit
  useEffect(() => {
    console.log('[Bookings] Subscribing to bookings real-time feed...');
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error listening to bookings:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      const target = bookings.find(b => b.id === bookingId);
      await logAuditAction(
        userProfile?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Updated Booking Status`,
        'bookings',
        `Changed status of booking for ${target?.name || target?.client || 'Client'} to ${newStatus}`
      );

      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        preferredDate: newDate, // Map to spec field preferredDate
        date: newDate,          // Keep fallback date field for UI
        time: newTime,
        status: 'Scheduled',
        updatedAt: serverTimestamp()
      });
      
      await logAuditAction(
        userProfile?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Scheduled Booking`,
        'bookings',
        `Scheduled booking for ${selectedBooking.name || selectedBooking.client || 'Client'} to ${newDate} at ${newTime}`
      );

      setSelectedBooking(prev => ({ 
        ...prev, 
        preferredDate: newDate,
        date: newDate, 
        time: newTime, 
        status: 'Scheduled' 
      }));
      setShowRescheduleModal(false);
    } catch (err) {
      console.error('Error scheduling booking:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!isSuperAdmin) {
      alert('Access Denied: Only Super Admin can delete records.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this booking record?')) return;

    try {
      const target = bookings.find(b => b.id === bookingId);
      await deleteDoc(doc(db, 'bookings', bookingId));
      
      await logAuditAction(
        userProfile?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Deleted Booking`,
        'bookings',
        `Deleted booking record for ${target?.name || target?.client || 'Client'}`
      );

      setSelectedBooking(null);
    } catch (err) {
      console.error('Error deleting booking:', err);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const clientName = b.name || b.client || '';
      const matchesSearch = 
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = useMemo(() => {
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, startIndex, itemsPerPage]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
          WORKSPACE CALENDAR
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          BOOKINGS MANAGEMENT
        </h1>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No bookings found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Requested Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {paginatedBookings.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {b.name || b.client || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{b.email}</td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{b.phone || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{b.preferredDate || b.date || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{b.time || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_COLORS[b.status || 'Pending']}`}>
                        {b.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 bg-white/[0.01]">
                <div>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded border border-white/10 bg-black hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 font-mono">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 rounded border border-white/10 bg-black hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Detail Slide-Over */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="relative w-full max-w-xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Booking Inspection
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedBooking.name || selectedBooking.client || 'Booking Details'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteBooking(selectedBooking.id)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${isSuperAdmin ? 'border-red-500/20 text-red-400 hover:bg-red-950/20' : 'border-white/5 text-gray-600 cursor-not-allowed'}`}
                  title={isSuperAdmin ? "Delete Record" : "Super Admin Clearance Required"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Status Display Card */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Current Status</span>
                  <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded border uppercase font-mono mt-1.5 w-fit ${STATUS_COLORS[selectedBooking.status || 'Pending']}`}>
                    {selectedBooking.status || 'Pending'}
                  </span>
                </div>
                
                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'Approved')}
                    className="p-2 rounded-lg border border-emerald-500/20 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    title="Approve Booking"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => {
                      setNewDate(selectedBooking.preferredDate || selectedBooking.date || '');
                      setNewTime(selectedBooking.time || '');
                      setShowRescheduleModal(true);
                    }}
                    className="p-2 rounded-lg border border-blue-500/20 text-blue-400 bg-blue-950/10 hover:bg-blue-950/20 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    title="Schedule Booking"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Schedule</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'Completed')}
                    className="p-2 rounded-lg border border-purple-500/20 text-purple-400 bg-purple-950/10 hover:bg-purple-950/20 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    title="Complete Booking"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'Rejected')}
                    className="p-2 rounded-lg border border-rose-500/20 text-rose-400 bg-rose-950/10 hover:bg-rose-950/20 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                    title="Reject Booking"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Booking Profile */}
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <User className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Client Name</span>
                    <span className="text-sm text-white">{selectedBooking.name || selectedBooking.client || '—'}</span>
                  </div>
                </div>
                {selectedBooking.company && (
                  <div className="flex gap-3 items-start">
                    <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Company</span>
                      <span className="text-sm text-white">{selectedBooking.company}</span>
                    </div>
                  </div>
                )}
                {selectedBooking.serviceRequested && (
                  <div className="flex gap-3 items-start">
                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Service Requested</span>
                      <span className="text-sm text-white">{selectedBooking.serviceRequested}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 items-start">
                  <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Email Address</span>
                    <span className="text-sm text-white font-mono">{selectedBooking.email || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Phone Number</span>
                    <span className="text-sm text-white font-mono">{selectedBooking.phone || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Preferred Date & Time</span>
                    <span className="text-sm text-white font-mono">
                      {selectedBooking.preferredDate || selectedBooking.date || '—'} at {selectedBooking.time || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule/Schedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRescheduleModal(false)} />
          <div className="relative w-full max-w-sm bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col p-6">
            <h3 className="text-base font-normal text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Schedule / Reschedule Appointment</span>
            </h3>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Time</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-100 transition px-5 py-2 disabled:opacity-50"
                >
                  {saving ? 'Scheduling...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
