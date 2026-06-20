import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { generateWithGemini } from '../utils/gemini';
import { pdfGenerator } from '../utils/pdfGenerator';
import { emailService } from '../utils/emailService';
import { whatsappService } from '../utils/whatsappService';
import { calendarService } from '../utils/calendarService';
import { 
  Sparkles, Clock, Zap, AlertTriangle, CheckCircle, Download, Calendar, 
  ArrowUpRight, Building, Globe, Send, User, Phone, MessageSquare 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerToast } from '../utils/errorHandler';

const formatINR = (val) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
};

export default function FreeAudit() {
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    website: '',
    industry: 'Healthcare',
    challenges: ''
  });

  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [report, setReport] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');

  // Booking states
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRunAudit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.businessName.trim() || !form.email.trim() || !form.website.trim()) {
      triggerToast("Please fill in all required fields.", "warning");
      return;
    }

    setGenerating(true);
    setGenProgress(10);

    const progressInterval = setInterval(() => {
      setGenProgress((p) => {
        if (p >= 90) return p;
        return p + Math.floor(Math.random() * 8) + 2;
      });
    }, 450);

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
      setGenProgress(35);
      const jsonResult = await generateWithGemini(prompt, true);
      setGenProgress(75);

      // 1. Create Lead in Firestore
      const leadPayload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.businessName.trim(),
        industry: form.industry,
        service: 'Custom Systems',
        message: `AI Audit request challenges: ${form.challenges.trim()}`,
        leadSource: 'AI Audit',
        source: 'AI Audit',
        status: 'New',
        createdAt: serverTimestamp()
      };
      const leadDocRef = await addDoc(collection(db, 'leads'), leadPayload);
      const leadId = leadDocRef.id;

      // 2. Create Audit Document
      const auditPayload = {
        leadId,
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
        createdBy: 'website_visitor'
      };

      const auditDocRef = await addDoc(collection(db, 'auditReports'), auditPayload);
      setGenProgress(85);

      // 3. Generate Audit PDF and upload to Firebase Storage
      let pdfDownloadUrl = '';
      try {
        pdfDownloadUrl = await pdfGenerator.generateAndUploadAudit(auditDocRef.id, auditPayload);
        if (pdfDownloadUrl) {
          await updateDoc(doc(db, 'auditReports', auditDocRef.id), { pdfUrl: pdfDownloadUrl });
          auditPayload.pdfUrl = pdfDownloadUrl;
          setPdfUrl(pdfDownloadUrl);
        }
      } catch (pdfErr) {
        console.error('[FreeAudit] Audit PDF generation failed:', pdfErr);
      }

      // 4. Send Transactional Day 0 Email
      try {
        await emailService.sendAuditDeliveryEmail({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.businessName.trim()
        }, {
          roiEstimate: auditPayload.roiEstimate,
          pdfUrl: pdfDownloadUrl
        });

        // Trigger Twilio WhatsApp Lead Created Alert
        if (form.phone.trim()) {
          await whatsappService.sendLeadCreated({
            name: form.name.trim(),
            company: form.businessName.trim(),
            service: 'AI Audit Services',
            phone: form.phone.trim()
          });
        }
      } catch (commsErr) {
        console.error('[FreeAudit] Email / WhatsApp triggers failed:', commsErr);
      }

      // 5. Notify Dashboard & Activity Logs
      await addDoc(collection(db, 'notifications'), {
        type: 'new_lead',
        title: 'New Public AI Audit Generated',
        message: `${form.name.trim()} from ${form.businessName.trim()} generated a Free AI Audit. Annual Savings: ${formatINR(auditPayload.roiEstimate.annualSavings)}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activity_logs'), {
        action: 'AI Audit Generated',
        entity: 'lead',
        entityId: leadId,
        performedBy: 'website_visitor',
        details: `Public visitor generated AI Audit for "${form.businessName.trim()}". Savings forecast: ${formatINR(auditPayload.roiEstimate.annualSavings)}/yr`,
        createdAt: serverTimestamp()
      });

      setGenProgress(100);
      clearInterval(progressInterval);
      setReport({ id: auditDocRef.id, leadId, ...auditPayload });
      setCompleted(true);
      setGenerating(false);

    } catch (err) {
      console.error("AI Audit generation failure:", err);
      triggerToast("AI Audit generation failed. Please check your credentials and try again.", "error");
      setGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleBookSession = async (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime || !report) return;

    setBookingLoading(true);

    try {
      const scheduledDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
      const endDateTime = new Date(scheduledDateTime.getTime() + 30 * 60 * 1000); // 30 mins

      // 1. Google Calendar Integration Slot (Exchange token and save call invite)
      let calendarLink = '';
      try {
        const calData = {
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.businessName.trim(),
          service: 'Audit Review Session',
          message: `Discussion of automation opportunities in audit report ${report.id}`
        };
        calendarLink = await calendarService.createEvent(calData);
      } catch (calErr) {
        console.error('[FreeAudit] Google Calendar booking failed:', calErr);
      }

      // If calendar link is empty, we write a fallback meetings document
      await addDoc(collection(db, 'meetings'), {
        title: `Audit Review: ${form.name.trim()} (${form.businessName.trim()})`,
        date: bookingDate,
        time: bookingTime,
        link: calendarLink || '',
        leadId: report.leadId,
        createdAt: serverTimestamp()
      });

      // Update lead status to Scheduled in backing collection
      await updateDoc(doc(db, 'leads', report.leadId), { 
        status: 'Scheduled',
        preferredDate: `${bookingDate} ${bookingTime}`
      });

      // Activity logs
      await addDoc(collection(db, 'activity_logs'), {
        action: 'Booking Created',
        entity: 'lead',
        entityId: report.leadId,
        performedBy: 'website_visitor',
        details: `Visitor scheduled Audit Review session for ${bookingDate} at ${bookingTime}`,
        createdAt: serverTimestamp()
      });

      setBookingSuccess(true);
      setBookingLoading(false);
    } catch (err) {
       console.error("Booking error:", err);
       triggerToast("Failed to schedule meeting. Please try again.", "error");
       setBookingLoading(false);
     }
  };

  return (
    <div className="pt-28 pb-24 px-6 md:px-12 lg:px-16 relative z-10 max-w-6xl mx-auto flex flex-col items-center">
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5E0ED7]/5 rounded-full blur-[100px] pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* Form Stage */}
        {!generating && !completed && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl text-center space-y-10"
          >
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase block mb-2 font-mono">
                AI SYSTEMS ENGINE
              </span>
              <h1 className="text-3xl md:text-5xl font-light text-white uppercase tracking-tight leading-tight">
                FREE AI GROWTH AUDIT
              </h1>
              <p className="text-sm text-gray-400 mt-4 max-w-lg mx-auto font-light leading-relaxed">
                Provide operational bottlenecks and details about your company. Our AI model will analyze your systems, pinpoint leakage gaps, and estimate your annual savings.
              </p>
            </div>

            <form onSubmit={handleRunAudit} className="text-left p-6 md:p-8 rounded-[24px] border border-white/10 bg-white/[0.01] backdrop-blur-md space-y-5 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><User className="w-3 h-3 text-[#5E0ED7]" /> Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="E.g. Kishore Varma"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><Building className="w-3 h-3 text-[#5E0ED7]" /> Business Name *</label>
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={form.businessName}
                    onChange={handleChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="E.g. AutoScale Logistics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><Send className="w-3 h-3 text-[#5E0ED7]" /> Business Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><Phone className="w-3 h-3 text-[#5E0ED7]" /> Mobile Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 font-mono"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><Globe className="w-3 h-3 text-[#5E0ED7]" /> Website URL *</label>
                  <input
                    type="text"
                    name="website"
                    required
                    value={form.website}
                    onChange={handleChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case font-mono"
                    placeholder="E.g. autoscale.systems"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block">Industry Sector</label>
                  <select
                    name="industry"
                    value={form.industry}
                    onChange={handleChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200"
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><MessageSquare className="w-3 h-3 text-[#5E0ED7]" /> Current Challenges & Operational Bottlenecks</label>
                <textarea
                  name="challenges"
                  rows={4}
                  value={form.challenges}
                  onChange={handleChange}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case resize-none"
                  placeholder="E.g. Delayed lead response, manual scheduling overhead, cart dropoffs, invoice tracking delays..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-white text-black text-xs font-semibold tracking-widest uppercase hover:bg-gray-100 transition duration-200 rounded-xl flex items-center justify-center gap-2 mt-4 cursor-target"
              >
                <Sparkles className="w-4 h-4 text-[#5E0ED7] animate-pulse" />
                <span>Initialize AI Audit</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* Generating Overlay Stage */}
        {generating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md text-center py-20 flex flex-col items-center gap-6"
          >
            <Sparkles className="w-12 h-12 text-[#5E0ED7] animate-spin-slow" />
            <div>
              <h2 className="text-xl font-normal text-white uppercase tracking-wider">Analyzing Operations</h2>
              <p className="text-xs text-gray-500 mt-2 font-mono uppercase">Invoking Gemini cognitive systems models</p>
            </div>
            
            <div className="w-64 h-1 bg-white/5 border border-white/10 rounded-full overflow-hidden relative mt-4">
              <div className="h-full bg-white transition-all duration-300" style={{ width: `${genProgress}%` }} />
            </div>
            <span className="text-[10px] font-mono text-gray-400">{genProgress}%</span>
          </motion.div>
        )}

        {/* Completed Stage */}
        {completed && report && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-10"
          >
            {/* Success Banner */}
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-400 uppercase font-mono">AUDIT COMPLETE</span>
                <h1 className="text-2xl md:text-4xl font-light text-white uppercase mt-1">GROWTH AUDIT: {report.businessName}</h1>
              </div>
            </div>

            {/* Funnel Metrics ROI estimates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col gap-1.5" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
                <span className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">Projected Monthly Saved</span>
                <span className="text-2xl font-bold text-white font-mono">{formatINR(report.roiEstimate?.monthlySavings)}</span>
              </div>
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col gap-1.5" style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}>
                <span className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">Projected Annual Savings</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">{formatINR(report.roiEstimate?.annualSavings)}</span>
              </div>
              <div className="p-6 rounded-2xl border border-[#5E0ED7]/15 bg-[#5E0ED7]/5 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-300 tracking-widest uppercase">Total Revenue Opportunity</span>
                <span className="text-2xl font-bold text-white font-mono">{formatINR(report.roiEstimate?.revenueOpportunity)}</span>
              </div>
            </div>

            {/* Findings Display */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Opportunities list (Col-span 8) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 1. Automation Opportunities */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                    <Zap className="w-4 h-4 text-[#5E0ED7]" />
                    <span>Automation Pipelines Recommended</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.findings?.automationOpportunities?.map((opp, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-black border border-white/5 flex flex-col justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-white uppercase">{opp.title}</span>
                          <p className="text-[11px] text-gray-400 mt-2 font-light leading-relaxed normal-case">{opp.desc}</p>
                        </div>
                        <span className="text-[9px] font-bold text-[#5E0ED7] uppercase tracking-wider font-mono">{opp.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Response Time Target */}
                {report.findings?.responseTimeAnalysis && (
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                    <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Response Speed Target</span>
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-6 justify-between sm:items-center">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Current Latency</span>
                          <span className="text-base text-rose-400 font-mono mt-1">{report.findings.responseTimeAnalysis.current}</span>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Target Latency</span>
                          <span className="text-base text-emerald-400 font-mono mt-1">{report.findings.responseTimeAnalysis.recommended}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 font-light leading-relaxed max-w-sm normal-case">{report.findings.responseTimeAnalysis.explanation}</p>
                    </div>
                  </div>
                )}

                {/* Gaps and Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Gaps */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Identified Gaps</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-400 font-light leading-relaxed normal-case list-disc pl-4">
                      {report.findings?.leadCaptureGaps?.map((gap, idx) => (
                        <li key={idx}>{gap}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Process improvements */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Process Improvements</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-gray-400 font-light leading-relaxed normal-case list-decimal pl-4">
                      {report.findings?.processImprovements?.map((imp, idx) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* PDF download */}
                {pdfUrl && (
                  <a 
                    href={pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs font-semibold uppercase tracking-wider text-white px-6 py-3 rounded-lg transition"
                  >
                    <Download className="w-4 h-4 text-[#5E0ED7]" />
                    <span>Download PDF Report</span>
                  </a>
                )}

              </div>

              {/* Booking Slot Call panel (Col-span 4) */}
              <div className="lg:col-span-4 p-6 rounded-2xl border border-white/10 bg-white/[0.01] backdrop-blur-md space-y-6">
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5 font-mono">
                    <Calendar className="w-4 h-4 text-[#5E0ED7]" />
                    <span>Book Strategy Call</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-2 font-light leading-normal normal-case">
                    Schedule a 45-minute consultation with a systems architect to map out a deployment blueprint.
                  </p>
                </div>

                {bookingSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col items-center text-center gap-2">
                    <CheckCircle className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-wider">Call Booking Confirmed!</span>
                    <p className="font-light normal-case mt-1">
                      Calendar event generated successfully. Confirmation details and a Google Calendar invitation have been dispatched to your inbox.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleBookSession} className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Select Date</label>
                      <input 
                        type="date" 
                        required
                        value={bookingDate}
                        onChange={e => setBookingDate(e.target.value)}
                        className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Select Time Slot</label>
                      <input 
                        type="time" 
                        required
                        value={bookingTime}
                        onChange={e => setBookingTime(e.target.value)}
                        className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading || !bookingDate || !bookingTime}
                      className="w-full py-3 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-gray-200 transition duration-200 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {bookingLoading ? 'Scheduling...' : 'Confirm Call Slot'}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
