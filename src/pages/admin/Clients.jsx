import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import { sanitizeInput } from '../../utils/sanitizer';
import {
  Search, X, Plus, Building, User, Mail, Phone, Globe, IndianRupee,
  FileText, MessageSquare, CreditCard, FolderKanban, Trash2, Edit3, ChevronDown
} from 'lucide-react';

const INDUSTRIES = ['Healthcare', 'Real Estate', 'Education', 'Ecommerce', 'Agencies', 'Legal', 'SaaS', 'Manufacturing', 'Hospitality', 'Other'];
const STATUSES = ['Active', 'Paused', 'Completed'];

const STATUS_COLORS = {
  Active: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Paused: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Completed: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '₹0';
  return '₹' + Number(value).toLocaleString('en-IN');
};

const EMPTY_CLIENT = {
  companyName: '',
  ownerName: '',
  email: '',
  phone: '',
  industry: '',
  website: '',
  contractValue: '',
  status: 'Active',
};

export default function Clients() {
  const { user: authUser, userRole } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_CLIENT });
  const [saving, setSaving] = useState(false);

  // Project creation states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ projectName: '', projectType: 'AI Agents', projectValue: '' });
  const [projectSaving, setProjectSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Reset page index on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, industryFilter]);

  // Detail panel sub-data
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  // Main clients listener
  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setClients(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sub-data listeners when a client is selected
  useEffect(() => {
    if (!selectedClient) return;

    const unsubscribers = [];

    // Projects for this client
    const projectsQuery = query(
      collection(db, 'projects'),
      where('clientId', '==', selectedClient.id),
      orderBy('createdAt', 'desc')
    );
    unsubscribers.push(
      onSnapshot(projectsQuery, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setProjects(list);
      })
    );

    // Payments for this client
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('clientId', '==', selectedClient.id),
      orderBy('createdAt', 'desc')
    );
    unsubscribers.push(
      onSnapshot(paymentsQuery, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setPayments(list);
      })
    );

    // Notes for this client - Sorted in memory to bypass composite index requirement
    const notesQuery = query(
      collection(db, 'notes'),
      where('clientId', '==', selectedClient.id)
    );
    unsubscribers.push(
      onSnapshot(notesQuery, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return bTime - aTime;
        });
        setNotes(list);
      })
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [selectedClient]);

  // Create client
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.ownerName.trim()) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...formData,
        companyName: sanitizeInput(formData.companyName.trim()),
        ownerName: sanitizeInput(formData.ownerName.trim()),
        email: sanitizeInput(formData.email.trim()),
        phone: sanitizeInput(formData.phone.trim()),
        website: sanitizeInput(formData.website.trim()),
        company: sanitizeInput(formData.companyName.trim()),
        contactPerson: sanitizeInput(formData.ownerName.trim()),
        contractValue: Number(formData.contractValue) || 0,
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin',
      });

      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Created Client',
        'clients',
        docRef.id,
        `Created client profile for "${formData.companyName}" (${formData.ownerName})`
      );

      setFormData({ ...EMPTY_CLIENT });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating client:', err);
    }
    setSaving(false);
  };

  // Update client status
  const handleStatusChange = async (clientId, newStatus) => {
    try {
      await updateDoc(doc(db, 'clients', clientId), { status: newStatus });
      
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated Client Status',
        'clients',
        clientId,
        `Updated client status to "${newStatus}"`
      );

      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Delete client
  const handleDeleteClient = async (clientId) => {
    if (userRole !== 'super_admin') {
      alert('Access Denied: Only Super Admin can delete records.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const target = clients.find(c => c.id === clientId);
      await deleteDoc(doc(db, 'clients', clientId));
      
      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Deleted Client',
        'clients',
        clientId,
        `Deleted client profile for "${target?.companyName || clientId}"`
      );

      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(null);
      }
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  // Create project associated with the selected client
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectForm.projectName.trim() || !selectedClient) return;

    setProjectSaving(true);
    try {
      const projDoc = await addDoc(collection(db, 'projects'), {
        clientId: selectedClient.id,
        clientName: selectedClient.companyName || selectedClient.company || '', // backward compat
        projectName: projectForm.projectName.trim(),
        projectType: projectForm.projectType,
        type: projectForm.projectType, // backward compat
        projectValue: Number(projectForm.projectValue) || 0,
        budget: Number(projectForm.projectValue) || 0, // backward compat
        status: 'Planning',
        progress: 0,
        createdAt: serverTimestamp()
      });

      // Notification
      await addDoc(collection(db, 'notifications'), {
        type: 'project_created',
        title: 'New Project Initiated',
        message: `Project "${projectForm.projectName.trim()}" created for client "${selectedClient.companyName || selectedClient.company}".`,
        read: false,
        createdAt: serverTimestamp()
      });

      // Audit Log
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Created Project',
        'projects',
        projDoc.id,
        `Created project "${projectForm.projectName.trim()}" for client "${selectedClient.companyName || selectedClient.company}"`
      );

      setProjectForm({ projectName: '', projectType: 'AI Agents', projectValue: '' });
      setShowProjectModal(false);
      alert('Project successfully created!');
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setProjectSaving(false);
    }
  };

  // Add note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedClient) return;
    try {
      await addDoc(collection(db, 'notes'), {
        clientId: selectedClient.id,
        content: sanitizeInput(newNote.trim()),
        createdAt: serverTimestamp(),
        authorName: authUser?.email || 'Admin',
      });
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || client.status === statusFilter;
      const matchesIndustry = industryFilter === '' || client.industry === industryFilter;

      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [clients, searchTerm, statusFilter, industryFilter]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = useMemo(() => {
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, startIndex, itemsPerPage]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            CLIENT DATABASE
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            CLIENT DIRECTORY
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-grow rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No clients found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4 text-right">Contract Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {client.companyName}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light">{client.ownerName}</td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{client.email}</td>
                    <td className="px-6 py-4 text-gray-300 font-light">{client.industry}</td>
                    <td className="px-6 py-4 text-right text-white font-mono text-xs">
                      {formatCurrency(client.contractValue)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${
                          STATUS_COLORS[client.status] || 'border-white/10 text-gray-300'
                        }`}
                      >
                        {client.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                      {client.createdAt?.toDate
                        ? client.createdAt.toDate().toLocaleDateString('en-IN')
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
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
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

      {/* ──── Slide-Over Detail Panel ──── */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedClient(null)}
          />
          <div className="relative w-full max-w-2xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Client Details
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedClient.companyName}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                    userRole === 'super_admin'
                      ? 'border-red-500/20 hover:bg-red-950/20 text-red-400 hover:text-red-300'
                      : 'border-white/5 text-gray-600 cursor-not-allowed'
                  }`}
                  title={userRole === 'super_admin' ? 'Delete Client' : 'Super Admin Clearance Required'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Status Update */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                    Client Status
                  </span>
                  <span className="text-sm text-white font-medium mt-0.5">
                    Update current status:
                  </span>
                </div>
                <select
                  value={selectedClient.status || 'Active'}
                  onChange={(e) => handleStatusChange(selectedClient.id, e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white transition duration-200"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Client Profile Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Company</span>
                      <span className="text-sm text-white">{selectedClient.companyName}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Owner</span>
                      <span className="text-sm text-white">{selectedClient.ownerName}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Email</span>
                      <span className="text-sm text-white font-mono">{selectedClient.email}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Phone</span>
                      <span className="text-sm text-white font-mono">{selectedClient.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Industry</span>
                      <span className="text-sm text-white">{selectedClient.industry}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Globe className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Website</span>
                      <span className="text-sm text-white font-mono">{selectedClient.website || '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <IndianRupee className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Contract Value</span>
                      <span className="text-sm text-white font-semibold">{formatCurrency(selectedClient.contractValue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Associated Projects */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-gray-400" />
                    <span>Associated Projects</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProjectModal(true)}
                    className="text-[10px] font-bold tracking-widest text-white hover:text-gray-300 uppercase flex items-center gap-1 border border-white/10 rounded px-2.5 py-1 bg-white/5 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Project</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">No projects linked to this client.</p>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">{project.projectName}</span>
                          <span className="text-[10px] text-gray-400">{project.type} • {project.status || 'Planning'}</span>
                        </div>
                        {project.progress !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${project.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">{project.progress || 0}%</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Payment History */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span>Payment History</span>
                </h3>
                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">No payment records found.</p>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-white">{payment.description || 'Payment'}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-mono font-semibold">{formatCurrency(payment.amount)}</span>
                          <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${
                            payment.status === 'Paid' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10' :
                            payment.status === 'Pending' ? 'border-amber-500/20 text-amber-400 bg-amber-950/10' :
                            'border-rose-500/20 text-rose-400 bg-rose-950/10'
                          }`}>
                            {payment.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Notes Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span>Internal Notes</span>
                </h3>
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
                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'} &bull;{' '}
                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──── Create Client Modal ──── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  New Record
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  CREATE CLIENT
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateClient} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ownerName: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Industry</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://"
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Contract Value (₹)</label>
                  <input
                    type="number"
                    value={formData.contractValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contractValue: e.target.value }))}
                    placeholder="0"
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── Create Project Modal ──── */}
      {showProjectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowProjectModal(false)}
          />
          <div className="relative w-full max-w-md bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  {selectedClient.companyName || selectedClient.company}
                </span>
                <h2 className="text-lg font-normal text-white uppercase mt-1">
                  NEW PROJECT
                </h2>
              </div>
              <button
                onClick={() => setShowProjectModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project Name *</label>
                <input
                  type="text"
                  required
                  value={projectForm.projectName}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, projectName: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project Type *</label>
                <select
                  required
                  value={projectForm.projectType}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, projectType: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                >
                  <option value="AI Agents">AI Agents</option>
                  <option value="WhatsApp Automation">WhatsApp Automation</option>
                  <option value="Lead Generation">Lead Generation</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Business Automation">Business Automation</option>
                  <option value="Custom Systems">Custom Systems</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project Value (₹) *</label>
                <input
                  type="number"
                  required
                  value={projectForm.projectValue}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, projectValue: e.target.value }))}
                  placeholder="0"
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectSaving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {projectSaving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
