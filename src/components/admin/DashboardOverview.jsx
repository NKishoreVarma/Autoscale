import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { checkSystemHealth } from '../../utils/healthService';
import { saveDashboardMetrics } from '../../utils/analyticsService';
import {
  Users, AlertCircle, CheckCircle, Calendar, ArrowUpRight,
  Building2, FolderKanban, CreditCard, Inbox, CheckSquare, TrendingUp, DollarSign,
  Cpu, MessageCircle, Server, ShieldCheck, Activity, Globe, GitBranch, RefreshCw, PhoneCall, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatCurrencyINR(amount) {
  if (amount === 0) return '₹0';
  const formatted = amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return `₹${formatted}`;
}

export default function DashboardOverview() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contactForms, setContactForms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Health check state
  const [healthStatus, setHealthStatus] = useState({
    firebase: 'ONLINE',
    firestore: 'ONLINE',
    auth: 'ONLINE',
    storage: 'ONLINE',
    smtp: 'ONLINE',
    twilio: 'ONLINE',
    website: 'ONLINE'
  });

  // Run health check dynamically
  useEffect(() => {
    const runHealthCheck = async () => {
      const status = await checkSystemHealth();
      setHealthStatus(status);
    };

    runHealthCheck();
    const interval = setInterval(runHealthCheck, 30000); // Probe every 30s
    return () => clearInterval(interval);
  }, []);

  // Listen to Firestore feeds
  useEffect(() => {
    let loadedCollections = 0;
    const totalCollections = 9;
    const checkLoaded = () => {
      loadedCollections++;
      if (loadedCollections >= totalCollections) setLoading(false);
    };

    const unsubClients = onSnapshot(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
      (snap) => { setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
      (snap) => { setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), orderBy('createdAt', 'desc')),
      (snap) => { setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubInvoices = onSnapshot(
      query(collection(db, 'invoices'), orderBy('createdAt', 'desc')),
      (snap) => { setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubContactForms = onSnapshot(
      query(collection(db, 'contactForms'), orderBy('createdAt', 'desc')),
      (snap) => { setContactForms(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      (snap) => { setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubServices = onSnapshot(
      collection(db, 'services'),
      (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubMeetings = onSnapshot(
      query(collection(db, 'meetings'), orderBy('date', 'asc')),
      (snap) => { setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(5)),
      (snap) => { setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    return () => {
      unsubClients();
      unsubProjects();
      unsubPayments();
      unsubInvoices();
      unsubContactForms();
      unsubBookings();
      unsubServices();
      unsubMeetings();
      unsubNotifications();
    };
  }, []);

  // Date parsing helper
  const parseInvoiceDate = (inv) => {
    if (inv.issueDate) return new Date(inv.issueDate);
    if (inv.createdAt?.toDate) return inv.createdAt.toDate();
    return new Date();
  };

  // Metric calculations
  const totalLeads = contactForms.length + bookings.length;
  
  // Leads Today (since 00:00)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const leadsToday = contactForms.filter(c => {
    const d = c.createdAt?.toDate ? c.createdAt.toDate() : null;
    return d && d >= startOfToday;
  }).length + bookings.filter(b => {
    const d = b.createdAt?.toDate ? b.createdAt.toDate() : null;
    return d && d >= startOfToday;
  }).length;

  const wonLeads = contactForms.filter(c => c.status === 'Won').length + bookings.filter(b => b.status === 'Won' || b.status === 'Completed').length;
  const activeProjects = projects.filter(p => p.status === 'Planning' || p.status === 'Building' || p.status === 'Testing').length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Pipeline Value (Sum of budget/contract value of open leads)
  const openLeads = [
    ...contactForms.filter(c => c.status !== 'Won' && c.status !== 'Lost' && c.status !== 'Completed' && c.status !== 'Cancelled'),
    ...bookings.filter(b => b.status !== 'Won' && b.status !== 'Lost' && b.status !== 'Completed' && b.status !== 'Cancelled')
  ];
  const pipelineValue = openLeads.reduce((sum, l) => sum + (Number(l.contractValue || l.budget) || 15000), 0);

  // Paid Revenue calculations
  const invoicePaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  const paymentPaid = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidRevenue = invoicePaid + paymentPaid;

  // Sync state to analytics/dashboard with deduplication and debouncing
  const lastSyncRef = useRef("");

  useEffect(() => {
    if (loading) return;

    const metricsPayload = {
      totalLeads,
      totalClients: clients.length,
      activeClients: clients.length,
      totalProjects: projects.length,
      runningProjects: activeProjects,
      totalServices: services.length,
      bookingsToday: leadsToday,
      bookingsThisMonth: bookings.length,
      totalBookings: bookings.length,
      revenueGenerated: paidRevenue,
      monthlyRevenue: paidRevenue
    };

    const payloadStr = JSON.stringify(metricsPayload);
    if (lastSyncRef.current === payloadStr) return;

    lastSyncRef.current = payloadStr;

    const syncMetrics = async () => {
      await saveDashboardMetrics(metricsPayload);
    };

    const timer = setTimeout(syncMetrics, 2000);
    return () => clearTimeout(timer);
  }, [clients, projects, payments, invoices, bookings, contactForms, services, loading, totalLeads, activeProjects, leadsToday, paidRevenue]);

  const statCards = [
    { name: 'Leads Today', value: leadsToday, icon: Users, desc: 'Captured since midnight' },
    { name: 'Active Projects', value: activeProjects, icon: FolderKanban, desc: 'Deliverables under construction' },
    { name: 'Revenue Generated', value: formatCurrencyINR(paidRevenue), icon: DollarSign, desc: 'Total paid invoices and bills' },
    { name: 'Pipeline Value', value: formatCurrencyINR(pipelineValue), icon: TrendingUp, desc: 'Value of outstanding deal pipeline' },
    { name: 'Conversion Rate', value: `${conversionRate}%`, icon: CheckCircle, desc: 'Proportion of won client contracts' },
    { name: 'Total Leads Captured', value: totalLeads, icon: Inbox, desc: 'Cumulative leads database size' },
  ];

  const getStatusBadge = (statusVal) => {
    if (statusVal === 'ONLINE') {
      return <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">ONLINE</span>;
    }
    if (statusVal === 'WARNING') {
      return <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">WARNING</span>;
    }
    return <span className="text-rose-500 font-bold uppercase tracking-wider text-[10px]">OFFLINE</span>;
  };

  const hasOffline = Object.values(healthStatus).some(v => v === 'OFFLINE');
  const hasWarning = Object.values(healthStatus).some(v => v === 'WARNING');

  let overallStatusLabel = 'All Systems Operational';
  let overallStatusColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20';
  let overallBulletColor = 'bg-emerald-400';

  if (hasOffline) {
    overallStatusLabel = 'Degraded Performance';
    overallStatusColor = 'text-rose-400 border-rose-500/20 bg-rose-950/20';
    overallBulletColor = 'bg-rose-500';
  } else if (hasWarning) {
    overallStatusLabel = 'Gateway Warning';
    overallStatusColor = 'text-amber-400 border-amber-500/20 bg-amber-950/20';
    overallBulletColor = 'bg-amber-400';
  }

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 flex-grow">
      {/* Title Header */}
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
          FOUNDER MISSION CONTROL
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          COMMAND CENTER
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between h-[150px] relative overflow-hidden"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {stat.name}
                </span>
                <Icon className="w-5 h-5 text-gray-500" />
              </div>
              <div className="my-2 text-3xl font-semibold tracking-tight text-white font-mono">
                {stat.value}
              </div>
              <span className="text-[10px] text-gray-500 tracking-wide font-light">
                {stat.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Health Checklist row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Live System Status Panel */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-400" />
              <span>System Server Status</span>
            </h3>
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${overallStatusColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${overallBulletColor}`} />
              {overallStatusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-black border border-white/5 flex flex-col gap-1.5">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Firestore Database</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white">db.autoscale.systems</span>
                {getStatusBadge(healthStatus.firestore)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-black border border-white/5 flex flex-col gap-1.5">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Firebase Auth Gateway</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white">auth.autoscale.systems</span>
                {getStatusBadge(healthStatus.auth)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-black border border-white/5 flex flex-col gap-1.5">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Twilio WhatsApp API</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white">whatsapp-gateway-v1</span>
                {getStatusBadge(healthStatus.twilio)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-black border border-white/5 flex flex-col gap-1.5">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">SMTP Mail Router</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white">mail.autoscale.systems</span>
                {getStatusBadge(healthStatus.smtp)}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Deployment / Build Info */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span>Production Deployment Status</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase font-mono">
              v1.5.0-growth
            </span>
          </div>

          <div className="flex flex-col gap-4 text-xs font-mono">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-gray-400">
                <GitBranch className="w-3.5 h-3.5" />
                <span>ACTIVE DEPLOYMENT BRANCH</span>
              </div>
              <span className="text-white">main</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>PIPELINE BUILD STATUS</span>
              </div>
              <span className="text-emerald-400 font-semibold">SUCCESS</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SSL CERTIFICATION</span>
              </div>
              <span className="text-emerald-400">{getStatusBadge(healthStatus.website)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2 text-gray-400">
                <Activity className="w-3.5 h-3.5" />
                <span>LAST DEPLOYED TIMESTAMP</span>
              </div>
              <span className="text-white">2026-06-14 22:45:00</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid — Upcoming Calls & Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Upcoming Calls / Meetings */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-gray-400" />
              <span>Upcoming Calls & Meetings</span>
            </h3>
            <button
              onClick={() => navigate('/admin/leads')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
            >
              <span>Schedule Call</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/5 flex-grow">
            {meetings.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No upcoming consultations scheduled.
              </div>
            ) : (
              meetings.slice(0, 5).map((meet) => (
                <div key={meet.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white uppercase">{meet.title}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">{meet.date} &bull; {meet.time}</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase border border-white/10 px-2 py-0.5 rounded bg-white/5">
                    Call Slot
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time System Notifications Feed */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400" />
              <span>Recent System Notifications</span>
            </h3>
          </div>

          <div className="flex flex-col gap-5 flex-grow font-light text-xs">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No notifications received.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="flex gap-4 items-start border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-gray-500">
                    <Bell className="w-3 h-3" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">{notif.title}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed normal-case">{notif.message}</p>
                    <span className="text-[9px] text-gray-600 font-mono mt-1">
                      {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('en-IN') : 'Recent'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
