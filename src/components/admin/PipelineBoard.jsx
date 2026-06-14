import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, ArrowRight, User, Briefcase, Calendar, ShieldAlert } from 'lucide-react';
import { calculateLeadScore } from './LeadsList';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';

const COLUMNS = [
  { id: 'New', name: 'New' },
  { id: 'Contacted', name: 'Contacted' },
  { id: 'Discovery', name: 'Discovery' },
  { id: 'Proposal Sent', name: 'Proposal Sent' },
  { id: 'Negotiation', name: 'Negotiation' },
  { id: 'Won', name: 'Won' },
  { id: 'Lost', name: 'Lost' }
];

const SCORE_COLORS = {
  Cold: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Warm: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Hot: 'border-rose-500/20 text-rose-400 bg-rose-950/10 animate-pulse'
};

export default function PipelineBoard() {
  const { user: authUser, userRole } = useAuth();
  const [contactForms, setContactForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load contactForms and bookings in real-time
  useEffect(() => {
    const unsubContacts = onSnapshot(
      query(collection(db, 'contactForms'), orderBy('createdAt', 'desc')),
      (snap) => {
        setContactForms(snap.docs.map(d => ({ id: d.id, _collection: 'contactForms', ...d.data() })));
        setLoading(false);
      },
      (err) => console.error("Error fetching pipeline contact forms:", err)
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      (snap) => {
        setBookings(snap.docs.map(d => ({ id: d.id, _collection: 'bookings', ...d.data() })));
        setLoading(false);
      },
      (err) => console.error("Error fetching pipeline bookings:", err)
    );

    return () => {
      unsubContacts();
      unsubBookings();
    };
  }, []);

  // Merge lists
  const leads = React.useMemo(() => {
    const list = [];

    contactForms.forEach(c => {
      list.push({
        id: c.id,
        name: c.name || '',
        company: c.company || '',
        email: c.email || '',
        phone: c.phone || '',
        service: c.service || 'Custom Systems',
        industry: c.industry || 'Other',
        message: c.message || '',
        status: c.status || 'New',
        createdAt: c.createdAt,
        _collection: 'contactForms'
      });
    });

    bookings.forEach(b => {
      list.push({
        id: b.id,
        name: b.name || '',
        company: b.company || '',
        email: b.email || '',
        phone: b.phone || '',
        service: b.serviceRequested || b.service || 'Custom Systems',
        industry: b.industry || 'Other',
        message: b.message || '',
        status: b.status || 'New',
        createdAt: b.createdAt,
        _collection: 'bookings'
      });
    });

    return list;
  }, [contactForms, bookings]);

  // Transition lead stage
  const moveLead = async (leadId, currentStatus, direction) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return;

    const currentIndex = COLUMNS.findIndex(col => col.id === currentStatus);
    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < COLUMNS.length) {
      const newStatus = COLUMNS[newIndex].id;
      const collectionName = target._collection;

      try {
        await updateDoc(doc(db, collectionName, leadId), { 
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        // Add to emailLogs/whatsappLogs automatically if promoted
        if (newStatus === 'Proposal Sent') {
          // Log automated email sequence trigger
          await addDoc(collection(db, 'emailLogs'), {
            leadEmail: target.email || 'unknown',
            leadName: target.name || 'Client',
            subject: 'Proposal Issued for Autoscale Solutions',
            body: `Hi ${target.name},\n\nWe have drafted a bespoke automation proposal for ${target.company || 'your business'}. Please review the options.`,
            status: 'sent',
            triggerEvent: 'Proposal Sent',
            timestamp: serverTimestamp()
          });

          await addDoc(collection(db, 'whatsappLogs'), {
            phone: target.phone || 'N/A',
            name: target.name || 'Client',
            templateUsed: 'Proposal Sent Template',
            status: 'sent',
            payload: `Your Autoscale proposal for ${target.service} has been successfully sent to ${target.email}.`,
            timestamp: serverTimestamp()
          });
        }

        // Log audit trail
        await logAuditAction(
          authUser?.email || 'admin@autoscale.systems',
          userRole || 'admin',
          'Updated Pipeline Stage',
          collectionName,
          leadId,
          `Shifted lead "${target.name}" from status "${currentStatus}" to "${newStatus}"`
        );

      } catch (err) {
        console.error('Error shifting lead pipeline status:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-8 h-full">
      {/* Title Header */}
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
          SALES PIPELINE ENGINE
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          GROWTH PIPELINE
        </h1>
      </div>

      {/* Kanban Scroll Wrapper */}
      <div className="flex-grow overflow-x-auto pb-4 no-scrollbar">
        <div className="flex gap-4 min-w-[1400px] h-full items-stretch">
          {COLUMNS.map((column) => {
            const columnLeads = leads.filter(l => {
              // Normalize status mapping
              const s = l.status || 'New';
              if (s === 'Pending' || s === 'Scheduled') return column.id === 'New';
              return s === column.id;
            });

            return (
              <div 
                key={column.id}
                className="w-80 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col h-[calc(100vh-280px)] overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center flex-shrink-0">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {column.name}
                  </span>
                  <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Body Cards Scroll */}
                <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
                  {columnLeads.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest border border-dashed border-white/5 rounded-lg flex-grow flex items-center justify-center">
                      Empty Stage
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-4 rounded-lg border border-white/5 bg-black hover:border-white/15 transition-all duration-200 shadow-sm relative group overflow-hidden"
                      >
                        {/* Internal line border */}
                        <div className="absolute inset-0 border border-transparent rounded-lg group-hover:border-white/5 pointer-events-none" />

                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-white truncate max-w-[150px]">
                              {lead.name}
                            </span>
                            <span className="text-[9px] text-gray-500 font-mono">
                              {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-gray-400 font-light truncate">
                            {lead.company || '—'}
                          </div>

                          <div className="flex flex-wrap gap-1.5 items-center mt-1">
                            <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase border border-white/10 px-2 py-0.5 rounded bg-white/5">
                              {lead.service}
                            </span>
                            <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase ${SCORE_COLORS[calculateLeadScore(lead)] || 'border-white/10 text-gray-300'}`}>
                              {calculateLeadScore(lead)}
                            </span>
                          </div>
                        </div>

                        {/* Transition Buttons row */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                          {/* Move Left */}
                          <button
                            onClick={() => moveLead(lead.id, column.id, -1)}
                            disabled={column.id === 'New'}
                            className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase">
                            Transition
                          </span>

                          {/* Move Right */}
                          <button
                            onClick={() => moveLead(lead.id, column.id, 1)}
                            disabled={column.id === 'Lost'}
                            className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
