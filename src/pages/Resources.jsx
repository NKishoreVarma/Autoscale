import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { emailService } from '../utils/emailService';
import { jsPDF } from 'jspdf';
import { 
  FileText, Download, X, CheckCircle, ArrowRight, ShieldCheck, 
  Sparkles, Mail, User, Info, Building 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerToast } from '../utils/errorHandler';

const LEAD_MAGNETS = [
  {
    id: 'checklist',
    title: 'AI Automation Checklist',
    description: 'A 25-point operational checklist to audit manual bottlenecks, identify automated routing gaps, and evaluate team work-hour leaks.',
    format: 'PDF Guide & Sheet',
    pages: '6 Pages',
    buttonText: 'Download Checklist'
  },
  {
    id: 'blueprint',
    title: 'Lead Generation Blueprint',
    description: 'Bespoke playbook mapping out how to construct qualification flows, automated follow-up sequences, and CRM ingestion pipelines.',
    format: 'Operational Blueprint',
    pages: '12 Pages',
    buttonText: 'Download Playbook'
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Automation Guide',
    description: 'Technical walkthrough detailing Twilio template setups, double-tick routing logic, and client chat-agent response integrations.',
    format: 'Developer Manual',
    pages: '8 Pages',
    buttonText: 'Download Guide'
  },
  {
    id: 'sales',
    title: 'Sales Automation Guide',
    description: 'A guide on how to integrate automated proposal generators, invoice triggers, and recurring statement notifications.',
    format: 'Executive Summary',
    pages: '5 Pages',
    buttonText: 'Download Guide'
  }
];

export default function Resources() {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const openDownloadModal = (asset) => {
    setSelectedAsset(asset);
    setForm({ name: '', email: '', company: '' });
    setSuccess(false);
    setShowModal(true);
  };

  const handleDownloadSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !selectedAsset) return;

    setLoading(true);

    try {
      const name = form.name.trim();
      const email = form.email.trim();
      const company = form.company.trim() || 'General Public';

      // 1. Create Lead in leads collection
      const leadPayload = {
        name,
        email,
        company,
        industry: 'Other',
        service: 'Custom Systems',
        message: `Lead Magnet requested: ${selectedAsset.title}`,
        leadSource: `Lead Magnet - ${selectedAsset.title}`,
        source: `Lead Magnet - ${selectedAsset.title}`,
        status: 'New',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'leads'), leadPayload);

      // 2. Add log entry in lead_magnet_downloads
      const downloadPayload = {
        name,
        email,
        company,
        resourceId: selectedAsset.id,
        resourceTitle: selectedAsset.title,
        downloadedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'lead_magnet_downloads'), downloadPayload);

      // 3. Send Delivery Email via Resend
      try {
        await emailService.sendLeadMagnetEmail(email, name, selectedAsset.title);
      } catch (emailErr) {
        console.error('[Resources] Email dispatch failed:', emailErr);
      }

      // 4. Generate on-the-fly PDF Guide and trigger browser download
      try {
        const doc = new jsPDF();
        doc.setFont("Helvetica");
        
        // Header
        doc.setFillColor(18, 2, 36);
        doc.rect(0, 0, 210, 50, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("AUTOSCALE SYSTEMS", 14, 25);
        doc.setFontSize(10);
        doc.text("RECLAIMING REVENUE VIA SYSTEMS & AI AUTOMATION", 14, 36);
        
        // Document Meta
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("Helvetica", "bold");
        doc.text(selectedAsset.title.toUpperCase(), 14, 70);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Prepared for: ${name} (${company})`, 14, 78);
        doc.text(`Date of Download: ${new Date().toLocaleDateString('en-IN')}`, 14, 84);
        
        // Content details
        doc.setFont("Helvetica", "bold");
        doc.text("EXECUTIVE HIGHLIGHTS & INSIGHTS:", 14, 100);
        doc.setFont("Helvetica", "normal");
        
        const contentLines = doc.splitTextToSize(
          `Thank you for downloading the ${selectedAsset.title}. This guide details core automation strategies to recover leakage, cut response latency, and offload staff work-hours.\n\n` + 
          `Key Takeaways:\n` +
          `• 1. Cut latency from 4 hours to under 30 seconds using WhatsApp bots.\n` +
          `• 2. Capture CRM data automatically on lead ingestion points.\n` +
          `• 3. Trigger onboarding and project workspaces immediately upon proposal wins.\n` +
          `• 4. Automate invoicing and payment reconciliations.`,
          182
        );
        doc.text(contentLines, 14, 108);
        
        // Save
        const fileName = `${selectedAsset.title.replace(/\s+/g, '_')}_AutoGen.pdf`;
        doc.save(fileName);
      } catch (pdfErr) {
        console.error('[Resources] Client-side PDF generation failed:', pdfErr);
      }

      // 5. Notify Dashboard & Activity Logs
      await addDoc(collection(db, 'notifications'), {
        type: 'new_lead',
        title: 'New Lead Magnet Downloaded',
        message: `${name} downloaded the "${selectedAsset.title}". Email: ${email}`,
        read: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activity_logs'), {
        action: 'Lead Magnet Downloaded',
        entity: 'lead',
        performedBy: 'website_visitor',
        details: `Visitor "${name}" (${company}) downloaded resource "${selectedAsset.title}"`,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setLoading(false);
      
    } catch (err) {
      console.error("Resource download failure:", err);
      triggerToast("Failed to register download. Please try again.", "error");
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-24 px-6 md:px-12 lg:px-16 relative z-10 max-w-6xl mx-auto flex flex-col items-center">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#5E0ED7]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
        <span className="text-[10px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase block font-mono">
          OPERATIONAL RESOURCES
        </span>
        <h1 className="text-3xl md:text-5xl font-light text-white uppercase tracking-tight">
          SYSTEMS PLAYBOOKS
        </h1>
        <p className="text-sm text-gray-400 font-light leading-relaxed max-w-lg mx-auto">
          Download our expert playbooks, technical blueprints, and checklists to identify bottlenecks and optimize your business workflows.
        </p>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {LEAD_MAGNETS.map((asset) => (
          <div 
            key={asset.id}
            className="p-8 rounded-[24px] border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] hover:border-[#5E0ED7]/15 transition duration-300 flex flex-col justify-between gap-6 relative overflow-hidden group"
            style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
          >
            {/* Ambient card glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#5E0ED7]/5 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-[#5E0ED7]/5 rounded-xl border border-[#5E0ED7]/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#5E0ED7]" />
                </div>
                <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                  {asset.pages} &bull; {asset.format}
                </span>
              </div>
              <h3 className="text-xl font-normal text-white uppercase tracking-tight pt-1">
                {asset.title}
              </h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed normal-case">
                {asset.description}
              </p>
            </div>

            <button
              onClick={() => openDownloadModal(asset)}
              className="w-full sm:w-fit px-6 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-black transition duration-200 rounded-xl flex items-center justify-center gap-2 cursor-target"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{asset.buttonText}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Download Modal overlay */}
      <AnimatePresence>
        {showModal && selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-black p-6 md:p-8 z-10 shadow-2xl overflow-hidden"
            >
              {/* Close button */}
              <button 
                onClick={() => !loading && setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              {success ? (
                <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <h3 className="text-lg font-bold tracking-wider uppercase text-white">Download Initialized</h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-light normal-case max-w-xs">
                    Your customized PDF copy of the <strong>{selectedAsset.title}</strong> has been generated and downloaded. We have also dispatched a backup link to your inbox.
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="mt-6 px-6 py-2.5 bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition rounded-lg"
                  >
                    CLOSE WINDOW
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-bold text-[#5E0ED7] uppercase tracking-widest font-mono">STEP 1 OF 1</span>
                    <h3 className="text-lg font-normal text-white uppercase mt-1">ACCESS RESOURCE GUIDE</h3>
                    <p className="text-xs text-gray-400 font-light mt-1.5 normal-case">
                      Enter your details below to instantly download the <strong>{selectedAsset.title}</strong>.
                    </p>
                  </div>

                  <form onSubmit={handleDownloadSubmit} className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><User className="w-3 h-3 text-[#5E0ED7]" /> Name *</label>
                      <input 
                        type="text" 
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition normal-case"
                        placeholder="Kishore Varma"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><Mail className="w-3 h-3 text-[#5E0ED7]" /> Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition normal-case"
                        placeholder="name@company.com"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1"><Building className="w-3 h-3 text-[#5E0ED7]" /> Company Name</label>
                      <input 
                        type="text" 
                        value={form.company}
                        onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                        className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition normal-case"
                        placeholder="E.g. AutoScale Logistics"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !form.name || !form.email}
                      className="w-full py-3.5 bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-gray-100 transition duration-200 rounded-xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-target"
                    >
                      {loading ? 'Processing...' : 'Request Download'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                  
                  <div className="flex gap-2 items-start text-[10px] text-gray-500 border-t border-white/5 pt-4">
                    <ShieldCheck className="w-4 h-4 text-[#5E0ED7] flex-shrink-0" />
                    <span className="leading-normal normal-case">Your data is stored securely in accordance with our Privacy Policy. We do not sell or lease address indices.</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
