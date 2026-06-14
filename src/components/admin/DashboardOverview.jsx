import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { checkSystemHealth } from '../../utils/healthService';
import { saveDashboardMetrics } from '../../utils/analyticsService';
import {
  Users, AlertCircle, CheckCircle, Calendar, ArrowUpRight,
  Building2, FolderKanban, CreditCard, Inbox, CheckSquare, TrendingUp, DollarSign,
  Cpu, MessageCircle, Server, ShieldCheck, Activity, Globe, GitBranch, RefreshCw
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
  const [activities, setActivities] = useState([]);
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
    const totalCollections = 7;
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

    return () => {
      unsubClients();
      unsubProjects();
      unsubPayments();
      unsubInvoices();
      unsubContactForms();
      unsubBookings();
      unsubServices();
    };
  }, []);

  // Consolidate recent client activity feed
  useEffect(() => {
    const feed = [];

    contactForms.slice(0, 3).forEach(form => {
      feed.push({
        id: `contact-${form.id}`,
        type: 'lead',
        icon: Users,
        title: 'New Lead Ingested',
        desc: `${form.name || 'Unknown'} (${form.company || 'N/A'}) submitted contact form.`,
        time: form.createdAt?.toDate ? form.createdAt.toDate() : new Date(),
      });
    });

    clients.slice(0, 3).forEach(client => {
      feed.push({
        id: `client-${client.id}`,
        type: 'client',
        icon: Building2,
        title: 'Client Contract Activated',
        desc: `${client.companyName || client.ownerName || 'New client'} onboarded.`,
        time: client.createdAt?.toDate ? client.createdAt.toDate() : new Date(),
      });
    });

    projects.slice(0, 3).forEach(project => {
      feed.push({
        id: `project-${project.id}`,
        type: 'project',
        icon: FolderKanban,
        title: 'Project Initiated',
        desc: `Project "${project.projectName || 'Untitled'}" started development.`,
        time: project.createdAt?.toDate ? project.createdAt.toDate() : new Date(),
      });
    });

    payments.slice(0, 3).forEach(payment => {
      feed.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        icon: CreditCard,
        title: 'Payment Received',
        desc: `${formatCurrencyINR(payment.amount || 0)} recorded for client.`,
        time: payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(),
      });
    });

    bookings.slice(0, 3).forEach(app => {
      feed.push({
        id: `booking-${app.id}`,
        type: 'booking',
        icon: Calendar,
        title: 'Booking Scheduled',
        desc: `Consultation booked by ${app.name || app.client || app.email || 'Client'}.`,
        time: app.createdAt?.toDate ? app.createdAt.toDate() : new Date(),
      });
    });

    feed.sort((a, b) => b.time - a.time);
    setActivities(feed.slice(0, 8));
  }, [contactForms, clients, projects, payments, bookings]);

  // Metric calculations (Phase 6 - Analytics Engine)
  const totalLeads = contactForms.length + bookings.length;
  const wonLeads = contactForms.filter(c => c.status === 'Won').length + bookings.filter(b => b.status === 'Won' || b.status === 'Completed').length;
  const activeClients = clients.filter(c => c.status === 'Active').length;
  const activeProjects = projects.filter(p => p.status === 'Planning' || p.status === 'Building' || p.status === 'Testing').length;
  const totalServices = services.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthPrefix = new Date().toISOString().substring(0, 7);

  const bookingsToday = bookings.filter(b => (b.preferredDate || b.date) === todayStr).length;
  const bookingsThisMonth = bookings.filter(b => (b.preferredDate || b.date)?.startsWith(thisMonthPrefix)).length;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const currentYear = now.getFullYear();

  const parseInvoiceDate = (inv) => {
    if (inv.issueDate) return new Date(inv.issueDate);
    if (inv.createdAt?.toDate) return inv.createdAt.toDate();
    return new Date();
  };

  // Invoices sums
  const invoiceMonthly = invoices
    .filter(i => {
      if (i.status !== 'Paid') return false;
      const d = parseInvoiceDate(i);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const invoiceQuarter = invoices
    .filter(i => {
      if (i.status !== 'Paid') return false;
      const d = parseInvoiceDate(i);
      return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === currentYear;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const invoiceAnnual = invoices
    .filter(i => {
      if (i.status !== 'Paid') return false;
      const d = parseInvoiceDate(i);
      return d.getFullYear() === currentYear;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const invoiceOutstanding = invoices
    .filter(i => i.status === 'Sent' || i.status === 'Overdue')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const invoicePaid = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  // Payments sums (fallback / backward compat)
  const paymentMonthly = payments
    .filter(p => {
      if (p.status !== 'Paid') return false;
      const d = p.date ? new Date(p.date) : p.createdAt?.toDate ? p.createdAt.toDate() : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const paymentQuarter = payments
    .filter(p => {
      if (p.status !== 'Paid') return false;
      const d = p.date ? new Date(p.date) : p.createdAt?.toDate ? p.createdAt.toDate() : null;
      return d && Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const paymentAnnual = payments
    .filter(p => {
      if (p.status !== 'Paid') return false;
      const d = p.date ? new Date(p.date) : p.createdAt?.toDate ? p.createdAt.toDate() : null;
      return d && d.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const paymentOutstanding = payments
    .filter(p => p.status === 'Pending' || p.status === 'Overdue')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const paymentPaid = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Unified sums
  const monthlyRevenue = invoiceMonthly + paymentMonthly;
  const quarterRevenue = invoiceQuarter + paymentQuarter;
  const annualRevenue = invoiceAnnual + paymentAnnual;
  const outstandingRevenue = invoiceOutstanding + paymentOutstanding;
  const paidRevenue = invoicePaid + paymentPaid;

  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Sync state to analytics/dashboard
  useEffect(() => {
    if (loading) return;

    const syncMetrics = async () => {
      await saveDashboardMetrics({
        totalLeads,
        totalClients: clients.length,
        activeClients,
        totalProjects: projects.length,
        runningProjects: activeProjects,
        totalServices,
        bookingsToday,
        bookingsThisMonth,
        totalBookings: bookings.length,
        revenueGenerated: paidRevenue,
        monthlyRevenue
      });
    };

    syncMetrics();
  }, [clients, projects, payments, invoices, bookings, contactForms, services, loading]);

  const statCards = [
    { name: 'Total Leads', value: totalLeads, icon: Users, desc: 'Aggregated website leads' },
    { name: 'Active Projects', value: activeProjects, icon: FolderKanban, desc: 'Integrations in builder pipeline' },
    { name: 'Monthly Revenue', value: formatCurrencyINR(monthlyRevenue), icon: DollarSign, desc: 'Revenue recorded this month' },
    { name: 'Quarter Revenue', value: formatCurrencyINR(quarterRevenue), icon: DollarSign, desc: 'Revenue recorded this quarter' },
    { name: 'Annual Revenue', value: formatCurrencyINR(annualRevenue), icon: DollarSign, desc: 'Revenue recorded this year' },
    { name: 'Outstanding Bills', value: formatCurrencyINR(outstandingRevenue), icon: AlertCircle, desc: 'Total outstanding invoices' },
    { name: 'Paid Invoices', value: formatCurrencyINR(paidRevenue), icon: CheckCircle, desc: 'Total client invoice payments' },
    { name: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, desc: 'Ratio of won accounts' },
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
          PERFORMANCE DASHBOARD
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          FOUNDER OVERVIEW
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Middle Row — System and Deployment Status */}
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

        {/* Deployment Status Panel */}
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
              v1.2.4-stable
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
              <span className="text-white">2026-06-13 18:42:05</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid — Recent Leads & Recent Client Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Recent Leads Panel */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>Recent Leads</span>
            </h3>
            <button
              onClick={() => navigate('/admin/leads')}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
            >
              <span>View Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/5 flex-grow">
            {leads.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No active leads captured yet.
              </div>
            ) : (
              leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{lead.name}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{lead.company} &bull; {lead.service}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-mono">
                      {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                    <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${
                      lead.status === 'New' ? 'border-amber-500/20 text-amber-400 bg-amber-950/10' :
                      lead.status === 'Won' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10' :
                      lead.status === 'Lost' ? 'border-rose-500/20 text-rose-400 bg-rose-950/10' :
                      'border-white/10 text-gray-300'
                    }`}>
                      {lead.status || 'New'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Client Activity Feed */}
        <div
          className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
          style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span>Recent Client Activity</span>
            </h3>
          </div>

          <div className="flex flex-col gap-5 flex-grow">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No recent workspace events.
              </div>
            ) : (
              activities.map((act) => {
                const ActIcon = act.icon;
                return (
                  <div key={act.id} className="flex gap-4 items-start">
                    <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-gray-400">
                      <ActIcon className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">
                        {act.title}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed font-light">
                        {act.desc}
                      </p>
                      <span className="text-[9px] text-gray-600 font-mono mt-1">
                        {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {act.time.toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
