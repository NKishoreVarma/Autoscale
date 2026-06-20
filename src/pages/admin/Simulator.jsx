import { triggerToast } from '../../utils/errorHandler';
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { emailService } from '../../utils/emailService';
import { pdfGenerator } from '../../utils/pdfGenerator';
import {
Play, Users, Cpu, Mail, Calendar, FileText, CheckCircle, CreditCard, 
  Terminal, RotateCcw, AlertTriangle, ShieldCheck 
} from 'lucide-react';

export default function Simulator() {
  const [logs, setLogs] = useState([]);
  const [simLead, setSimLead] = useState(null);
  const [simProposal, setSimProposal] = useState(null);
  const [simClient, setSimClient] = useState(null);
  const [simInvoice, setSimInvoice] = useState(null);

  const logMessage = (text, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timeStr, text, type }, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
    setSimLead(null);
    setSimProposal(null);
    setSimClient(null);
    setSimInvoice(null);
    logMessage('Simulator sandbox resets. Ready for operations.');
  };

  // 1. Visitor simulation
  const simulateVisitor = async () => {
    logMessage('Simulating external visitor session pulse...');
    try {
      const docRef = doc(db, 'analytics', 'funnel');
      await updateDoc(docRef, { visitors: increment(1) });
      logMessage('Visitor session recorded in analytics/funnel.');
    } catch (err) {
      logMessage(`Visitor simulation failed: ${err.message}`, 'error');
    }
  };

  // 2. Audit request simulation
  const runAuditSimulation = async () => {
    logMessage('Initializing AI Audit request for "Dr. Amit Patel" at "Patel Dental Clinics"...');
    
    try {
      // 1. Create Lead in leads
      const leadPayload = {
        name: 'Dr. Amit Patel',
        email: 'amit.patel@gmail.com',
        phone: '+919876543210',
        company: 'Patel Dental Clinics',
        industry: 'Healthcare',
        service: 'Custom Systems',
        message: 'Automate dentist appointment booking slots, billing cycles, and followups',
        leadSource: 'AI Audit',
        source: 'AI Audit',
        status: 'New',
        createdAt: serverTimestamp()
      };
      
      const leadDoc = await addDoc(collection(db, 'leads'), leadPayload);
      logMessage(`Lead created successfully in Firestore. ID: ${leadDoc.id}`);

      // 2. Create Audit report with mock findings (fast for sandbox testing)
      const auditPayload = {
        leadId: leadDoc.id,
        businessName: 'Patel Dental Clinics',
        website: 'patelclinics.com',
        industry: 'Healthcare',
        challenges: 'Automate dentist appointment booking slots, billing cycles, and followups',
        findings: {
          automationOpportunities: [
            { title: 'WhatsApp Patient Reminders', desc: 'Auto-confirm bookings via WhatsApp API integration', impact: '+35% Booking rates' }
          ],
          leadCaptureGaps: ['No chat widget', 'Delay in patient email response times'],
          responseTimeAnalysis: { current: '4 Hours', recommended: 'Under 30 Seconds', explanation: 'Dental patients switch to competitors if callbacks are delayed.' },
          processImprovements: ['Deploy booking scheduler', 'Centralize notifications dashboard']
        },
        roiEstimate: { monthlySavings: 15000, annualSavings: 180000, revenueOpportunity: 90000 },
        createdAt: serverTimestamp(),
        createdBy: 'Simulator Sandbox'
      };

      const auditDoc = await addDoc(collection(db, 'auditReports'), auditPayload);
      logMessage(`Audit report documented in Firestore. ID: ${auditDoc.id}`);

      // Increment audit count in analytics
      await updateDoc(doc(db, 'analytics', 'funnel'), { audits: increment(1) });
      logMessage('Funnel analytics audit count incremented.');

      // 3. Generate and upload PDF report in background
      try {
        const pdfUrl = await pdfGenerator.generateAndUploadAudit(auditDoc.id, auditPayload);
        if (pdfUrl) {
          await updateDoc(doc(db, 'auditReports', auditDoc.id), { pdfUrl });
          logMessage(`Audit PDF generated and uploaded: ${pdfUrl}`);
        }
      } catch (pdfErr) {
        logMessage(`Audit PDF generation skipped: ${pdfErr.message}`, 'warning');
      }

      // 4. Send Email (Day 0)
      try {
        await emailService.sendAuditDeliveryEmail({
          name: 'Dr. Amit Patel',
          email: 'amit.patel@gmail.com',
          company: 'Patel Dental Clinics'
        }, {
          roiEstimate: auditPayload.roiEstimate,
          pdfUrl: ''
        });
        logMessage('Day 0 Audit Delivery email dispatched to lead.');
      } catch (emailErr) {
        logMessage(`Email delivery skipped: ${emailErr.message}`, 'warning');
      }

      setSimLead({ id: leadDoc.id, ...leadPayload });
    } catch (err) {
      logMessage(`Audit simulation failed: ${err.message}`, 'error');
    }
  };

  // 3. Campaign followups simulation
  const runCampaignSimulation = async () => {
    if (!simLead) {
      triggerToast('Please run Audit Simulation first to establish a lead record.', 'warning');
      return;
    }
    const currentStage = simLead.campaignStage || 0;
    let nextStage = 2;
    if (currentStage === 2) nextStage = 5;
    else if (currentStage === 5) nextStage = 7;
    else if (currentStage === 7) {
      logMessage('All campaign stages already triggered for this lead.', 'warning');
      return;
    }

    logMessage(`Advancing campaign to Day ${nextStage} for ${simLead.name}...`);
    try {
      if (nextStage === 2) {
        await emailService.sendFollowUpDay2(simLead);
        logMessage('Day 2 Case Study follow-up email dispatched.');
      } else if (nextStage === 5) {
        const audit = { roiEstimate: { monthlySavings: 15000, annualSavings: 180000 } };
        await emailService.sendFollowUpDay5(simLead, audit);
        logMessage('Day 5 ROI Breakdown follow-up email dispatched.');
      } else if (nextStage === 7) {
        await emailService.sendFollowUpDay7(simLead);
        logMessage('Day 7 Booking Call invite follow-up email dispatched.');
      }

      await updateDoc(doc(db, 'leads', simLead.id), { campaignStage: nextStage });
      setSimLead(prev => ({ ...prev, campaignStage: nextStage }));
      logMessage(`Lead campaignStage status updated to Day ${nextStage} in Firestore.`);
    } catch (err) {
      logMessage(`Campaign advance failed: ${err.message}`, 'error');
    }
  };

  // 4. Book strategy call
  const bookCallSimulation = async () => {
    if (!simLead) {
      triggerToast('Please run Audit Simulation first.', 'warning');
      return;
    }
    logMessage(`Scheduling strategy booking call for ${simLead.name}...`);
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = '14:30';
      await addDoc(collection(db, 'meetings'), {
        title: `Strategy Session: ${simLead.name} (${simLead.company})`,
        date: today,
        time,
        link: 'https://meet.google.com/mock-meeting-id',
        leadId: simLead.id,
        type: 'strategy',
        createdAt: serverTimestamp()
      });
      logMessage(`Meeting logged in meetings collection. Date: ${today} Time: ${time}.`);

      await updateDoc(doc(db, 'leads', simLead.id), { status: 'Scheduled' });
      logMessage('Lead status updated to "Scheduled" in Firestore.');
    } catch (err) {
      logMessage(`Booking scheduling failed: ${err.message}`, 'error');
    }
  };

  // 5. Generate proposal
  const generateProposalSimulation = async () => {
    if (!simLead) {
      triggerToast('Please run Audit Simulation first.', 'warning');
      return;
    }
    logMessage(`Compiling custom integration proposal for "${simLead.company}"...`);
    try {
      const price = 75000;
      const proposalPayload = {
        leadId: simLead.id,
        leadName: simLead.name,
        company: simLead.company,
        email: simLead.email,
        service: 'WhatsApp Automation',
        price,
        status: 'Draft',
        problem: 'Client suffers from patient booking latency and manual followup overhead.',
        solution: 'Deploy WhatsApp AI Scheduler to automate appointment slots and confirm billing cycle milestones.',
        timeline: [{ phase: 'API Setup', duration: '2 Days' }, { phase: 'AI Agent Training', duration: '3 Days' }],
        pricing: [{ item: 'Integration License', cost: 45000 }, { item: 'Setup & Support', cost: 30000 }],
        expectedRoi: 'Saves 15 hours/week, captures additional patient bookings.',
        createdAt: serverTimestamp(),
        createdBy: 'Simulator Sandbox'
      };

      const propDoc = await addDoc(collection(db, 'proposals'), proposalPayload);
      logMessage(`Proposal draft logged in proposals: ${propDoc.id}`);

      // Increment proposal count in analytics
      await updateDoc(doc(db, 'analytics', 'funnel'), { proposals: increment(1) });
      logMessage('Funnel analytics proposals count incremented.');

      await updateDoc(doc(db, 'leads', simLead.id), { status: 'Proposal Sent' });
      logMessage('Lead status updated to "Proposal Sent".');

      setSimProposal({ id: propDoc.id, ...proposalPayload });
    } catch (err) {
      logMessage(`Proposal compile failed: ${err.message}`, 'error');
    }
  };

  // 6. Onboard client
  const markWonSimulation = async () => {
    if (!simProposal) {
      triggerToast('Please generate proposal first.', 'warning');
      return;
    }
    logMessage(`Simulating client approval on proposal contract ${simProposal.id}...`);
    try {
      // 1. Update proposal status
      await updateDoc(doc(db, 'proposals', simProposal.id), { status: 'Won' });
      logMessage('Proposal status updated to "Won".');

      // 2. Onboard Client profile
      const clientDoc = await addDoc(collection(db, 'clients'), {
        leadId: simProposal.leadId,
        company: simProposal.company,
        companyName: simProposal.company,
        contactPerson: simProposal.leadName,
        ownerName: simProposal.leadName,
        email: simProposal.email,
        phone: '+919876543210',
        industry: 'Healthcare',
        contractValue: simProposal.price,
        status: 'Active',
        createdAt: serverTimestamp()
      });
      logMessage(`Active Client profile created in Firestore: ${clientDoc.id}`);

      // 3. Initiate project workspace
      const projectName = `${simProposal.company} Automation Project`;
      const projectDoc = await addDoc(collection(db, 'projects'), {
        projectName,
        clientId: clientDoc.id,
        clientName: simProposal.company,
        projectType: simProposal.service,
        description: 'Systems integration requested via proposal accept.',
        priority: 'High',
        status: 'Planning',
        progress: 10,
        budget: simProposal.price,
        createdAt: serverTimestamp()
      });
      logMessage(`Project workspace initiated in projects: ${projectDoc.id}`);

      // 4. Create starter tasks
      await addDoc(collection(db, 'tasks'), {
        title: 'Project Kickoff & Client Onboarding',
        description: 'Automatic onboarding checklist item: project setup.',
        project: projectName,
        projectId: projectDoc.id,
        status: 'Todo',
        priority: 'High',
        createdAt: serverTimestamp()
      });
      logMessage('Onboarding checklist task created in tasks collection.');

      // 5. Generate Statement Invoice
      const invoiceNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const invoiceDoc = await addDoc(collection(db, 'invoices'), {
        invoiceNumber: invoiceNum,
        clientId: clientDoc.id,
        clientName: simProposal.company,
        projectId: projectDoc.id,
        projectTitle: projectName,
        amount: simProposal.price,
        status: 'Draft',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      logMessage(`Milestone statement invoice created: ${invoiceNum}`);

      // Increment clients won count in analytics
      await updateDoc(doc(db, 'analytics', 'funnel'), { clients: increment(1) });
      logMessage('Funnel analytics clients count incremented.');

      await updateDoc(doc(db, 'leads', simProposal.leadId), { status: 'Won' });
      logMessage('Backing lead status marked "Won".');

      setSimInvoice({ id: invoiceDoc.id, invoiceNumber: invoiceNum, amount: simProposal.price });
      setSimClient({ id: clientDoc.id, email: simProposal.email, contactPerson: simProposal.leadName, company: simProposal.company });
    } catch (err) {
      logMessage(`Client onboarding workflow failed: ${err.message}`, 'error');
    }
  };

  // 7. Pay Invoice
  const payInvoiceSimulation = async () => {
    if (!simInvoice) {
      triggerToast('Please run Onboarding (Mark Won) first to issue a draft invoice.', 'warning');
      return;
    }
    logMessage(`Collecting payment for statement invoice ${simInvoice.invoiceNumber}...`);
    try {
      // 1. Settle invoice status to Paid
      await updateDoc(doc(db, 'invoices', simInvoice.id), { status: 'Paid' });
      logMessage('Invoice status set to "Paid".');

      // 2. Log payment receipt in payments collection
      await addDoc(collection(db, 'payments'), {
        invoiceId: simInvoice.id,
        clientId: simClient.id,
        clientName: simClient.company,
        amount: simInvoice.amount,
        status: 'Paid',
        method: 'Bank Transfer',
        createdAt: serverTimestamp()
      });
      logMessage(`Payment receipt entry logged. Amount: INR ${simInvoice.amount.toLocaleString('en-IN')}`);

      // 3. Increment revenue in analytics funnel metrics
      await updateDoc(doc(db, 'analytics', 'funnel'), { revenue: increment(simInvoice.amount) });
      logMessage(`Funnel analytics revenue increased by INR ${simInvoice.amount.toLocaleString('en-IN')}.`);

      // Dispatch invoice receipt email
      try {
        await emailService.sendInvoiceEmail({
          invoiceNumber: simInvoice.invoiceNumber,
          amount: simInvoice.amount,
          dueDate: 'Paid & Settled',
          projectTitle: `${simClient.company} Automation Project`
        }, simClient);
        logMessage('Invoice payment receipt emailed to client.');
      } catch (emailErr) {
        logMessage(`Email receipt skipped: ${emailErr.message}`, 'warning');
      }

      setSimInvoice(null); // Settle active simulation invoice
    } catch (err) {
      logMessage(`Payment collection failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">QUALITY ASSURANCE WORKSPACE</span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">LAUNCH SIMULATOR</h1>
        </div>
        <button
          onClick={clearLogs}
          className="border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-semibold tracking-wider rounded-lg uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-gray-400" />
          <span>Reset Simulator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left side controls: Phase steps (Col-span 5) */}
        <div className="col-span-1 lg:col-span-5 rounded-xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Acquisition Funnel Control</span>
          </div>

          <div className="space-y-4">
            {/* Step 1: Visitor */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 01</span>
                <span className="text-xs font-bold text-white uppercase block">Simulate Visitor</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Increments website traffic session counts.</p>
              </div>
              <button
                onClick={simulateVisitor}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center"
                title="Trigger Visitor Pulse"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* Step 2: Audit */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 02</span>
                <span className="text-xs font-bold text-white uppercase block">Request Free Audit</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Creates a lead, generates report, delivers Day 0 email.</p>
              </div>
              <button
                onClick={runAuditSimulation}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center"
                title="Run Audit Request"
              >
                <Users className="w-4 h-4" />
              </button>
            </div>

            {/* Step 3: Campaigns */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 03</span>
                <span className="text-xs font-bold text-white uppercase block">Advance Campaigns</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Advances timeline email sequencing stages (Day 2 to 5 to 7).</p>

              </div>
              <button
                onClick={runCampaignSimulation}
                disabled={!simLead}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center disabled:opacity-30"
                title="Step Follow-up Sequence"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>

            {/* Step 4: Book Strategy Call */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 04</span>
                <span className="text-xs font-bold text-white uppercase block">Book Strategy Call</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Schedules calendar invite and changes lead status.</p>
              </div>
              <button
                onClick={bookCallSimulation}
                disabled={!simLead}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center disabled:opacity-30"
                title="Trigger Calendar Booking"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Step 5: Proposal */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 05</span>
                <span className="text-xs font-bold text-white uppercase block">Generate Proposal</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Drafts custom PDF proposal and sends email.</p>
              </div>
              <button
                onClick={generateProposalSimulation}
                disabled={!simLead}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center disabled:opacity-30"
                title="Generate AI Proposal"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            {/* Step 6: Mark Won */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 06</span>
                <span className="text-xs font-bold text-white uppercase block">Mark Won & Onboard</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Triggers client profiles, project workspace, tasks checklist.</p>
              </div>
              <button
                onClick={markWonSimulation}
                disabled={!simProposal}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center disabled:opacity-30"
                title="Convert to Client"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Step 7: Pay Invoice */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/40">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Phase 07</span>
                <span className="text-xs font-bold text-white uppercase block">Collect Payment</span>
                <p className="text-[10px] text-gray-400 leading-normal normal-case">Paid invoice settlements. Increments revenue in analytics.</p>
              </div>
              <button
                onClick={payInvoiceSimulation}
                disabled={!simInvoice}
                className="p-3 bg-white text-black hover:bg-gray-100 rounded-xl transition flex items-center justify-center disabled:opacity-30"
                title="Settle Milestone Billings"
              >
                <CreditCard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right side outputs: Terminal log (Col-span 7) */}
        <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
          {/* Active entities panel */}
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Terminal className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Active Sandbox Entities</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-black border border-white/5">
                <span className="text-[9px] text-gray-500 block uppercase">Lead Candidate</span>
                <span className="text-white truncate block mt-1">{simLead ? `${simLead.name} (${simLead.company})` : 'N/A'}</span>
                {simLead && <span className="text-[9px] text-purple-400 block mt-1 uppercase">Campaign: Day {simLead.campaignStage || 0}</span>}
              </div>
              <div className="p-3 rounded-lg bg-black border border-white/5">
                <span className="text-[9px] text-gray-500 block uppercase">Proposal Contract</span>
                <span className="text-white truncate block mt-1">{simProposal ? `${simProposal.service} (INR ${simProposal.price?.toLocaleString('en-IN')})` : 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-black border border-white/5">
                <span className="text-[9px] text-gray-500 block uppercase">Project Workspace</span>
                <span className="text-white truncate block mt-1">{simClient ? `${simClient.company} Project` : 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-black border border-white/5">
                <span className="text-[9px] text-gray-500 block uppercase">Milestone Invoice</span>
                <span className="text-white truncate block mt-1">{simInvoice ? `${simInvoice.invoiceNumber} (INR ${simInvoice.amount?.toLocaleString('en-IN')})` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Terminal log output */}
          <div className="rounded-xl border border-white/5 bg-black overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#5E0ED7]" />
                <span>Verification Terminal Log</span>
              </span>
              <span className="text-[9px] text-gray-500 font-mono">STDOUT / READY</span>
            </div>

            <div className="p-6 font-mono text-[11px] overflow-y-auto flex-grow flex flex-col gap-2.5">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic select-none">
                  // Trigger simulator actions on the left sidebar to run conversion lifecycle trials...
                </div>
              ) : (
                logs.map((log, idx) => {
                  const logColor = log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-amber-400' :
                    log.type === 'success' ? 'text-emerald-400' : 'text-gray-300';
                  
                  return (
                    <div key={idx} className="flex gap-3 items-start select-text">
                      <span className="text-gray-600 shrink-0">[{log.time}]</span>
                      <span className={logColor}>{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
