import { triggerToast } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { generateWithGemini } from '../../utils/gemini';
import { FileText, X, Plus, Trash2, ArrowUpRight, Sparkles, Printer, DollarSign, Calendar, User, Briefcase, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import { logActivity } from '../../utils/activityLogger';
import { emailService } from '../../utils/emailService';
import { whatsappService } from '../../utils/whatsappService';
import { pdfGenerator } from '../../utils/pdfGenerator';

const formatINR = (val) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
};

const STATUS_COLORS = {
  Draft: 'border-gray-500/20 text-gray-400 bg-gray-950/10',
  Sent: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Viewed: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
  Negotiation: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Accepted: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Won: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
  Rejected: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
};

export default function ProposalGenerator() {
  const location = useLocation();
  const { user: authUser, userRole } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  // Form State
  const [form, setForm] = useState({
    leadId: '',
    service: 'AI Agents',
    price: ''
  });

  // Handle pre-filling if redirected from AI Audit details
  useEffect(() => {
    if (location.state && location.state.auditId) {
      const targetLeadId = location.state.leadId || '';
      setForm({
        leadId: targetLeadId,
        service: location.state.service || 'Custom Systems',
        price: location.state.price || ''
      });

      if (!targetLeadId && location.state.company && activeLeads.length > 0) {
        const found = activeLeads.find(l => l.company.toLowerCase() === location.state.company.toLowerCase());
        if (found) {
          setForm(f => ({ ...f, leadId: found.id }));
        }
      }

      setShowModal(true);
    }
  }, [location.state, activeLeads]);

  // Listen to leads and proposals
  useEffect(() => {
    const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProposals = onSnapshot(
      query(collection(db, 'proposals'), orderBy('createdAt', 'desc')),
      (snap) => {
        setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    return () => {
      unsubLeads();
      unsubProposals();
    };
  }, []);

  // Consolidate leads
  const activeLeads = React.useMemo(() => {
    return leads.map(l => ({
      id: l.id,
      name: l.name || '',
      company: l.company || 'Private',
      industry: l.industry || 'Other',
      challenges: l.message || '',
      email: l.email || '',
      service: l.service || 'Custom Systems'
    }));
  }, [leads]);

  const handleGenerateProposal = async (e) => {
    e.preventDefault();
    if (!form.leadId || !form.price) return;

    const selectedLead = activeLeads.find(l => l.id === form.leadId);
    if (!selectedLead) return;

    setGenerating(true);
    setGenProgress(20);

    const progressInterval = setInterval(() => {
      setGenProgress((p) => (p >= 90 ? p : p + 5));
    }, 300);

    const prompt = `
      Draft a highly professional operational and commercial proposal for the following client:
      Client Name: ${selectedLead.name}
      Company: ${selectedLead.company}
      Industry: ${selectedLead.industry}
      Identified Challenges: ${selectedLead.challenges}
      Proposed Service Integration: ${form.service}
      Proposed Pricing: ${form.price} INR

      The proposal should be clear, action-oriented, and formatted under structured JSON. Do not include markdown wraps or explanations.
      The JSON schema MUST match:
      {
        "problem": "Detailed problem analysis based on the challenges",
        "solution": "Detailed automation solution detailing how Autoscale will resolve this",
        "timeline": [
          { "phase": "E.g. Setup & Configuration", "duration": "E.g. 3 Days" },
          { "phase": "E.g. Flow Test", "duration": "E.g. 2 Days" }
        ],
        "pricing": [
          { "item": "Core System Integration License", "cost": ${Math.floor(Number(form.price) * 0.6)} },
          { "item": "Testing, Deployment & Verification", "cost": ${Math.floor(Number(form.price) * 0.4)} }
        ],
        "expectedRoi": "Quantifiable description of return on investment (e.g. saves 15 hours/week)"
      }
    `;

    try {
      setGenProgress(50);
      const jsonResult = await generateWithGemini(prompt, true);
      setGenProgress(85);

      const payload = {
        leadId: selectedLead.id,
        leadName: selectedLead.name,
        company: selectedLead.company,
        email: selectedLead.email || '',
        service: form.service,
        price: Number(form.price),
        status: 'Draft',
        problem: jsonResult.problem || 'Incomplete system capture analysis.',
        solution: jsonResult.solution || 'Deploy custom automated workflows.',
        timeline: jsonResult.timeline || [],
        pricing: jsonResult.pricing || [],
        expectedRoi: jsonResult.expectedRoi || 'Saves developer work hours.',
        createdAt: serverTimestamp(),
        createdBy: authUser?.email || 'admin'
      };

      const docRef = await addDoc(collection(db, 'proposals'), payload);
      setGenProgress(100);
      clearInterval(progressInterval);

      // Auto generate and upload Proposal PDF
      try {
        const pdfUrl = await pdfGenerator.generateAndUploadProposal(docRef.id, payload);
        if (pdfUrl) {
          await updateDoc(doc(db, 'proposals', docRef.id), { pdfUrl });
          payload.pdfUrl = pdfUrl;
        }
      } catch (pdfErr) {
        console.error('[ProposalGenerator] Proposal PDF generation failed:', pdfErr);
      }

      // Log activity
      await logActivity(
        'proposal_sent',
        'Proposal Generated',
        `Bespoke proposal generated for ${selectedLead.name} (${form.service}) valued at ${formatINR(form.price)}`
      );

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        type: 'project_created',
        title: 'New Proposal Drafted',
        message: `Bespoke proposal generated for ${selectedLead.name} (${form.service}) valued at ${formatINR(form.price)}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      // Update lead status to Proposal Sent in leads collection
      await updateDoc(doc(db, 'leads', selectedLead.id), { status: 'Proposal Sent' });

      // Audit Log
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Created Proposal',
        'proposals',
        docRef.id,
        `Drafted proposal for "${selectedLead.name}" at ${formatINR(form.price)}`
      );

      // Reset
      setForm({ leadId: '', service: 'AI Agents', price: '' });
      setGenerating(false);
      setShowModal(false);
      setSelectedProposal({ id: docRef.id, ...payload });

    } catch (err) {
      console.error("Error generating proposal:", err);
      triggerToast('AI Proposal generation failed. Please try again.', 'error');
      setGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleStatusChange = async (proposalId, newStatus) => {
    try {
      await updateDoc(doc(db, 'proposals', proposalId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update selectedProposal locally if it's the active one
      if (selectedProposal && selectedProposal.id === proposalId) {
        setSelectedProposal(prev => ({ ...prev, status: newStatus }));
      }

      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated Proposal Status',
        'proposals',
        proposalId,
        `Updated status of proposal for "${selectedProposal?.leadName || proposalId}" to "${newStatus}"`
      );

      // If Sent, trigger proposal notifications to lead
      if (newStatus === 'Sent' && selectedProposal) {
        const leadId = selectedProposal.leadId;
        const targetLead = leads.find(l => l.id === leadId);
        const email = selectedProposal.email || (targetLead && targetLead.email) || '';
        const phone = (targetLead && targetLead.phone) || '';
        const leadObj = {
          name: selectedProposal.leadName,
          company: selectedProposal.company,
          email: email,
          phone: phone
        };
        try {
          await emailService.sendProposalEmail(selectedProposal, leadObj);
          if (phone) {
            await whatsappService.sendProposalSent(selectedProposal, phone);
          }
        } catch (sentErr) {
          console.error('[ProposalGenerator] Error sending proposal notifications:', sentErr);
        }
      }

      // If Accepted or Won, automatically convert the lead to a client and create project/tasks/invoice
      if (newStatus === 'Accepted' || newStatus === 'Won') {
        const leadId = selectedProposal.leadId;
        const targetLead = leads.find(l => l.id === leadId);

        const companyName = selectedProposal.company || (targetLead && targetLead.company) || 'Private Client';
        const ownerName = selectedProposal.leadName || (targetLead && targetLead.name) || 'Anonymous';
        const email = selectedProposal.email || (targetLead && targetLead.email) || '';
        const phone = (targetLead && targetLead.phone) || '';
        const industry = (targetLead && targetLead.industry) || 'Other';
        const service = selectedProposal.service || (targetLead && targetLead.service) || 'Custom System';
        const contractValue = Number(selectedProposal.price) || (targetLead && Number(targetLead.contractValue)) || 0;

        // 1. Add Client document
        const clientDoc = await addDoc(collection(db, 'clients'), {
          leadId: leadId || '',
          company: companyName,
          companyName: companyName,
          contactPerson: ownerName,
          ownerName: ownerName,
          email: email,
          phone: phone,
          industry: industry,
          website: '',
          contractValue: contractValue,
          status: 'Active',
          createdAt: serverTimestamp(),
          createdBy: authUser?.email || 'admin'
        });

        await logActivity(
          'client_won',
          'Client Won',
          `${ownerName} from ${companyName} accepted proposal and converted to active client`
        );

        const projectName = `${companyName} Automation Platform`;

        // 2. Add Project document
        const projectDoc = await addDoc(collection(db, 'projects'), {
          projectName,
          clientId: clientDoc.id,
          clientName: companyName,
          type: service,
          projectType: service,
          description: (targetLead && targetLead.message) || 'System requested via accepted proposal.',
          priority: 'Medium',
          status: 'Planning',
          progress: 0,
          budget: contractValue,
          projectValue: contractValue,
          deadline: '',
          assignedTeam: '',
          createdAt: serverTimestamp()
        });

        await logActivity(
          'project_created',
          'Project Created',
          `Project "${projectName}" workspace initiated for client "${companyName}"`
        );

        // 3. Create three default starter Tasks
        const defaultTasks = [
          "Client Onboarding & Project Kickoff",
          "System Requirements & Specifications Review",
          "Architecture Design & Blueprint Signoff"
        ];
        
        const deadlineDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        for (const title of defaultTasks) {
          await addDoc(collection(db, 'tasks'), {
            title,
            description: `Automatic onboarding checklist item: ${title}`,
            assignedTo: '',
            assignee: '',
            project: projectName,
            projectId: projectDoc.id,
            deadline: deadlineDate,
            dueDate: deadlineDate,
            priority: 'Medium',
            status: 'Todo',
            createdAt: serverTimestamp(),
            createdBy: authUser?.email || 'admin'
          });
        }

        // 4. Create a draft invoice
        const invoiceNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        await addDoc(collection(db, 'invoices'), {
          invoiceNumber: invoiceNum,
          clientId: clientDoc.id,
          clientName: companyName,
          projectId: projectDoc.id,
          projectTitle: projectName,
          amount: contractValue,
          status: 'Draft',
          dueDate: deadlineDate,
          issueDate: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp()
        });

        // 5. Update Lead status to Won in backing collection
        if (leadId) {
          await updateDoc(doc(db, 'leads', leadId), {
            status: 'Won',
            updatedAt: serverTimestamp()
          });
        }

        // 6. Create real-time notification
        await addDoc(collection(db, 'notifications'), {
          type: 'lead_converted',
          title: 'Lead Converted to Client (Proposal Accepted)',
          message: `${ownerName} from ${companyName} has accepted their proposal and is now an active client.`,
          read: false,
          createdAt: serverTimestamp()
        });

        // 7. Write timeline log
        await addDoc(collection(db, 'projectTimelines'), {
          projectId: projectDoc.id,
          stage: 'Planning',
          description: `Project workspace initiated for ${companyName} via accepted proposal.`,
          timestamp: serverTimestamp()
        });

        // 8. Trigger real onboarding email & WhatsApp alerts
        const clientObj = {
          id: clientDoc.id,
          email: email,
          contactPerson: ownerName,
          ownerName: ownerName,
          company: companyName,
          companyName: companyName,
          phone: phone
        };
        const projectObj = {
          id: projectDoc.id,
          projectName
        };

        try {
          await emailService.sendOnboardingEmail(clientObj, projectObj);
          await whatsappService.sendClientOnboarding(clientObj, projectObj);
          // Auto-generate and upload Client Summary PDF
          const summaryUrl = await pdfGenerator.generateAndUploadSummary(clientDoc.id, clientObj, projectObj);
          if (summaryUrl) {
            await updateDoc(doc(db, 'clients', clientDoc.id), { summaryUrl });
          }
        } catch (onbErr) {
          console.error('[ProposalGenerator] Onboarding notifications failed:', onbErr);
        }

        await logAuditAction(
          authUser?.email || 'admin@autoscale.systems',
          userRole || 'admin',
          'Proposal Auto-Onboarded',
          'clients',
          clientDoc.id,
          `Proposal Accepted: Auto-created client "${ownerName}" (${companyName}) and initiated project workspace`
        );

        triggerToast('Proposal Accepted! Client onboarding workflow triggered and project workspace initiated.', 'success');
      }
    } catch (err) {
      console.error('Error changing proposal status:', err);
    }
  };

  const handleDeleteProposal = async (id, name) => {
    if (userRole !== 'super_admin') {
      triggerToast('Access Denied: Only Super Admin can delete proposal documents.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete proposal for ${name}?`)) return;

    try {
      await deleteDoc(doc(db, 'proposals', id));
      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Deleted Proposal',
        'proposals',
        id,
        `Deleted proposal for "${name}"`
      );
      if (selectedProposal && selectedProposal.id === id) {
        setSelectedProposal(null);
      }
    } catch (err) {
      console.error("Error deleting proposal:", err);
    }
  };

  const handlePrint = () => {
    // Print logic utilizing A4 media styles
    const printContent = document.getElementById("proposal-print-area");
    const originalContent = document.body.innerHTML;

    // Direct page innerHTML override is the most reliable cross-browser printable container
    document.body.innerHTML = `
      <html>
        <head>
          <title>Autoscale Proposal - ${selectedProposal?.leadName}</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #000; background: #fff; padding: 40px; }
            .print-h1 { font-size: 28px; border-bottom: 2px solid #000; padding-bottom: 10px; text-transform: uppercase; margin-bottom: 30px; }
            .print-section { margin-bottom: 24px; }
            .print-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; color: #555; }
            .print-body { font-size: 13px; line-height: 1.6; margin-bottom: 20px; }
            .print-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .print-table th, .print-table td { border: 1px solid #ddd; padding: 10px; font-size: 12px; text-align: left; }
            .print-table th { background: #f5f5f5; }
            .footer-info { margin-top: 50px; font-size: 11px; text-align: center; border-top: 1px solid #eee; padding-top: 15px; color: #777; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;

    window.print();
    window.location.reload(); // Reload to restore React state cleanly
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
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">COMMERCIAL CONTRACTS</span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">PROPOSAL GENERATOR</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Proposal</span>
        </button>
      </div>

      {/* Grid List vs Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Proposals List */}
        <div className="col-span-1 lg:col-span-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col overflow-hidden max-h-[700px]">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">PROPOSAL ARCHIVE ({proposals.length})</span>
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto no-scrollbar">
            {proposals.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-600 uppercase tracking-widest">No proposals generated.</div>
            ) : (
              proposals.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setSelectedProposal(prop)}
                  className={`p-4 cursor-pointer transition ${selectedProposal?.id === prop.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.01]'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-white uppercase truncate max-w-[160px]">{prop.leadName}</span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {prop.createdAt?.toDate ? prop.createdAt.toDate().toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-gray-400 font-light truncate max-w-[120px]">{prop.service}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded border uppercase ${STATUS_COLORS[prop.status || 'Draft']}`}>
                        {prop.status || 'Draft'}
                      </span>
                      <span className="text-[10px] font-semibold text-white font-mono">
                        {formatINR(prop.price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Proposal Details & Print Area */}
        <div className="col-span-1 lg:col-span-8">
          {selectedProposal ? (
            <div className="space-y-6">
              {/* Output view container */}
              <div className="p-6 md:p-8 rounded-xl border border-white/5 bg-white/[0.01] space-y-8 relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-white/5 pb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">PROPOSAL VALUE: {formatINR(selectedProposal.price)}</span>
                      <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${STATUS_COLORS[selectedProposal.status || 'Draft']}`}>
                        {selectedProposal.status || 'Draft'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-light text-white uppercase mt-1.5">{selectedProposal.leadName} &mdash; {selectedProposal.service}</h2>
                    <span className="text-xs text-gray-400 font-light mt-1 block">Company: {selectedProposal.company} &bull; Email: {selectedProposal.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedProposal.status || 'Draft'}
                      onChange={(e) => handleStatusChange(selectedProposal.id, e.target.value)}
                      className="bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white transition"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Viewed">Viewed</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Won">Won</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <button
                      onClick={handlePrint}
                      className="p-2 border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                      title="Print Proposal"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print / PDF</span>
                    </button>
                    {userRole === 'super_admin' && (
                      <button
                        onClick={() => handleDeleteProposal(selectedProposal.id, selectedProposal.leadName)}
                        className="p-2 border border-red-500/20 text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-lg transition"
                        title="Delete Proposal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Print area wrapper */}
                <div id="proposal-print-area" className="space-y-6 normal-case text-gray-300 text-sm leading-relaxed">
                  <div className="print-h1 hidden">AUTOSCALE AUTOMATION PROPOSAL</div>
                  
                  {/* Problem */}
                  <div className="print-section">
                    <div className="print-title text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. Problem Statement</div>
                    <div className="print-body bg-black border border-white/5 p-4 rounded-lg leading-relaxed font-light">{selectedProposal.problem}</div>
                  </div>

                  {/* Solution */}
                  <div className="print-section">
                    <div className="print-title text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. Proposed Solution</div>
                    <div className="print-body bg-black border border-white/5 p-4 rounded-lg leading-relaxed font-light">{selectedProposal.solution}</div>
                  </div>

                  {/* Timeline & Pricing Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-section">
                    <div>
                      <div className="print-title text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3. Timeline & Stages</div>
                      <div className="overflow-hidden border border-white/5 rounded-lg">
                        <table className="w-full text-left print-table border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase border-b border-white/5">
                              <th className="p-3">Phase</th>
                              <th className="p-3 text-right">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-light">
                            {selectedProposal.timeline?.map((t, idx) => (
                              <tr key={idx}>
                                <td className="p-3">{t.phase}</td>
                                <td className="p-3 text-right font-mono">{t.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <div className="print-title text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">4. Commercial Breakdown</div>
                      <div className="overflow-hidden border border-white/5 rounded-lg">
                        <table className="w-full text-left print-table border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] text-[10px] font-bold text-gray-400 uppercase border-b border-white/5">
                              <th className="p-3">Deliverable Item</th>
                              <th className="p-3 text-right">Cost (INR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-light font-mono">
                            {selectedProposal.pricing?.map((p, idx) => (
                              <tr key={idx}>
                                <td className="p-3 font-sans normal-case">{p.item}</td>
                                <td className="p-3 text-right">{formatINR(p.cost)}</td>
                              </tr>
                            ))}
                            <tr className="bg-white/[0.02] font-semibold border-t border-white/10">
                              <td className="p-3 font-sans">Total Proposal Value</td>
                              <td className="p-3 text-right text-emerald-400">{formatINR(selectedProposal.price)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Expected ROI */}
                  <div className="print-section">
                    <div className="print-title text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">5. Projected Return on Investment (ROI)</div>
                    <div className="print-body bg-black border border-white/5 p-4 rounded-lg leading-relaxed font-light">{selectedProposal.expectedRoi}</div>
                  </div>

                  <div className="footer-info hidden">
                    AUTOSCALE AUTOMATION SYSTEMS &bull; CONFIDENTIAL DOCUMENT
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-gray-600 animate-pulse mb-3" />
              <span className="text-sm font-semibold tracking-wider text-white uppercase">Proposal Workspace</span>
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">Select any proposal from the index archive directory on the left or generate a new AI proposal to print/export PDF.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Proposal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !generating && setShowModal(false)} />
          
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 z-10 shadow-2xl mx-4 overflow-hidden">
            {/* Generating Overlay Progress */}
            {generating && (
              <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center p-6 text-center">
                <Sparkles className="w-10 h-10 text-[#5E0ED7] animate-spin-slow mb-4" />
                <span className="text-xs font-bold tracking-widest text-white uppercase">Drafting Bespoke Proposal...</span>
                <span className="text-[10px] font-mono text-gray-500 mt-1 uppercase">Generating problem, timeline models, and commercial allocations</span>
                
                <div className="w-48 h-1 bg-white/5 border border-white/10 rounded-full mt-6 overflow-hidden relative">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${genProgress}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-400 mt-2">{genProgress}%</span>
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">NEW ENTRY</span>
                <h2 className="text-xl font-normal text-white uppercase mt-0.5">CREATE PROPOSAL</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerateProposal} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Select Lead</label>
                {activeLeads.length === 0 ? (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>No leads available in directory. Create a lead first.</span>
                  </div>
                ) : (
                  <select
                    value={form.leadId}
                    required
                    onChange={(e) => setForm(f => ({ ...f, leadId: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="">Select Target Client / Lead</option>
                    {activeLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Service category</label>
                  <select
                    value={form.service}
                    onChange={(e) => setForm(f => ({ ...f, service: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="AI Agents">AI Agents</option>
                    <option value="WhatsApp Automation">WhatsApp Automation</option>
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Business Automation">Business Automation</option>
                    <option value="Custom Systems">Custom Systems</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-1">Total Pricing (INR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      required
                      value={form.price}
                      onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="E.g. 75000"
                      className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition font-mono"
                    />
                  </div>
                </div>
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
                  disabled={activeLeads.length === 0}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-5 py-2.5 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#5E0ED7]" />
                  <span>Generate Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
