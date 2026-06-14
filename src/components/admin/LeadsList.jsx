import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, Calendar, MessageSquare, X, Plus, Trash, Check, User, Building, Phone, Mail, FileText, Edit2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';

const STATUSES = ['New', 'Qualified', 'Proposal Sent', 'Won', 'Lost', 'Pending', 'Scheduled', 'Completed', 'Cancelled'];
const STATUS_COLORS = {
  New: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Qualified: 'border-violet-500/20 text-violet-400 bg-violet-950/10',
  'Proposal Sent': 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Won: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Lost: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
  Pending: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Scheduled: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Completed: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Cancelled: 'border-rose-500/20 text-rose-400 bg-rose-950/10'
};

const EMPTY_LEAD_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  industry: '',
  service: '',
  message: '',
  status: 'New',
  leadSource: 'Contact Form'
};

const EMPTY_CLIENT_CONVERT = {
  companyName: '',
  ownerName: '',
  email: '',
  phone: '',
  industry: '',
  website: '',
  contractValue: ''
};

export default function LeadsList() {
  const { user: authUser, userRole, userProfile } = useAuth();
  const [contactForms, setContactForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Detail panel states
  const [notes, setNotes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '' });

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ ...EMPTY_LEAD_FORM });
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertFormData, setConvertFormData] = useState({ ...EMPTY_CLIENT_CONVERT });
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  // Listeners
  useEffect(() => {
    console.log('[LeadsList] Listening to contactForms and bookings collections...');
    
    // Check and seed default data if both are empty
    const checkAndSeed = async (snap1, snap2) => {
      if (snap1.empty && snap2.empty) {
        console.log('[LeadsList] Both collections are empty. Seeding default CRM data...');
        
        const defaultContacts = [
          {
            name: "Amit Patel",
            email: "amit@patelclinics.com",
            phone: "+919988776655",
            company: "Patel Care Clinics",
            industry: "Healthcare",
            message: "Automate appointment inquiries and general clinic FAQs.",
            status: "Proposal Sent",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
          },
          {
            name: "Rahul Sharma",
            email: "rahul@techbuilders.in",
            phone: "+919876543210",
            company: "TechBuilders India",
            industry: "Agencies",
            message: "Need cognitive AI agents to automate code review and deployment updates.",
            status: "New",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
          }
        ];

        const defaultBookings = [
          {
            name: "Priya Nair",
            email: "priya@greenrealestate.co",
            phone: "+919123456789",
            company: "Green Space Realty",
            industry: "Real Estate",
            serviceRequested: "WhatsApp Automation",
            preferredDate: "2026-06-18",
            status: "Pending",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
          }
        ];

        for (const c of defaultContacts) {
          try {
            await addDoc(collection(db, 'contactForms'), c);
          } catch (err) {
            console.error('Error seeding default contact:', err);
          }
        }

        for (const b of defaultBookings) {
          try {
            await addDoc(collection(db, 'bookings'), b);
          } catch (err) {
            console.error('Error seeding default booking:', err);
          }
        }
      }
    };

    let contactFormsSnap = null;
    let bookingsSnap = null;
    let initialCheckDone = false;

    const runSeedingCheck = () => {
      if (contactFormsSnap && bookingsSnap && !initialCheckDone) {
        initialCheckDone = true;
        checkAndSeed(contactFormsSnap, bookingsSnap);
      }
    };

    const unsubscribeContactForms = onSnapshot(
      query(collection(db, 'contactForms'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        contactFormsSnap = snapshot;
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, _collection: 'contactForms', ...docSnap.data() });
        });
        setContactForms(list);
        setLoading(false);
        runSeedingCheck();
      },
      (err) => {
        console.error('Error listening to contactForms:', err);
        setLoading(false);
      }
    );

    const unsubscribeBookings = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        bookingsSnap = snapshot;
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, _collection: 'bookings', ...docSnap.data() });
        });
        setBookings(list);
        setLoading(false);
        runSeedingCheck();
      },
      (err) => {
        console.error('Error listening to bookings:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeContactForms();
      unsubscribeBookings();
    };
  }, []);

  // Merge into leads state
  const leads = React.useMemo(() => {
    const list = [];
    
    contactForms.forEach((item) => {
      list.push({
        id: item.id,
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        company: item.company || '',
        industry: item.industry || 'Other',
        service: item.service || 'Custom Systems',
        message: item.message || '',
        leadSource: 'Contact Form',
        status: item.status || 'New',
        createdAt: item.createdAt,
        _collection: 'contactForms'
      });
    });

    bookings.forEach((item) => {
      list.push({
        id: item.id,
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        company: item.company || '',
        industry: item.industry || 'Other',
        service: item.serviceRequested || item.service || 'Custom Systems',
        message: item.message || `System: ${item.serviceRequested || 'Custom Systems'}. Preferred Date: ${item.preferredDate || 'TBD'}`,
        leadSource: 'Book Audit',
        status: item.status || 'Pending',
        createdAt: item.createdAt,
        _collection: 'bookings'
      });
    });

    return list;
  }, [contactForms, bookings]);

  // Fetch notes & meetings when a lead is selected
  useEffect(() => {
    if (!selectedLead) return;

    const notesQuery = query(
      collection(db, 'notes'), 
      where('leadId', '==', selectedLead.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setNotes(list);
    });

    const meetingsQuery = query(
      collection(db, 'meetings'), 
      where('leadId', '==', selectedLead.id),
      orderBy('date', 'asc')
    );
    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMeetings(list);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeMeetings();
    };
  }, [selectedLead]);

  // Update status
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const target = leads.find(l => l.id === leadId);
      if (!target) return;

      const collectionName = target._collection;
      await updateDoc(doc(db, collectionName, leadId), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      await logAuditAction(
        userProfile?.email || authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Changed Lead Status`,
        collectionName,
        leadId,
        `Updated status of lead "${target?.name || leadId}" to "${newStatus}"`
      );

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Delete lead (Super Admin only)
  const handleDeleteLead = async (leadId) => {
    if (!isSuperAdmin) {
      alert('Access Denied: Only Super Admin can delete records.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this lead? This action is irreversible.')) return;

    try {
      const target = leads.find(l => l.id === leadId);
      if (!target) return;

      const collectionName = target._collection;
      await deleteDoc(doc(db, collectionName, leadId));
      
      await logAuditAction(
        userProfile?.email || authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Deleted Lead`,
        collectionName,
        leadId,
        `Deleted lead record for "${target?.name || leadId}"`
      );

      setSelectedLead(null);
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    setEditFormData({
      name: selectedLead.name || '',
      email: selectedLead.email || '',
      phone: selectedLead.phone || '',
      company: selectedLead.company || '',
      industry: selectedLead.industry || '',
      service: selectedLead.service || '',
      message: selectedLead.message || '',
      status: selectedLead.status || 'New',
      leadSource: selectedLead.leadSource || 'Contact Form'
    });
    setShowEditModal(true);
  };

  // Submit Edit Lead
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const collectionName = selectedLead._collection;
      const updates = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        company: editFormData.company.trim(),
        industry: editFormData.industry,
        status: editFormData.status,
        updatedAt: serverTimestamp()
      };

      if (collectionName === 'bookings') {
        updates.serviceRequested = editFormData.service;
      } else {
        updates.message = editFormData.message.trim();
      }

      await updateDoc(doc(db, collectionName, selectedLead.id), updates);

      await logAuditAction(
        userProfile?.email || authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Updated Lead`,
        collectionName,
        selectedLead.id,
        `Updated details of lead "${selectedLead.name}"`
      );

      setSelectedLead(prev => ({ ...prev, ...editFormData }));
      setShowEditModal(false);
    } catch (err) {
      console.error('Error editing lead:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open Convert Modal
  const openConvertModal = () => {
    setConvertFormData({
      companyName: selectedLead.company || '',
      ownerName: selectedLead.name || '',
      email: selectedLead.email || '',
      phone: selectedLead.phone || '',
      industry: selectedLead.industry || '',
      website: '',
      contractValue: ''
    });
    setShowConvertModal(true);
  };

  // Submit Convert to Client
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertFormData.companyName.trim() || !convertFormData.ownerName.trim()) return;

    setSaving(true);
    try {
      const collectionName = selectedLead._collection;

      // 1. Add Client document with unified CRM schema + backward compatibility
      const clientDoc = await addDoc(collection(db, 'clients'), {
        leadId: selectedLead.id,
        company: convertFormData.companyName.trim(),
        companyName: convertFormData.companyName.trim(), // UI backward compat
        contactPerson: convertFormData.ownerName.trim(),
        ownerName: convertFormData.ownerName.trim(), // UI backward compat
        email: convertFormData.email.trim(),
        phone: convertFormData.phone.trim(),
        industry: convertFormData.industry || 'Other',
        website: convertFormData.website.trim(),
        contractValue: Number(convertFormData.contractValue) || 0,
        status: 'Active',
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin'
      });

      // 2. Add Project document automatically
      await addDoc(collection(db, 'projects'), {
        projectName: `${convertFormData.companyName} Automation Platform`,
        clientId: clientDoc.id,
        clientName: convertFormData.companyName.trim(), // UI backward compat
        type: selectedLead.service || 'Custom System', // UI backward compat
        projectType: selectedLead.service || 'Custom System',
        description: selectedLead.message || 'System requested via audit request.',
        priority: 'Medium',
        status: 'Planning',
        progress: 0,
        budget: Number(convertFormData.contractValue) || 0, // UI backward compat
        projectValue: Number(convertFormData.contractValue) || 0,
        deadline: '',
        assignedTeam: '',
        createdAt: serverTimestamp()
      });

      // 3. Update Lead status to Won in backing collection
      await handleStatusChange(selectedLead.id, 'Won');

      // 4. Create real-time notification
      await addDoc(collection(db, 'notifications'), {
        type: 'lead_converted',
        title: 'Lead Converted to Client',
        message: `${convertFormData.ownerName} from ${convertFormData.companyName} is now an active client.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await logAuditAction(
        userProfile?.email || authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        `Converted Lead to Client`,
        'clients',
        clientDoc.id,
        `Promoted lead "${convertFormData.ownerName}" (${convertFormData.companyName}) to client and created project`
      );

      setShowConvertModal(false);
      setSelectedLead(prev => ({ ...prev, status: 'Won' }));
      alert('Lead successfully converted to Client and Project initiated!');
    } catch (err) {
      console.error('Error converting lead to client:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await addDoc(collection(db, 'notes'), {
        leadId: selectedLead.id,
        content: newNote.trim(),
        createdAt: serverTimestamp(),
        authorName: authUser?.email || 'Admin'
      });
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  // Add Meeting
  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!newMeeting.title.trim() || !newMeeting.date || !newMeeting.time) return;

    try {
      await addDoc(collection(db, 'meetings'), {
        leadId: selectedLead.id,
        title: newMeeting.title.trim(),
        date: newMeeting.date,
        time: newMeeting.time,
        createdAt: serverTimestamp()
      });
      setNewMeeting({ title: '', date: '', time: '' });
    } catch (err) {
      console.error('Error adding meeting:', err);
    }
  };

  // Filter & Sort math
  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch = 
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === '' || lead.status === statusFilter;
      const matchesService = serviceFilter === '' || lead.service === serviceFilter;
      const matchesIndustry = industryFilter === '' || lead.industry === industryFilter;
      const matchesSource = sourceFilter === '' || (lead.leadSource || 'Contact Form') === sourceFilter;

      return matchesSearch && matchesStatus && matchesService && matchesIndustry && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return bTime - aTime;
      }
      if (sortBy === 'oldest') {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return aTime - bTime;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  return (
    <div className="flex-grow flex flex-col gap-8">
      
      {/* Page Header */}
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
          CLIENT DATABASE
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          LEADS DIRECTORY
        </h1>
      </div>

      {/* Filter Options Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Lead Sources</option>
            <option value="Contact Form">Contact Form</option>
            <option value="Book Audit">Book Audit</option>
            <option value="AI Chat">AI Chat</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Systems</option>
            <option value="AI Agents">AI Agents</option>
            <option value="WhatsApp Automation">WhatsApp Automation</option>
            <option value="Lead Generation">Lead Generation</option>
            <option value="Customer Support">Customer Support</option>
            <option value="Business Automation">Business Automation</option>
            <option value="Custom Systems">Custom Systems</option>
          </select>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Industries</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Education">Education</option>
            <option value="Ecommerce">Ecommerce</option>
            <option value="Agencies">Agencies</option>
            <option value="Legal">Legal</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>

        </div>

      </div>

      {/* Main Leads Table */}
      <div className="flex-grow rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No matching leads found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Lead Source</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {lead.name}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light">{lead.company || '—'}</td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{lead.email}</td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{lead.phone || '—'}</td>
                    <td className="px-6 py-4 text-gray-400 font-light text-xs">{lead.leadSource || 'Contact Form'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_COLORS[lead.status] || 'border-white/10 text-gray-300'}`}>
                        {lead.status || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                      {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sliding Slideover Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedLead(null)}
          />

          {/* Panel Card */}
          <div className="relative w-full max-w-2xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Lead Details
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedLead.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openEditModal}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                  title="Edit Lead Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${isSuperAdmin ? 'border-red-500/20 text-red-400 hover:bg-red-950/20' : 'border-white/5 text-gray-600 cursor-not-allowed'}`}
                  title={isSuperAdmin ? "Delete Lead" : "Super Admin Clearance Required"}
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Viewport */}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 no-scrollbar">
              
              {/* Actions & Status row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status selector */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Pipeline Stage</span>
                  <select
                    value={selectedLead.status || 'New'}
                    onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white transition duration-200 mt-1 w-full"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Conversion Trigger */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Operational Shift</span>
                  {selectedLead.status === 'Won' ? (
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-2">
                      <Check className="w-4 h-4" />
                      Converted Client Account
                    </div>
                  ) : (
                    <button
                      onClick={openConvertModal}
                      className="w-full bg-white text-black hover:bg-gray-100 text-xs font-bold tracking-wider rounded-lg py-2.5 uppercase transition mt-2 flex items-center justify-center gap-1.5"
                    >
                      Convert to Client
                    </button>
                  )}
                </div>
              </div>

              {/* Core Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Full Name</span>
                      <span className="text-sm text-white">{selectedLead.name}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Company Name</span>
                      <span className="text-sm text-white">{selectedLead.company}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Email Address</span>
                      <span className="text-sm text-white font-mono">{selectedLead.email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Phone Number</span>
                      <span className="text-sm text-white font-mono">{selectedLead.phone}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Industry & Request</span>
                      <span className="text-sm text-white">{selectedLead.industry || '—'} &bull; {selectedLead.service || '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Globe className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Lead Source</span>
                      <span className="text-sm text-white">{selectedLead.leadSource || 'Contact Form'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Message bottleneck */}
              {selectedLead.message && (
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    Bottleneck Description
                  </span>
                  <p className="text-xs text-gray-300 font-light leading-relaxed normal-case mt-1.5">
                    {selectedLead.message}
                  </p>
                </div>
              )}

              <hr className="border-white/5" />

              {/* Section: Internal Notes */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span>Internal Comments / Notes</span>
                </h3>

                {/* Input form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-grow bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                  <button
                    type="submit"
                    className="bg-white text-black px-4 rounded-lg text-xs font-semibold hover:bg-gray-100 transition duration-200 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                {/* Notes List */}
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">No notes added yet.</p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                        <p className="text-xs text-gray-300 normal-case leading-relaxed font-light">
                          {note.content}
                        </p>
                        <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1">
                          <span>{note.authorName}</span>
                          <span>
                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'} &bull; {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Section: Meetings */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Scheduled Consultations</span>
                </h3>

                {/* Meeting Scheduler Form */}
                <form onSubmit={handleAddMeeting} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Topic / Title"
                    required
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                    className="col-span-1 md:col-span-6 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                  <input
                    type="date"
                    required
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, date: e.target.value }))}
                    className="col-span-1 md:col-span-3 bg-black border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
                  />
                  <input
                    type="time"
                    required
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, time: e.target.value }))}
                    className="col-span-1 md:col-span-2 bg-black border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
                  />
                  <button
                    type="submit"
                    className="col-span-1 md:col-span-1 bg-white text-black rounded-lg hover:bg-gray-100 transition duration-200 flex items-center justify-center py-2 md:py-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                {/* Meetings List */}
                <div className="space-y-3">
                  {meetings.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">No meetings scheduled.</p>
                  ) : (
                    meetings.map((meet) => (
                      <div key={meet.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">{meet.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {meet.date} at {meet.time}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold border border-emerald-500/20 text-emerald-400 bg-emerald-950/10 px-2 py-0.5 rounded uppercase font-mono">
                          Scheduled
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Update Details</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">EDIT LEAD</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.company}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Industry</label>
                  <select
                    value={editFormData.industry}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="">Select Industry</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Education">Education</option>
                    <option value="Ecommerce">Ecommerce</option>
                    <option value="Agencies">Agencies</option>
                    <option value="Legal">Legal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">System Needed</label>
                  <select
                    value={editFormData.service}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, service: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="AI Agents">AI Agents</option>
                    <option value="WhatsApp Automation">WhatsApp Automation</option>
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Business Automation">Business Automation</option>
                    <option value="Custom Systems">Custom Systems</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Lead Source</label>
                  <select
                    value={editFormData.leadSource || 'Contact Form'}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, leadSource: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="Contact Form">Contact Form</option>
                    <option value="Book Audit">Book Audit</option>
                    <option value="AI Chat">AI Chat</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Pipeline Stage</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Message</label>
                <textarea
                  value={editFormData.message}
                  rows="3"
                  onChange={(e) => setEditFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Client Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Account Activation</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">CONVERT TO CLIENT</h2>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Company Name *</label>
                <input
                  type="text"
                  required
                  value={convertFormData.companyName}
                  onChange={(e) => setConvertFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Primary Contact *</label>
                  <input
                    type="text"
                    required
                    value={convertFormData.ownerName}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={convertFormData.email}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={convertFormData.phone}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Industry</label>
                  <input
                    type="text"
                    value={convertFormData.industry}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Contract Value (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={convertFormData.contractValue}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, contractValue: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Client Website</label>
                  <input
                    type="text"
                    placeholder="https://"
                    value={convertFormData.website}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-500 text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-emerald-400 transition uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Converting...' : 'Convert Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
