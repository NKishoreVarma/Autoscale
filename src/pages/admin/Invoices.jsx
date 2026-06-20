import { triggerToast } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import { logActivity } from '../../utils/activityLogger';
import { emailService } from '../../utils/emailService';
import { whatsappService } from '../../utils/whatsappService';
import { pdfGenerator } from '../../utils/pdfGenerator';
import {
Search, X, Plus, FileText, IndianRupee, AlertTriangle, CheckSquare,
  Trash2, Calendar, User, Briefcase, TrendingUp, HelpCircle
} from 'lucide-react';

const STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];
const STATUS_COLORS = {
  Draft: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Sent: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Paid: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Overdue: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
};

const EMPTY_INVOICE = {
  invoiceNumber: '',
  clientId: '',
  projectId: '',
  amount: '',
  status: 'Sent',
  dueDate: '',
};

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
};

export default function Invoices() {
  const { user: authUser, userRole } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_INVOICE });
  const [saving, setSaving] = useState(false);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isSuperAdmin = userRole === 'super_admin';

  // Sync data and auto-seed if empty
  useEffect(() => {
    const unsubInvoices = onSnapshot(
      query(collection(db, 'invoices'), orderBy('createdAt', 'desc')),
      async (snapshot) => {
        if (snapshot.empty) {
          console.log('[Invoices] Collection empty. Seeding defaults...');
          
          // We need some client & project IDs, let's wait until they load
          // Otherwise, we seed static clientNames and projectNames.
          const defaultInvoices = [
            {
              invoiceNumber: 'INV-2026-001',
              clientId: 'client-amit-patel',
              clientName: 'Patel Care Clinics',
              projectId: 'project-amit-ai',
              projectTitle: 'Patel AI Appointment Agent',
              amount: 80000,
              status: 'Paid',
              issueDate: '2026-05-10',
              dueDate: '2026-05-25',
              createdAt: new Date(2026, 4, 10)
            },
            {
              invoiceNumber: 'INV-2026-002',
              clientId: 'client-priya-nair',
              clientName: 'Green Space Realty',
              projectId: 'project-priya-whatsapp',
              projectTitle: 'WhatsApp Lead CRM Pipeline',
              amount: 45000,
              status: 'Paid',
              issueDate: '2026-06-01',
              dueDate: '2026-06-15',
              createdAt: new Date(2026, 5, 1)
            },
            {
              invoiceNumber: 'INV-2026-003',
              clientId: 'client-amit-patel',
              clientName: 'Patel Care Clinics',
              projectId: 'project-amit-ai',
              projectTitle: 'Patel AI Appointment Agent',
              amount: 60000,
              status: 'Sent',
              issueDate: '2026-06-12',
              dueDate: '2026-06-30',
              createdAt: new Date(2026, 5, 12)
            }
          ];

          for (const inv of defaultInvoices) {
            try {
              await addDoc(collection(db, 'invoices'), {
                ...inv,
                createdAt: serverTimestamp()
              });
            } catch (err) {
              console.error('Error seeding default invoice:', err);
            }
          }
        } else {
          setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to invoices:', err);
        setLoading(false);
      }
    );

    const unsubClients = onSnapshot(
      query(collection(db, 'clients'), orderBy('companyName', 'asc')),
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), orderBy('projectName', 'asc')),
      (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubInvoices();
      unsubClients();
      unsubProjects();
    };
  }, []);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!formData.invoiceNumber.trim() || !formData.amount || !formData.clientId) return;

    setSaving(true);
    try {
      const client = clients.find(c => c.id === formData.clientId);
      const project = projects.find(p => p.id === formData.projectId);
      
      const invDoc = await addDoc(collection(db, 'invoices'), {
        invoiceNumber: formData.invoiceNumber.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: client ? (client.companyName || client.company) : '',
        projectId: formData.projectId || '',
        projectTitle: project ? project.projectName : 'General Retainer',
        amount: Number(formData.amount),
        status: formData.status,
        dueDate: formData.dueDate,
        issueDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      // Auto generate and upload Invoice PDF
      try {
        const pdfUrl = await pdfGenerator.generateAndUploadInvoice(invDoc.id, {
          invoiceNumber: formData.invoiceNumber.trim().toUpperCase(),
          clientName: client ? (client.companyName || client.company) : '',
          projectTitle: project ? project.projectName : 'General Retainer',
          amount: Number(formData.amount),
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: formData.dueDate
        });
        if (pdfUrl) {
          await updateDoc(doc(db, 'invoices', invDoc.id), { pdfUrl });
        }
      } catch (pdfErr) {
        console.error('[Invoices] Invoice PDF generation failed:', pdfErr);
      }

      // Timeline log if project selected
      if (formData.projectId) {
        await addDoc(collection(db, 'projectTimelines'), {
          projectId: formData.projectId,
          stage: 'Billing',
          description: `Invoice ${formData.invoiceNumber.trim().toUpperCase()} generated for ${formatINR(formData.amount)}`,
          timestamp: serverTimestamp()
        });
      }

      // Trigger email & WhatsApp if Sent
      if (formData.status === 'Sent' && client) {
        const invoiceObj = {
          invoiceNumber: formData.invoiceNumber.trim().toUpperCase(),
          amount: Number(formData.amount),
          dueDate: formData.dueDate,
          projectTitle: project ? project.projectName : 'General Retainer'
        };
        try {
          await emailService.sendInvoiceEmail(invoiceObj, client);
          await whatsappService.sendInvoiceDue(invoiceObj, client);
        } catch (dispatchErr) {
          console.error('[Invoices] Failed to send new invoice notifications:', dispatchErr);
        }
      }

      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Created Invoice',
        'invoices',
        invDoc.id,
        `Generated invoice "${formData.invoiceNumber}" for ${formatINR(formData.amount)}`
      );

      setFormData({ ...EMPTY_INVOICE });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating invoice:', err);
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      const target = invoices.find(i => i.id === invoiceId);
      await updateDoc(doc(db, 'invoices', invoiceId), { status: newStatus });

      if (newStatus === 'Paid') {
        await logActivity(
          'invoice_paid',
          'Invoice Paid',
          `Invoice ${target?.invoiceNumber || invoiceId} of amount ${formatINR(target?.amount || 0)} marked as Paid for client ${target?.clientName || 'Client'}`
        );
      }

      // Trigger notifications if invoice Sent
      if (newStatus === 'Sent' && target) {
        const client = clients.find(c => c.id === target.clientId);
        if (client) {
          try {
            await emailService.sendInvoiceEmail(target, client);
            await whatsappService.sendInvoiceDue(target, client);
          } catch (dispatchErr) {
            console.error('[Invoices] Failed to send updated invoice notifications:', dispatchErr);
          }
        }
      }

      // Timeline log if project linked
      if (target?.projectId) {
        await addDoc(collection(db, 'projectTimelines'), {
          projectId: target.projectId,
          stage: 'Billing',
          description: `Invoice ${target.invoiceNumber} status updated to ${newStatus}`,
          timestamp: serverTimestamp()
        });
      }

      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated Invoice Status',
        'invoices',
        invoiceId,
        `Updated status of invoice "${target?.invoiceNumber || invoiceId}" to "${newStatus}"`
      );
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!isSuperAdmin) {
      triggerToast('Access Denied: Only Super Admin can delete invoices.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      const target = invoices.find(i => i.id === invoiceId);
      await deleteDoc(doc(db, 'invoices', invoiceId));

      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Deleted Invoice',
        'invoices',
        invoiceId,
        `Deleted invoice "${target?.invoiceNumber || invoiceId}"`
      );
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  // Filter projects by client if client selected
  const filteredProjectsForForm = formData.clientId
    ? projects.filter(p => p.clientId === formData.clientId)
    : projects;

  // Invoice calculations
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const paidInvoiced = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  const outstandingInvoiced = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((sum, i) => sum + (i.amount || 0), 0);
  const draftInvoiced = invoices.filter(i => i.status === 'Draft').reduce((sum, i) => sum + (i.amount || 0), 0);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const metrics = [
    { label: 'Total Invoiced', value: formatINR(totalInvoiced), icon: FileText, color: 'text-white' },
    { label: 'Paid Invoiced', value: formatINR(paidInvoiced), icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Outstanding Invoiced', value: formatINR(outstandingInvoiced), icon: AlertTriangle, color: 'text-amber-400' },
    { label: 'Draft Invoiced', value: formatINR(draftInvoiced), icon: CheckSquare, color: 'text-gray-400' },
  ];

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            FINANCIAL COMMAND
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            INVOICE MANAGER
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-2"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">{m.label}</span>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <span className="text-2xl font-light text-white tracking-tight">{m.value}</span>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
          />
        </div>
        <div className="flex gap-3">
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

      {/* List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  {isSuperAdmin && <th className="px-6 py-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition duration-150">
                    <td className="px-6 py-4 font-semibold font-mono text-white">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 text-gray-300 font-light">{inv.clientName}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs truncate max-w-[150px]">{inv.projectTitle || 'General Retainer'}</td>
                    <td className="px-6 py-4 text-white font-mono">{formatINR(inv.amount)}</td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{inv.dueDate || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={inv.status || 'Sent'}
                        onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                        className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase bg-black ${STATUS_COLORS[inv.status] || 'border-white/10 text-gray-300'}`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="w-7 h-7 rounded-full border border-red-500/20 hover:bg-red-950/20 text-red-400 hover:text-red-300 flex items-center justify-center transition ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">New Invoice</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">GENERATE INVOICE</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-004"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Client Organization *</label>
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value, projectId: '' }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.companyName || c.company}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Linked Project</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">General Retainer (No Project)</option>
                    {filteredProjectsForForm.map(p => (
                      <option key={p.id} value={p.id}>{p.projectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
