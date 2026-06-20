import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../../firebase';

function formatCurrencyINR(amount) {
  if (amount === 0) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function AnalyticsDashboard() {
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [funnelData, setFunnelData] = useState({
    visitors: 0,
    leads: 0,
    audits: 0,
    proposals: 0,
    clients: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loadedCount = 0;
    const totalCollections = 8;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalCollections) setLoading(false);
    };

    const unsubFunnel = onSnapshot(
      doc(db, 'analytics', 'funnel'),
      (snap) => {
        if (snap.exists()) {
          setFunnelData(snap.data());
        }
        checkLoaded();
      },
      () => checkLoaded()
    );

    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), orderBy('createdAt', 'asc')),
      (snap) => { setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), orderBy('createdAt', 'desc')),
      (snap) => { setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), orderBy('createdAt', 'desc')),
      (snap) => { setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubClients = onSnapshot(
      query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
      (snap) => { setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
      (snap) => { setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubServices = onSnapshot(
      collection(db, 'services'),
      (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      (snap) => { setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded()
    );

    return () => {
      unsubLeads();
      unsubPayments();
      unsubProjects();
      unsubClients();
      unsubTasks();
      unsubServices();
      unsubBookings();
      unsubFunnel();
    };
  }, []);

  // ──────────────────────────────────────────────
  // 1. Service Demand Distribution (from leads)
  // ──────────────────────────────────────────────
  const defaultServices = [
    'AI Agents',
    'WhatsApp Automation',
    'Lead Generation',
    'Customer Support',
    'Business Automation',
    'Custom Systems'
  ];
  const serviceCounts = useMemo(() => {
    return defaultServices.reduce((acc, service) => {
      acc[service] = leads.filter(l => l.service === service).length;
      return acc;
    }, {});
  }, [leads]);
  const totalLeads = leads.length || 1;

  // ──────────────────────────────────────────────
  // 2. Industry Distribution (from leads)
  // ──────────────────────────────────────────────
  const industries = ['Healthcare', 'Real Estate', 'Education', 'Ecommerce', 'Agencies', 'Legal', 'Other'];
  const industryCounts = useMemo(() => {
    return industries.reduce((acc, industry) => {
      acc[industry] = leads.filter(l => {
        if (industry === 'Healthcare') return l.industry === 'Healthcare' || l.industry === 'clinics';
        if (industry === 'Legal') return l.industry === 'Legal' || l.industry === 'legal-firms';
        return l.industry === industry;
      }).length;
      return acc;
    }, {});
  }, [leads]);

  // ──────────────────────────────────────────────
  // 3. Monthly Lead Growth Timeline (Line Chart)
  // ──────────────────────────────────────────────
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  
  const { monthlyLabels, monthlyCounts, maxMonthlyCount, leadPoints, leadPolyline } = useMemo(() => {
    const leadMonthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      leadMonthlyMap[label] = 0;
    }
    leads.forEach(lead => {
      if (!lead.createdAt?.toDate) return;
      const date = lead.createdAt.toDate();
      const label = `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
      if (label in leadMonthlyMap) leadMonthlyMap[label]++;
    });
    const mLabels = Object.keys(leadMonthlyMap);
    const mCounts = Object.values(leadMonthlyMap);
    const mMax = Math.max(...mCounts, 1);

    const chartWidth = 500;
    const chartHeight = 160;
    const paddingX = 40;
    const paddingY = 20;

    const points = mCounts.map((count, idx) => {
      const x = paddingX + (idx * (chartWidth - 2 * paddingX) / Math.max(mCounts.length - 1, 1));
      const y = chartHeight - paddingY - (count * (chartHeight - 2 * paddingY) / mMax);
      return { x, y, count };
    });
    const poly = points.map(p => `${p.x},${p.y}`).join(' ');

    return {
      monthlyLabels: mLabels,
      monthlyCounts: mCounts,
      maxMonthlyCount: mMax,
      leadPoints: points,
      leadPolyline: poly
    };
  }, [leads]);

  // ──────────────────────────────────────────────
  // 4. Monthly Revenue (Bar Chart from payments)
  // ──────────────────────────────────────────────
  const { revenueLabels, revenueValues, maxRevenueVal } = useMemo(() => {
    const revenueMonthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      revenueMonthlyMap[label] = 0;
    }
    payments.forEach(p => {
      if (p.status !== 'Paid' || !p.createdAt?.toDate) return;
      const d = p.createdAt.toDate();
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      if (label in revenueMonthlyMap) revenueMonthlyMap[label] += (p.amount || 0);
    });
    const rLabels = Object.keys(revenueMonthlyMap);
    const rValues = Object.values(revenueMonthlyMap);
    const rMax = Math.max(...rValues, 1);
    return {
      revenueLabels: rLabels,
      revenueValues: rValues,
      maxRevenueVal: rMax
    };
  }, [payments]);

  // ──────────────────────────────────────────────
  // 5. Project Status Distribution
  // ──────────────────────────────────────────────
  const { projectStatusEntries, maxProjectStatusCount } = useMemo(() => {
    const projectStatusMap = {};
    projects.forEach(p => {
      const st = p.status || 'Active';
      projectStatusMap[st] = (projectStatusMap[st] || 0) + 1;
    });
    const entries = Object.entries(projectStatusMap).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length > 0 ? entries[0][1] : 1;
    return { projectStatusEntries: entries, maxProjectStatusCount: maxVal };
  }, [projects]);

  // ──────────────────────────────────────────────
  // 6. Top Services Ranking
  // ──────────────────────────────────────────────
  const { topServicesEntries, maxServiceRank } = useMemo(() => {
    const serviceRanking = {};
    leads.forEach(l => {
      const svc = l.service || 'Other';
      serviceRanking[svc] = (serviceRanking[svc] || 0) + 1;
    });
    const entries = Object.entries(serviceRanking).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxVal = entries.length > 0 ? entries[0][1] : 1;
    return { topServicesEntries: entries, maxServiceRank: maxVal };
  }, [leads]);

  // ──────────────────────────────────────────────
  // 7. Client Retention (Active vs Paused vs Completed)
  // ──────────────────────────────────────────────
  const { clientStatusEntries, maxClientStatus } = useMemo(() => {
    const clientStatusMap = {};
    clients.forEach(c => {
      const st = c.status || 'Active';
      clientStatusMap[st] = (clientStatusMap[st] || 0) + 1;
    });
    const entries = Object.entries(clientStatusMap).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length > 0 ? entries[0][1] : 1;
    return { clientStatusEntries: entries, maxClientStatus: maxVal };
  }, [clients]);

  // ──────────────────────────────────────────────
  // 8. Task Completion Rate
  // ──────────────────────────────────────────────
  const { totalTasks, doneTasks, taskCompletionRate, taskStatusEntries, maxTaskStatus } = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'Done').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    
    const taskStatusMap = {};
    tasks.forEach(t => {
      const st = t.status || 'To Do';
      taskStatusMap[st] = (taskStatusMap[st] || 0) + 1;
    });
    const entries = Object.entries(taskStatusMap).sort((a, b) => b[1] - a[1]);
    const maxVal = entries.length > 0 ? entries[0][1] : 1;
    
    return {
      totalTasks: total,
      doneTasks: done,
      taskCompletionRate: rate,
      taskStatusEntries: entries,
      maxTaskStatus: maxVal
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-10">
      
      {/* Title Header */}
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
          PERFORMANCE ANALYTICS
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          METRICS DASHBOARD
        </h1>
      </div>

      {/* Summary stat pills */}
      <div className="flex flex-wrap gap-4">
        <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-3" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Leads</span>
          <span className="text-lg font-semibold text-white font-mono">{leads.length}</span>
        </div>
        <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-3" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Clients</span>
          <span className="text-lg font-semibold text-white font-mono">{clients.length}</span>
        </div>
        <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-3" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Projects</span>
          <span className="text-lg font-semibold text-white font-mono">{projects.length}</span>
        </div>
        <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-3" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Bookings</span>
          <span className="text-lg font-semibold text-white font-mono">{bookings.length}</span>
        </div>
        <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-3" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Conversion Rate</span>
          <span className="text-lg font-semibold text-white font-mono">
            {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Won').length / leads.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Conversion Funnel Widget */}
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6 w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#5E0ED7]/5 rounded-full pointer-events-none blur-[100px] -z-10" />
        
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
            Client Acquisition Conversion Funnel
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-light">
            Real-time track of visitors converting down to leads, audits, proposals, clients, and paid revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          {[
            { label: 'Visitors', value: funnelData.visitors, sub: 'Baseline traffic', percent: 100, color: 'bg-white' },
            { 
              label: 'Leads', 
              value: funnelData.leads, 
              sub: 'Contact / Magnets', 
              percent: funnelData.visitors > 0 ? Math.round((funnelData.leads / funnelData.visitors) * 100) : 0,
              drop: funnelData.visitors > 0 ? Math.round((funnelData.leads / funnelData.visitors) * 100) : 0, 
              color: 'bg-white/80' 
            },
            { 
              label: 'AI Audits', 
              value: funnelData.audits, 
              sub: 'Systems Audited', 
              percent: funnelData.leads > 0 ? Math.round((funnelData.audits / funnelData.leads) * 100) : 0,
              drop: funnelData.visitors > 0 ? Math.round((funnelData.audits / funnelData.visitors) * 100) : 0, 
              color: 'bg-purple-400' 
            },
            { 
              label: 'Proposals', 
              value: funnelData.proposals, 
              sub: 'Contracts Out', 
              percent: funnelData.audits > 0 ? Math.round((funnelData.proposals / funnelData.audits) * 100) : 0,
              drop: funnelData.visitors > 0 ? Math.round((funnelData.proposals / funnelData.visitors) * 100) : 0, 
              color: 'bg-purple-600' 
            },
            { 
              label: 'Clients Won', 
              value: funnelData.clients, 
              sub: 'Active Accounts', 
              percent: funnelData.proposals > 0 ? Math.round((funnelData.clients / funnelData.proposals) * 100) : 0,
              drop: funnelData.visitors > 0 ? Math.round((funnelData.clients / funnelData.visitors) * 100) : 0, 
              color: 'bg-emerald-400' 
            }
          ].map((step, idx) => (
            <div key={step.label} className="p-4 rounded-xl border border-white/5 bg-black/40 flex flex-col justify-between gap-4 relative">
              <div>
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Step 0{idx + 1}</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider block mt-1">{step.label}</span>
                <span className="text-2xl font-bold text-white font-mono block mt-2">{step.value.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-light block mt-1">{step.sub}</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 uppercase">
                  <span>{idx === 0 ? 'Baseline' : 'Conv. Rate'}</span>
                  <span className={idx > 0 && step.percent > 0 ? 'text-emerald-400 font-bold' : ''}>{step.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`${step.color} h-full transition-all duration-1000`}
                    style={{ width: `${idx === 0 ? 100 : step.percent}%` }}
                  />
                </div>
                {idx > 0 && (
                  <span className="text-[8px] font-mono text-gray-600 block text-right uppercase">
                    {step.drop}% of traffic
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Chart 1: Leads by Service (Bar Chart) — Original */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              System Demand Distribution
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-light">
              Leads categorized by selected automation system type.
            </p>
          </div>

          <div className="flex-grow flex flex-col justify-end min-h-[200px] gap-4">
            {defaultServices.map((service) => {
              const count = serviceCounts[service] || 0;
              const percent = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
              return (
                <div key={service} className="flex items-center justify-between gap-4 text-xs">
                  <span className="w-32 text-gray-400 truncate">{service}</span>
                  <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden relative">
                    <div
                      className="bg-white h-full transition-all duration-1000"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-white font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Leads by Industry — Original */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Target Industries Focus
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-light">
              Lead distribution across various operational industries.
            </p>
          </div>

          <div className="flex-grow flex flex-col justify-end min-h-[200px] gap-4">
            {industries.map((industry) => {
              const count = industryCounts[industry] || 0;
              const percent = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
              return (
                <div key={industry} className="flex items-center justify-between gap-4 text-xs">
                  <span className="w-32 text-gray-400 truncate">{industry}</span>
                  <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden relative">
                    <div
                      className="bg-white/70 h-full transition-all duration-1000"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-white font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Chart 3: Monthly Lead Growth Timeline (Line Chart) — Original */}
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6 w-full">
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
            Lead Acquisition Growth
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-light">
            Inbound lead volume trends over the past six months.
          </p>
        </div>

        <div className="w-full overflow-hidden flex justify-center bg-black border border-white/5 rounded-xl p-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full max-w-2xl h-auto overflow-visible"
          >
            <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            <polyline
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              points={leadPolyline}
              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            />

            {leadPoints.map((p, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle cx={p.x} cy={p.y} r="4" fill="#000000" stroke="#FFFFFF" strokeWidth="2" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" className="opacity-100 select-none font-mono">
                  {p.count}
                </text>
              </g>
            ))}

            {leadPoints.map((p, idx) => (
              <text key={idx} x={p.x} y={chartHeight - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold" className="select-none uppercase">
                {monthlyLabels[idx]}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* ── NEW ANALYTICS SECTIONS ────────────────── */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

        {/* Revenue Analytics: Monthly Revenue Bar Chart */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Revenue Analytics
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-light">
              Monthly paid revenue over the last six months.
            </p>
          </div>

          <div className="flex-grow flex flex-col justify-end min-h-[200px] gap-3">
            {revenueLabels.map((label, idx) => {
              const val = revenueValues[idx];
              const pct = (val / maxRevenueVal) * 100;
              return (
                <div key={label} className="flex items-center justify-between gap-4 text-xs">
                  <span className="w-20 text-gray-400 font-mono">{label}</span>
                  <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden">
                    <div
                      className="bg-[#5E0ED7] h-full transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-mono text-white font-medium text-[11px]">{formatCurrencyINR(val)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Status Distribution */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Project Status Distribution
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-light">
              Count of projects by current status.
            </p>
          </div>

          <div className="flex-grow flex flex-col justify-end min-h-[200px] gap-4">
            {projectStatusEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No project data available.
              </div>
            ) : (
              projectStatusEntries.map(([status, count]) => {
                const pct = (count / maxProjectStatusCount) * 100;
                const barColor = status === 'Completed' ? 'bg-emerald-400' :
                  status === 'Active' || status === 'In Progress' ? 'bg-white' :
                  status === 'On Hold' ? 'bg-amber-400' :
                  status === 'Cancelled' ? 'bg-rose-400' : 'bg-gray-400';
                return (
                  <div key={status} className="flex items-center justify-between gap-4 text-xs">
                    <span className="w-32 text-gray-400 truncate">{status}</span>
                    <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-white font-medium">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Services Ranking */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Top Services Ranking
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-light">
              Most requested services ordered by lead volume.
            </p>
          </div>

          <div className="flex-grow flex flex-col justify-end min-h-[200px] gap-3">
            {topServicesEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No service data available.
              </div>
            ) : (
              topServicesEntries.map(([svc, count], idx) => {
                const pct = (count / maxServiceRank) * 100;
                return (
                  <div key={svc} className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2 w-36">
                      <span className="text-gray-600 font-mono text-[10px] w-4">#{idx + 1}</span>
                      <span className="text-gray-400 truncate">{svc}</span>
                    </div>
                    <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden">
                      <div
                        className="bg-white h-full transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-white font-medium">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Client Retention */}
        <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
              Client Retention
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-light">
              Client distribution by status: Active, Paused, Completed.
            </p>
          </div>

          <div className="flex-grow flex flex-col justify-end min-h-[200px] gap-4">
            {clientStatusEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 uppercase tracking-wider">
                No client data available.
              </div>
            ) : (
              clientStatusEntries.map(([status, count]) => {
                const pct = (count / maxClientStatus) * 100;
                const barColor = status === 'Active' ? 'bg-emerald-400' :
                  status === 'Paused' ? 'bg-amber-400' :
                  status === 'Completed' ? 'bg-white' : 'bg-gray-400';
                return (
                  <div key={status} className="flex items-center justify-between gap-4 text-xs">
                    <span className="w-32 text-gray-400 truncate">{status}</span>
                    <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-white font-medium">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Task Completion Rate */}
      <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-6 w-full">
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
            Task Completion Rate
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-light">
            Breakdown of tasks by status with overall completion percentage.
          </p>
        </div>

        <div className="flex items-center gap-8 flex-wrap">
          {/* Completion percentage indicator */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={taskCompletionRate >= 75 ? '#10B981' : taskCompletionRate >= 50 ? '#FFFFFF' : '#F59E0B'}
                  strokeWidth="8"
                  strokeDasharray={`${taskCompletionRate * 2.64} ${264 - taskCompletionRate * 2.64}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white font-mono">{taskCompletionRate}%</span>
              </div>
            </div>
            <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase">Completion</span>
          </div>

          {/* Task status bars */}
          <div className="flex-1 min-w-[200px] flex flex-col gap-3">
            {taskStatusEntries.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-500 uppercase tracking-wider">
                No task data available.
              </div>
            ) : (
              taskStatusEntries.map(([status, count]) => {
                const pct = (count / maxTaskStatus) * 100;
                const barColor = status === 'Done' ? 'bg-emerald-400' :
                  status === 'In Progress' ? 'bg-white' :
                  status === 'To Do' ? 'bg-amber-400' :
                  status === 'Blocked' ? 'bg-rose-400' : 'bg-gray-400';
                return (
                  <div key={status} className="flex items-center justify-between gap-4 text-xs">
                    <span className="w-28 text-gray-400 truncate">{status}</span>
                    <div className="flex-grow bg-white/5 border border-white/10 h-3 rounded-sm overflow-hidden">
                      <div
                        className={`${barColor} h-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-white font-medium">{count}</span>
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
