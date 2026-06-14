import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Search, X, Inbox, Mail, Phone, Calendar, Trash2, ArrowUpRight, MessageSquare
} from 'lucide-react';

const STATUSES = ['New', 'Contacted', 'Ignored', 'Archived'];
const STATUS_COLORS = {
  New: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Contacted: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Ignored: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Archived: 'border-blue-500/20 text-blue-400 bg-blue-950/10'
};

export default function Inquiries() {
  const { user: authUser } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (inquiryId, newStatus) => {
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), { status: newStatus });
      if (selectedInquiry && selectedInquiry.id === inquiryId) {
        setSelectedInquiry(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await deleteDoc(doc(db, 'inquiries', inquiryId));
      if (selectedInquiry && selectedInquiry.id === inquiryId) {
        setSelectedInquiry(null);
      }
    } catch (err) {
      console.error('Error deleting inquiry:', err);
    }
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch =
      inq.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || inq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            COMMUNICATION
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            CLIENT INQUIRIES
          </h1>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search inquiries..."
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
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main list */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No inquiries received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Sender Name</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Service Required</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredInquiries.map(inq => (
                  <tr
                    key={inq.id}
                    onClick={() => setSelectedInquiry(inq)}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {inq.name}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light">{inq.company || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{inq.email}</td>
                    <td className="px-6 py-4 text-gray-400 font-light text-xs">{inq.service || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_COLORS[inq.status] || 'border-white/10 text-gray-300'}`}>
                        {inq.status || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                      {inq.createdAt?.toDate
                        ? inq.createdAt.toDate().toLocaleDateString('en-IN')
                        : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inquiry Detail Panel */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedInquiry(null)}
          />
          <div className="relative w-full max-w-xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Inquiry Review
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedInquiry.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteInquiry(selectedInquiry.id)}
                  className="w-8 h-8 rounded-full border border-red-500/20 hover:bg-red-950/20 text-red-400 hover:text-red-300 flex items-center justify-center transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Status Update */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Current Status</span>
                  <span className="text-sm text-white font-medium mt-0.5">Toggle Status:</span>
                </div>
                <select
                  value={selectedInquiry.status || 'New'}
                  onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Profiles */}
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Email</span>
                    <span className="text-sm text-white font-mono">{selectedInquiry.email}</span>
                  </div>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex gap-3 items-start">
                    <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Phone</span>
                      <span className="text-sm text-white font-mono">{selectedInquiry.phone}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 items-start">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Received Date</span>
                    <span className="text-sm text-white font-mono">
                      {selectedInquiry.createdAt?.toDate
                        ? selectedInquiry.createdAt.toDate().toLocaleString('en-IN')
                        : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Message */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  <span>Message Body / Audit Scope</span>
                </span>
                <p className="text-xs text-gray-300 font-light leading-relaxed normal-case bg-white/[0.01] p-4 border border-white/5 rounded-lg">
                  {selectedInquiry.message || 'No additional message details provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
