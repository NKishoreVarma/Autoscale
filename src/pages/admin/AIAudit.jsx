import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { generateWithGemini } from '../../utils/gemini';
import { Cpu, X, Plus, Trash2, ArrowUpRight, CheckCircle, Clock, Percent, ShieldAlert, Sparkles, Building, Globe, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';

const formatINR = (val) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
};

export default function AIAudit() {
  const { user: authUser, userRole } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  // Form State
  const [form, setForm] = useState({
    businessName: '',
    website: '',
    industry: 'Healthcare',
    challenges: ''
  });

  // Listen to audits in real-time
  useEffect(() => {
    const q = query(collection(db, 'auditReports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error reading audit reports:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.website.trim()) return;

    setGenerating(true);
    setGenProgress(15);

    const progressInterval = setInterval(() => {
      setGenProgress((p) => {
        if (p >= 90) return p;
        return p + Math.floor(Math.random() * 10) + 2;
      });
    }, 400);

    const prompt = `
      Perform a comprehensive Automation and Systems Audit for the following business:
      Business Name: ${form.businessName}
      Website: ${form.website}
      Industry: ${form.industry}
      Current Challenges: ${form.challenges}

      Analyze potential automation opportunities, lead capture gaps, response times, process improvement opportunities, and financial ROI estimation.

      You MUST respond with a valid JSON object ONLY. Do not wrap the JSON in code block tags like \`\`\`json or prepend/append any explanation text.
      The JSON schema MUST exactly match:
      {
        "automationOpportunities": [
          {
            "title": "Short Automation Opportunity Title",
            "desc": "Short description of the automation recommended",
            "impact": "Estimated percentage or metric impact (e.g. +35% Booking rates)"
          }
        ],
        "leadCaptureGaps": [
          "Identified gap string 1",
          "Identified gap string 2"
        ],
        "responseTimeAnalysis": {
          "current": "E.g. 4 Hours",
          "recommended": "E.g. Under 30 Seconds",
          "explanation": "Why cutting response time matters for this industry"
        },
        "processImprovements": [
          "Recommended operational improvement 1",
          "Recommended operational improvement 2"
        ],
        "roiEstimate": {
          "monthlySavings": 12000,
          "annualSavings": 144000,
          "revenueOpportunity": 75000
        }
      }
    `;

    try {
      setGenProgress(40);
      const jsonResult = await generateWithGemini(prompt, true);
      setGenProgress(85);

      const payload = {
        businessName: form.businessName.trim(),
        website: form.website.trim(),
        industry: form.industry,
        challenges: form.challenges.trim(),
        findings: {
          automationOpportunities: jsonResult.automationOpportunities || [],
          leadCaptureGaps: jsonResult.leadCaptureGaps || [],
          responseTimeAnalysis: jsonResult.responseTimeAnalysis || { current: "N/A", recommended: "Under 30s", explanation: "" },
          processImprovements: jsonResult.processImprovements || []
        },
        roiEstimate: jsonResult.roiEstimate || { monthlySavings: 0, annualSavings: 0, revenueOpportunity: 0 },
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin'
      };

      const docRef = await addDoc(collection(db, 'auditReports'), payload);
      setGenProgress(100);
      clearInterval(progressInterval);

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        type: 'new_lead',
        title: 'New AI Audit Generated',
        message: `Generated automation audit for "${form.businessName.trim()}". Projected Annual Savings: ${formatINR(payload.roiEstimate.annualSavings)}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      // Audit Log
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Generated AI Audit',
        'auditReports',
        docRef.id,
        `Generated automation audit for "${form.businessName.trim()}"`
      );

      // Reset form
      setForm({ businessName: '', website: '', industry: 'Healthcare', challenges: '' });
      setGenerating(false);
      setShowModal(false);
      
      // Auto select the new report
      setSelectedReport({ id: docRef.id, ...payload });

    } catch (err) {
      console.error("Error generating AI Audit:", err);
      alert("AI Audit generation failed. Please try again.");
      setGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleDeleteAudit = async (id, name) => {
    if (userRole !== 'super_admin') {
      alert("Clearance Denied: Only Super Admin can delete audit records.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the audit report for ${name}?`)) return;

    try {
      await deleteDoc(doc(db, 'auditReports', id));
      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Deleted AI Audit',
        'auditReports',
        id,
        `Deleted audit report for "${name}"`
      );
      if (selectedReport && selectedReport.id === id) {
        setSelectedReport(null);
      }
    } catch (err) {
      console.error("Error deleting report:", err);
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
    <div className="flex-grow flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">AI ANALYTICS ENGINE</span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">AUTOMATION AUDITS</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-[#5E0ED7]" />
          <span>New AI Audit</span>
        </button>
      </div>

      {/* Grid: Previous Audits List vs. Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Audits History */}
        <div className="col-span-1 lg:col-span-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col overflow-hidden max-h-[700px]">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">AUDIT INDEX ({reports.length})</span>
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto no-scrollbar">
            {reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest">No audits conducted.</div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`p-4 cursor-pointer transition ${selectedReport?.id === rep.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.01]'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-white uppercase truncate max-w-[160px]">{rep.businessName}</span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {rep.createdAt?.toDate ? rep.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-gray-400 font-light truncate max-w-[140px]">{rep.website}</span>
                    <span className="text-[10px] font-semibold text-emerald-400 font-mono">
                      {formatINR(rep.roiEstimate?.annualSavings)}/yr
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Audit Report Viewport */}
        <div className="col-span-1 lg:col-span-8">
          {selectedReport ? (
            <div className="p-6 md:p-8 rounded-xl border border-white/5 bg-white/[0.01] space-y-8 relative overflow-hidden">
              {/* Radial Purple Glow Background */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#5E0ED7]/5 rounded-full pointer-events-none blur-[80px]" />

              {/* View Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">REPORT FOR</span>
                    <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-white/10 text-white uppercase font-mono">{selectedReport.industry}</span>
                  </div>
                  <h2 className="text-2xl font-light text-white uppercase mt-1.5">{selectedReport.businessName}</h2>
                  <a href={`https://${selectedReport.website.replace(/^(https?:\/\/)?(www\.)?/, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 font-light mt-1 flex items-center gap-1 hover:text-white transition w-fit">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{selectedReport.website}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                {userRole === 'super_admin' && (
                  <button
                    onClick={() => handleDeleteAudit(selectedReport.id, selectedReport.businessName)}
                    className="p-2 border border-red-500/20 text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-lg transition"
                    title="Delete Audit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* ROI Potential cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-1">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Monthly Reclaimed</span>
                  <span className="text-xl font-bold text-white font-mono">{formatINR(selectedReport.roiEstimate?.monthlySavings)}</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-1">
                  <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Annual Savings</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{formatINR(selectedReport.roiEstimate?.annualSavings)}</span>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-[#5E0ED7]/5 flex flex-col gap-1">
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">Revenue Opportunity</span>
                  <span className="text-xl font-bold text-white font-mono">{formatINR(selectedReport.roiEstimate?.revenueOpportunity)}</span>
                </div>
              </div>

              {/* Findings Section */}
              <div className="space-y-6">
                {/* 1. Automation Opportunities */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#5E0ED7]" />
                    <span>Automation Opportunities</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedReport.findings?.automationOpportunities?.map((opp, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-black border border-white/5 flex flex-col justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-white">{opp.title}</span>
                          <p className="text-[11px] text-gray-400 mt-1 font-light leading-relaxed normal-case">{opp.desc}</p>
                        </div>
                        <span className="text-[9px] font-bold text-[#5E0ED7] uppercase tracking-wider">{opp.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Response Time Analysis */}
                {selectedReport.findings?.responseTimeAnalysis && (
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                    <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Response Time Analysis</span>
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Current</span>
                          <span className="text-sm text-red-400 font-mono mt-0.5">{selectedReport.findings.responseTimeAnalysis.current}</span>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest">Autoscale Target</span>
                          <span className="text-sm text-emerald-400 font-mono mt-0.5">{selectedReport.findings.responseTimeAnalysis.recommended}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 font-light leading-relaxed max-w-sm normal-case">{selectedReport.findings.responseTimeAnalysis.explanation}</p>
                    </div>
                  </div>
                )}

                {/* Gaps and Operational Improvements grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Capture Gaps */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Lead Capture Gaps</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-300 font-light leading-relaxed normal-case list-disc pl-4">
                      {selectedReport.findings?.leadCaptureGaps?.map((gap, idx) => (
                        <li key={idx}>{gap}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Process Improvements */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Process Improvements</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-300 font-light leading-relaxed normal-case list-decimal pl-4">
                      {selectedReport.findings?.processImprovements?.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col items-center justify-center text-center">
              <Cpu className="w-12 h-12 text-gray-600 animate-pulse mb-3" />
              <span className="text-sm font-semibold tracking-wider text-white uppercase">Audit Details Panel</span>
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">Select any report from the index directory on the left or generate a new AI audit to identify automation opportunities.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Audit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !generating && setShowModal(false)} />
          
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 z-10 shadow-2xl mx-4 overflow-hidden">
            {/* Generating Overlay Progress */}
            {generating && (
              <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center p-6 text-center">
                <Sparkles className="w-10 h-10 text-[#5E0ED7] animate-spin-slow mb-4" />
                <span className="text-xs font-bold tracking-widest text-white uppercase">Analyzing Business Systems...</span>
                <span className="text-[10px] font-mono text-gray-500 mt-1 uppercase">Running Gemini Flash & Core ROI Models</span>
                
                <div className="w-48 h-1 bg-white/5 border border-white/10 rounded-full mt-6 overflow-hidden relative">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${genProgress}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-400 mt-2">{genProgress}%</span>
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">NEW RUN</span>
                <h2 className="text-xl font-normal text-white uppercase mt-0.5">GENERATE AI AUDIT</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAudit} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={form.businessName}
                  onChange={(e) => setForm(f => ({ ...f, businessName: e.target.value }))}
                  placeholder="E.g. Vintage Apparel India"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition normal-case"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Website URL</label>
                  <input
                    type="text"
                    required
                    value={form.website}
                    onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="E.g. vintage-threads.in"
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition normal-case"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Sector / Industry</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Education">Education</option>
                    <option value="Ecommerce">Ecommerce</option>
                    <option value="Agencies">Agencies</option>
                    <option value="Legal">Legal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Current Bottlenecks & Challenges</label>
                <textarea
                  value={form.challenges}
                  onChange={(e) => setForm(f => ({ ...f, challenges: e.target.value }))}
                  rows={4}
                  placeholder="Describe leaks, manual tasks, response delays, or other pain points..."
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition normal-case resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold tracking-wider text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-5 py-2.5 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#5E0ED7]" />
                  <span>Generate Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
