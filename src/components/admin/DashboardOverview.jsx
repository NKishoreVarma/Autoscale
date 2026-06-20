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
import { DashboardSkeleton } from '../ui/Skeletons';

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
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [services, setServices] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
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
    google_calendar: 'ONLINE',
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
    const totalCollections = 10;
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

    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), orderBy('createdAt', 'desc')),
      (snap) => { setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubProposals = onSnapshot(
      query(collection(db, 'proposals'), orderBy('createdAt', 'desc')),
      (snap) => { setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
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

    const unsubActivity = onSnapshot(
      query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => { setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    return () => {
      unsubClients();
      unsubProjects();
      unsubPayments();
      unsubInvoices();
      unsubLeads();
      unsubProposals();
      unsubServices();
      unsubMeetings();
      unsubNotifications();
      unsubActivity();
    };
  }, []);

  // Date parsing helper
  const parseInvoiceDate = (inv) => {
    if (inv.issueDate) return new Date(inv.issueDate);
    if (inv.createdAt?.toDate) return inv.createdAt.toDate();
    return new Date();
  };

  // Metric calculations
  const totalLeads = leads.length;
  
  // Leads Today (since 00:00)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const leadsToday = leads.filter(l => {
    const d = l.createdAt?.toDate ? l.createdAt.toDate() : null;
    return d && d >= startOfToday;
  }).length;

  const wonLeads = leads.filter(l => l.status === 'Won').length;
  const activeProjects = projects.filter(p => (p.status || '').toLowerCase() !== 'completed').length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Pipeline Value (Sum of budget/contract value of open proposals)
  const openProposals = proposals.filter(p => p.status !== 'Accepted' && p.status !== 'Rejected');
  const pipelineValue = openProposals.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  // Paid Revenue calculations (strictly from Paid Invoices)
  const paidRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.amount || 0), 0);

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
      bookingsThisMonth: leads.filter(l => l.leadSource === 'Book Audit').length,
      totalBookings: leads.filter(l => l.leadSource === 'Book Audit').length,
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
  }, [clients, projects, payments, invoices, leads, proposals, services, loading, totalLeads, activeProjects, leadsToday, paidRevenue]);

  const statCards = [
    { name: 'Leads Today', value: leadsToday, icon: Users, desc: 'Captured since midnight' },
    { name: 'Active Projects', value: activeProjects, icon: FolderKanban, desc: 'Deliverables under construction' },
    { name: 'Revenue Generated', value: formatCurrencyINR(paidRevenue), icon: DollarSign, desc: 'Total paid invoices and bills' },
    { name: 'Pipeline Value', value: formatCurrencyINR(pipelineValue), icon: TrendingUp, desc: 'Value of outstanding deal pipeline' },
    { name: 'Conversion Rate', value: `${conversionRate}%`, icon: CheckCircle, desc: 'Proportion of won client contracts' },
    { name: 'Total Leads Captured', value: totalLeads, icon: Inbox, desc: 'Cumulative leads database size' },
  ];

  const getStatusBadge = (statusVal) => {
    if (statusVal === 'Connected') {
      return <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">CONNECTED</span>;
    }
    if (statusVal === 'Configuration Missing') {
      return <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">CONFIG MISSING</span>;
    }
    return <span className="text-rose-500 font-bold uppercase tracking-wider text-[10px]">DISCONNECTED</span>;
  };

  const hasDisconnected = Object.values(healthStatus).some(v => v === 'Disconnected');
  const hasConfigMissing = Object.values(healthStatus).some(v => v === 'Configuration Missing');

  let overallStatusLabel = 'All Systems Operational';
  let overallStatusColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20';
  let overallBulletColor = 'bg-emerald-400';

  if (hasDisconnected) {
    overallStatusLabel = 'System Disconnected';
    overallStatusColor = 'text-rose-400 border-rose-500/20 bg-rose-950/20';
    overallBulletColor = 'bg-rose-500';
  } else if (hasConfigMissing) {
    overallStatusLabel = 'Gateway Setup Required';
    overallStatusColor = 'text-amber-400 border-amber-500/20 bg-amber-950/20';
    overallBulletColor = 'bg-amber-400';
  }

  if (loading) {
    return <DashboardSkeleton />;
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
            <div className="p-4 rounded-lg bg-black border border-white/5 flex flex-col gap-1.5">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Google Calendar Gateway</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white">google-calendar-api</span>
                {getStatusBadge(healthStatus.google_calendar)}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-black border border-white/5 flex flex-col gap-1.5">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Firebase Storage Bucket</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-white">storage.autoscale.systems</span>
                {getStatusBadge(healthStatus.storage)}
              </div>
            </div>
          </div>
        </div>
        {/* Global Activity Stream */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-4"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400 animate-pulse" />
              <span>Global Activity Stream</span>
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase font-mono">
              Live Feed
            </span>
          </div>

          <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[300px] pr-2 no-scrollbar">
            {activityLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest">
                No activity logged yet.
              </div>
            ) : (
              activityLogs.map((log) => {
                // Determine icon and color based on activity type or action
                const type = (log.type || '').toLowerCase();
                const action = (log.action || '').toLowerCase();
                
                let icon = <Activity className="w-3.5 h-3.5 text-gray-400" />;

                if (type.includes('lead') || action.includes('lead') || action.includes('booking') || action.includes('contact')) {
                  icon = <Users className="w-3.5 h-3.5 text-amber-400" />;
                } else if (type.includes('proposal') || action.includes('proposal')) {
                  icon = <Cpu className="w-3.5 h-3.5 text-purple-400" />;
                } else if (type.includes('client') || action.includes('client')) {
                  icon = <Building2 className="w-3.5 h-3.5 text-emerald-400" />;
                } else if (type.includes('project') || action.includes('project')) {
                  icon = <FolderKanban className="w-3.5 h-3.5 text-blue-400" />;
                } else if (type.includes('task') || action.includes('task')) {
                  icon = <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />;
                } else if (type.includes('invoice') || action.includes('invoice') || action.includes('payment') || type.includes('payment')) {
                  icon = <CreditCard className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
                }

                const timeStr = log.createdAt?.toDate 
                  ? log.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : (log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent');

                const dateStr = log.createdAt?.toDate
                  ? log.createdAt.toDate().toLocaleDateString('en-IN')
                  : (log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString('en-IN') : 'Recent');

                const detailsText = log.description || log.details || '';
                const titleText = log.title || log.action || 'Event';

                return (
                  <div key={log.id} className="flex items-start justify-between gap-4 p-2.5 rounded-lg bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] transition duration-150">
                    <div className="flex gap-3 items-start">
                      <div className="p-1.5 rounded-md border border-white/10 bg-white/5 flex items-center justify-center mt-0.5">
                        {icon}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">{titleText}</span>
                        <p className="text-[11px] text-gray-400 font-light leading-normal normal-case">{detailsText}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right font-mono text-[9px] text-gray-500">
                      <span>{timeStr}</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                );
              })
            )}
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
