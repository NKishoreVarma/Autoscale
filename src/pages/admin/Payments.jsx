import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, X, Plus, IndianRupee, TrendingUp, AlertTriangle, Receipt, Filter, Calendar, CreditCard, FileText, User, StickyNote, ChevronDown } from 'lucide-react';

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
};

const STATUS_STYLES = {
  Paid: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Pending: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Overdue: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
  Cancelled: 'border-white/10 text-gray-400 bg-white/5',
};

const METHODS = ['Bank Transfer', 'UPI', 'Razorpay', 'Cash', 'Other'];
const STATUSES = ['Paid', 'Pending', 'Overdue', 'Cancelled'];

const initialForm = {
  clientName: '',
  amount: '',
  status: 'Pending',
  invoiceNumber: '',
  date: '',
  method: 'Bank Transfer',
  notes: '',
};

export default function Payments() {
  const { user: authUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail panel state
  const [detailStatus, setDetailStatus] = useState('');
  const [detailNotes, setDetailNotes] = useState('');

  // Real-time listener
  useEffect(() => {
    const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPayments(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Aggregates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = payments
    .filter((p) => {
      if (p.status !== 'Paid') return false;
      const d = p.date ? new Date(p.date) : p.createdAt?.toDate ? p.createdAt.toDate() : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const yearlyRevenue = payments
    .filter((p) => {
      if (p.status !== 'Paid') return false;
      const d = p.date ? new Date(p.date) : p.createdAt?.toDate ? p.createdAt.toDate() : null;
      return d && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const outstandingAmount = payments
    .filter((p) => p.status === 'Pending' || p.status === 'Overdue')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalTransactions = payments.length;

  // Filtering
  const filteredPayments = payments
    .filter((p) => {
      const matchesSearch =
        p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || p.status === statusFilter;
      const matchesMethod = methodFilter === '' || p.method === methodFilter;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const pDate = p.date ? new Date(p.date) : p.createdAt?.toDate ? p.createdAt.toDate() : null;
        if (pDate) {
          if (dateFrom && pDate < new Date(dateFrom)) matchesDate = false;
          if (dateTo && pDate > new Date(dateTo + 'T23:59:59')) matchesDate = false;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });

  // Create payment
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.amount) return;
    setSaving(true);

    try {
      await addDoc(collection(db, 'payments'), {
        clientName: form.clientName.trim(),
        amount: Number(form.amount),
        status: form.status,
        invoiceNumber: form.invoiceNumber.trim(),
        date: form.date,
        method: form.method,
        notes: form.notes.trim(),
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin',
      });
      setForm(initialForm);
      setShowModal(false);
    } catch (err) {
      console.error('Error creating payment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update status from detail panel
  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), { status: newStatus });
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
    }
  };

  // Update notes from detail panel
  const handleNotesUpdate = async (paymentId, newNotes) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), { notes: newNotes });
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment((prev) => ({ ...prev, notes: newNotes }));
      }
    } catch (err) {
      console.error('Error updating notes:', err);
    }
  };

  // Delete payment
  const handleDelete = async (paymentId) => {
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
      setSelectedPayment(null);
    } catch (err) {
      console.error('Error deleting payment:', err);
    }
  };

  // Open detail panel
  const openDetail = (payment) => {
    setSelectedPayment(payment);
    setDetailStatus(payment.status || 'Pending');
    setDetailNotes(payment.notes || '');
  };

  const metrics = [
    { label: 'Monthly Revenue', value: formatINR(monthlyRevenue), icon: IndianRupee, accent: 'text-emerald-400' },
    { label: 'Yearly Revenue', value: formatINR(yearlyRevenue), icon: TrendingUp, accent: 'text-blue-400' },
    { label: 'Outstanding', value: formatINR(outstandingAmount), icon: AlertTriangle, accent: 'text-amber-400' },
    { label: 'Total Transactions', value: totalTransactions, icon: Receipt, accent: 'text-purple-400' },
  ];

  return (
    <div className="flex-grow flex flex-col gap-8">

      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            FINANCIAL OPERATIONS
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            REVENUE TRACKING
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Payment</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-3"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">{m.label}</span>
                <Icon className={`w-4 h-4 ${m.accent}`} />
              </div>
              <span className="text-2xl font-light text-white tracking-tight">{m.value}</span>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by client or invoice..."
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
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
          >
            <option value="">All Methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition duration-200"
            title="To date"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-grow rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    onClick={() => openDetail(payment)}
                    className="hover:bg-white/[0.02] cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white group-hover:text-white transition duration-150">
                      {payment.clientName}
                    </td>
                    <td className="px-6 py-4 text-white font-mono text-xs">
                      {formatINR(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${STATUS_STYLES[payment.status] || STATUS_STYLES.Pending}`}>
                        {payment.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                      {payment.invoiceNumber || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                      {payment.date
                        ? new Date(payment.date).toLocaleDateString('en-IN')
                        : payment.createdAt?.toDate
                        ? payment.createdAt.toDate().toLocaleDateString('en-IN')
                        : 'Recent'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300 font-light text-xs">
                      {payment.method || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 z-10 shadow-2xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">New Entry</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">Record Payment</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Client Name</label>
                <input
                  type="text"
                  required
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                  placeholder="Enter client name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Invoice Number</label>
                  <input
                    type="text"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Payment Method</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold tracking-wider text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition duration-200 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Detail Panel */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedPayment(null)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-black border-l border-white/10 h-full flex flex-col z-10 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  Payment Details
                </span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">
                  {selectedPayment.clientName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 no-scrollbar">

              {/* Status Update */}
              <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Payment Status</span>
                  <span className="text-sm text-white font-medium mt-0.5">Update payment status:</span>
                </div>
                <select
                  value={selectedPayment.status || 'Pending'}
                  onChange={(e) => handleStatusUpdate(selectedPayment.id, e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-white transition duration-200"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Core Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Client Name</span>
                      <span className="text-sm text-white">{selectedPayment.clientName}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <IndianRupee className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Amount</span>
                      <span className="text-sm text-white font-mono">{formatINR(selectedPayment.amount)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Invoice Number</span>
                      <span className="text-sm text-white font-mono">{selectedPayment.invoiceNumber || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Payment Date</span>
                      <span className="text-sm text-white font-mono">
                        {selectedPayment.date
                          ? new Date(selectedPayment.date).toLocaleDateString('en-IN')
                          : selectedPayment.createdAt?.toDate
                          ? selectedPayment.createdAt.toDate().toLocaleDateString('en-IN')
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <CreditCard className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Payment Method</span>
                      <span className="text-sm text-white">{selectedPayment.method || '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Receipt className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Status</span>
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase w-fit mt-0.5 ${STATUS_STYLES[selectedPayment.status] || STATUS_STYLES.Pending}`}>
                        {selectedPayment.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Notes Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-gray-400" />
                  <span>Notes</span>
                </h3>
                <textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case resize-none"
                  placeholder="Add notes about this payment..."
                />
                <button
                  onClick={() => handleNotesUpdate(selectedPayment.id, detailNotes)}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-4 py-2"
                >
                  Save Notes
                </button>
              </div>

              <hr className="border-white/5" />

              {/* Danger Zone */}
              <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-950/5">
                <span className="text-[9px] font-bold tracking-widest text-rose-400 uppercase block mb-3">Danger Zone</span>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this payment record?')) {
                      handleDelete(selectedPayment.id);
                    }
                  }}
                  className="text-xs font-semibold tracking-wider text-rose-400 border border-rose-500/20 rounded-lg px-4 py-2 hover:bg-rose-950/20 transition duration-200 uppercase"
                >
                  Delete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
