import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import {
  Search, X, Inbox, Mail, Phone, Calendar, Trash2, MessageSquare, Building, Check
} from 'lucide-react';

const STATUSES = ['New', 'Contacted', 'Ignored', 'Archived'];
const STATUS_COLORS = {
  New: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Contacted: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Ignored: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Archived: 'border-blue-500/20 text-blue-400 bg-blue-950/10'
};

export default function ContactForms() {
  const { userRole, userProfile } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Reset page index on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const isSuperAdmin = userRole === 'super_admin';

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'contactForms'), orderBy('createdAt', 'desc'), limit(200)),
      (snapshot) => {
        setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to contact forms:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (subId, newStatus) => {
    try {
      await updateDoc(doc(db, 'contactForms', subId), { status: newStatus });
      
      const target = submissions.find(s => s.id === subId);
      await logAuditAction(
        userProfile?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Updated Contact Form Status`,
        'contactForms',
        `Changed status of submission from ${target?.name} to ${newStatus}`
      );

      if (selectedSub && selectedSub.id === subId) {
        setSelectedSub(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteSub = async (subId) => {
    if (!isSuperAdmin) {
      alert('Access Denied: Only Super Admin can delete records.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this form submission?')) return;
    try {
      const target = submissions.find(s => s.id === subId);
      await deleteDoc(doc(db, 'contactForms', subId));
      
      await logAuditAction(
        userProfile?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Deleted Contact Form Submission`,
        'contactForms',
        `Deleted contact submission record from ${target?.name || 'Sender'}`
      );

      if (selectedSub && selectedSub.id === subId) {
        setSelectedSub(null);
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
    }
  };

  const handleConvertToLead = async (sub) => {
    try {
      // Add record to leads collection
      await addDoc(collection(db, 'leads'), {
        name: sub.name || '',
        email: sub.email || '',
        phone: sub.phone || '',
        company: sub.company || '',
        industry: 'Other',
        service: sub.selectedService || 'Custom System',
        message: sub.message || '',
        status: 'New',
        createdAt: serverTimestamp()
      });

      // Update contactForm status to Contacted/Converted
      await handleUpdateStatus(sub.id, 'Contacted');
      
      await logAuditAction(
        userProfile?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Converted Contact Form to Lead`,
        'leads',
        `Promoted contact submission from ${sub.name} to Leads collection`
      );

      // Update local state flag
      if (selectedSub && selectedSub.id === sub.id) {
        setSelectedSub(prev => ({ ...prev, convertedToLead: true, status: 'Contacted' }));
      }

      alert('Submission successfully promoted to Active Lead pipeline!');
    } catch (err) {
      console.error('Error promoting submission to lead:', err);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch =
        sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchTerm, statusFilter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubmissions = useMemo(() => {
    return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubmissions, startIndex, itemsPerPage]);

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage) || 1;

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            COMMUNICATION
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            CONTACT FORMS
          </h1>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search form submissions..."
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

      {/* Main List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No contact submissions received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Sender</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">System Focus</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {paginatedSubmissions.map(sub => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {sub.name}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light">{sub.company || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{sub.email}</td>
                    <td className="px-6 py-4 text-gray-400 font-light text-xs">{sub.selectedService || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_COLORS[sub.status || 'New']}`}>
                        {sub.status || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                      {sub.createdAt?.toDate
                        ? sub.createdAt.toDate().toLocaleDateString('en-IN')
                        : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 bg-white/[0.01]">
                <div>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
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

      {/* Submission Detail Panel */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedSub(null)}
          />
          <div className="relative w-full max-w-xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Submission Details
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedSub.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteSub(selectedSub.id)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${isSuperAdmin ? 'border-red-500/20 text-red-400 hover:bg-red-950/20' : 'border-white/5 text-gray-600 cursor-not-allowed'}`}
                  title={isSuperAdmin ? "Delete Submission" : "Super Admin Clearance Required"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Status Update */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Pipeline Status</span>
                  <select
                    value={selectedSub.status || 'New'}
                    onChange={(e) => handleUpdateStatus(selectedSub.id, e.target.value)}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white w-full mt-2"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Lead Pipeline Integration</span>
                  {selectedSub.convertedToLead ? (
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-2">
                      <Check className="w-4 h-4" />
                      Ingested Into Leads
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConvertToLead(selectedSub)}
                      className="w-full bg-white text-black hover:bg-gray-100 text-[10px] font-bold tracking-wider rounded-lg py-2 uppercase transition mt-2 flex items-center justify-center"
                    >
                      Convert to Lead
                    </button>
                  )}
                </div>
              </div>

              {/* Profiles */}
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Company</span>
                    <span className="text-sm text-white">{selectedSub.company || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Email</span>
                    <span className="text-sm text-white font-mono">{selectedSub.email}</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Phone</span>
                    <span className="text-sm text-white font-mono">{selectedSub.phone || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">Received Date</span>
                    <span className="text-sm text-white font-mono">
                      {selectedSub.createdAt?.toDate
                        ? selectedSub.createdAt.toDate().toLocaleString('en-IN')
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
                  <span>Message Body / Scope</span>
                </span>
                <p className="text-xs text-gray-300 font-light leading-relaxed normal-case bg-white/[0.01] p-4 border border-white/5 rounded-lg whitespace-pre-wrap">
                  {selectedSub.message || 'No additional message details provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
