import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'New', name: 'New' },
  { id: 'Contacted', name: 'Contacted' },
  { id: 'Meeting Scheduled', name: 'Meeting Scheduled' },
  { id: 'Proposal Sent', name: 'Proposal Sent' },
  { id: 'Won', name: 'Won' },
  { id: 'Lost', name: 'Lost' }
];

export default function PipelineBoard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leadsQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setLeads(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const moveLead = async (leadId, currentStatus, direction) => {
    const currentIndex = COLUMNS.findIndex(col => col.id === currentStatus);
    let newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < COLUMNS.length) {
      const newStatus = COLUMNS[newIndex].id;
      try {
        await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
      } catch (err) {
        console.error('Error shifting lead status:', err);
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
          PIPELINE MANAGEMENT
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          KANBAN BOARD
        </h1>
      </div>

      {/* Kanban Scroll Wrapper */}
      <div className="flex-grow overflow-x-auto pb-4 no-scrollbar">
        <div className="flex gap-4 min-w-[1200px] h-full items-stretch">
          
          {COLUMNS.map((column) => {
            const columnLeads = leads.filter(l => (l.status || 'New') === column.id);

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

                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-white truncate max-w-[150px]">
                              {lead.name}
                            </span>
                            <span className="text-[9px] text-gray-500 font-mono">
                              {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-gray-400 font-light truncate">
                            {lead.company}
                          </div>

                          <div className="text-[9px] font-bold text-gray-400 tracking-wider uppercase border border-white/10 px-2 py-0.5 rounded w-fit mt-1 bg-white/5">
                            {lead.service}
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
                            Transition Stage
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
