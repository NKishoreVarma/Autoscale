import { triggerToast } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Mail, MessageSquare, Plus, Settings, ShieldCheck, History, Send, Globe, Server, Check, Cpu, Calendar, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import { emailService } from '../../utils/emailService';

export default function CommunicationHub() {
  const { user: authUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('email'); // email, whatsapp, campaigns
  const [emailLogs, setEmailLogs] = useState([]);
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Campaign specific state
  const [campaignLeads, setCampaignLeads] = useState([]);
  const [audits, setAudits] = useState({});
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Fetch campaign data when activeTab becomes 'campaigns'
  useEffect(() => {
    if (activeTab !== 'campaigns') return;
    setCampaignLoading(true);

    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), orderBy('createdAt', 'desc')),
      async (leadsSnap) => {
        const leadsList = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        try {
          const auditsSnap = await getDocs(collection(db, 'auditReports'));
          const auditsMap = {};
          auditsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.leadId) {
              auditsMap[data.leadId] = { id: doc.id, ...data };
            }
          });

          setAudits(auditsMap);

          // Filter leads that have audits or have source AI Audit
          const filtered = leadsList.filter(l => auditsMap[l.id] || l.leadSource === 'AI Audit' || l.source === 'AI Audit');
          setCampaignLeads(filtered);
        } catch (err) {
          console.error("Error matching audits:", err);
        } finally {
          setCampaignLoading(false);
        }
      },
      (err) => {
        console.error("Error loading campaign leads:", err);
        setCampaignLoading(false);
      }
    );

    return () => unsubLeads();
  }, [activeTab]);

  const handleTriggerCampaign = async (lead, stage) => {
    const audit = audits[lead.id];
    
    try {
      if (stage === 2) {
        await emailService.sendFollowUpDay2(lead);
      } else if (stage === 5) {
        await emailService.sendFollowUpDay5(lead, audit);
      } else if (stage === 7) {
        await emailService.sendFollowUpDay7(lead);
      }

      // Update lead document in Firestore
      await updateDoc(doc(db, 'leads', lead.id), {
        campaignStage: stage,
        lastCampaignTriggeredAt: serverTimestamp()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        action: `Campaign Day ${stage} Sent`,
        entity: 'lead',
        entityId: lead.id,
        performedBy: authUser?.email || 'admin',
        details: `Manually triggered Campaign Day ${stage} email for ${lead.name} (${lead.company || 'N/A'})`,
        createdAt: serverTimestamp()
      });

      triggerToast(`Campaign Day ${stage} email triggered successfully!`, 'success');
    } catch (err) {
      console.error(`Error triggering campaign Day ${stage}:`, err);
      triggerToast(`Failed to trigger campaign email: ${err.message}`, 'error');
    }
  };

  // SMTP Configuration Form
  const [smtp, setSmtp] = useState({
    host: 'smtp.autoscale.systems',
    port: '587',
    user: 'notifications@autoscale.systems',
    pass: '••••••••••••'
  });
  const [smtpSaved, setSmtpSaved] = useState(false);

  // Twilio Configuration Form
  const [twilio, setTwilio] = useState({
    accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxx',
    authToken: '••••••••••••••••••••••••',
    whatsappPhone: '+14155238886'
  });
  const [twilioSaved, setTwilioSaved] = useState(false);

  // Sync Logs
  useEffect(() => {
    const unsubEmails = onSnapshot(
      query(collection(db, 'email_logs'), orderBy('timestamp', 'desc')),
      (snap) => {
        setEmailLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.error("Error loading email logs:", err);
      }
    );

    const unsubWhatsapp = onSnapshot(
      query(collection(db, 'whatsapp_logs'), orderBy('timestamp', 'desc')),
      (snap) => {
        setWhatsappLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading WhatsApp logs:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubEmails();
      unsubWhatsapp();
    };
  }, []);

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSmtpSaved(true);
    setTimeout(() => setSmtpSaved(false), 2000);
    // Write configuration to settings
    try {
      await addDoc(collection(db, 'settings'), {
        category: 'smtp_config',
        updatedBy: authUser?.email || 'admin',
        timestamp: serverTimestamp()
      });
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated SMTP Config',
        'settings',
        'smtp_config',
        'Configured SMTP gateway details'
      );
    } catch (err) {
      console.error("Error writing settings:", err);
    }
  };

  const handleSaveTwilio = async (e) => {
    e.preventDefault();
    setTwilioSaved(true);
    setTimeout(() => setTwilioSaved(false), 2000);
    // Write configuration to settings
    try {
      await addDoc(collection(db, 'settings'), {
        category: 'twilio_config',
        updatedBy: authUser?.email || 'admin',
        timestamp: serverTimestamp()
      });
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Updated Twilio Config',
        'settings',
        'twilio_config',
        'Configured Twilio API credentials'
      );
    } catch (err) {
      console.error("Error writing settings:", err);
    }
  };

  // Seeding check to populate logs if empty
  const triggerSimulateLogs = async () => {
    try {
      await addDoc(collection(db, 'email_logs'), {
        recipientEmail: 'contact@patelclinics.com',
        recipientName: 'Amit Patel',
        subject: 'Welcome to Autoscale Systems',
        body: 'Hi Amit,\n\nThank you for contacting Autoscale. We have received your automation request.',
        status: 'sent',
        triggerEvent: 'New Lead',
        timestamp: serverTimestamp()
      });

      await addDoc(collection(db, 'whatsapp_logs'), {
        recipientPhone: '+919988776655',
        recipientName: 'Amit Patel',
        templateUsed: 'Welcome Template',
        status: 'sent',
        body: 'Hi Amit, welcome to Autoscale! We are reviewing your systems audit details.',
        timestamp: serverTimestamp()
      });

      triggerToast('Simulated test logs triggered successfully!', 'success');
    } catch (err) {
      console.error("Error creating test log:", err);
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
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">NOTIFICATION CHANNELS</span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">COMMUNICATION HUB</h1>
        </div>
        <button
          onClick={triggerSimulateLogs}
          className="border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-semibold tracking-wider rounded-lg uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Send className="w-4 h-4 text-gray-400" />
          <span>Trigger Test Logs</span>
        </button>
      </div>

      {/* Selector Tabs */}
      <div className="flex border-b border-white/10 bg-black text-xs font-semibold tracking-wider uppercase">
        <button
          onClick={() => setActiveTab('email')}
          className={`px-6 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'email' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Automations (SMTP)</span>
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-6 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'whatsapp' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp Automations (Twilio)</span>
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'campaigns' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <History className="w-4 h-4" />
          <span>Follow-up Campaigns</span>
        </button>
      </div>

      {/* Tab Contents */}
      {(activeTab === 'email' || activeTab === 'whatsapp') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Configuration form */}
        <div className="col-span-1 lg:col-span-4 rounded-xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Gateway Configuration</span>
          </div>

          {activeTab === 'email' ? (
            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={smtp.host}
                  onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={smtp.user}
                    onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">SMTP Port</label>
                  <input
                    type="text"
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={smtp.pass}
                  onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black text-xs font-bold tracking-wider rounded-lg py-2.5 uppercase hover:bg-gray-100 transition flex items-center justify-center gap-1.5"
              >
                {smtpSaved ? <Check className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                <span>{smtpSaved ? 'Settings Saved' : 'Save SMTP settings'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveTwilio} className="space-y-4">
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">Twilio Account SID</label>
                <input
                  type="text"
                  value={twilio.accountSid}
                  onChange={(e) => setTwilio({ ...twilio, accountSid: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">Twilio Auth Token</label>
                <input
                  type="password"
                  value={twilio.authToken}
                  onChange={(e) => setTwilio({ ...twilio, authToken: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-widest text-gray-500 block mb-1">WhatsApp Senders Number</label>
                <input
                  type="text"
                  value={twilio.whatsappPhone}
                  onChange={(e) => setTwilio({ ...twilio, whatsappPhone: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono transition"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black text-xs font-bold tracking-wider rounded-lg py-2.5 uppercase hover:bg-gray-100 transition flex items-center justify-center gap-1.5"
              >
                {twilioSaved ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                <span>{twilioSaved ? 'Credentials Saved' : 'Save Twilio keys'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Outbound Log feed */}
        <div className="col-span-1 lg:col-span-8 rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              <span>Outbound Logs</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'email' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Trigger Sequence</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Sent Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-gray-500 uppercase tracking-wider">No email logs found.</td>
                    </tr>
                  ) : (
                    emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{log.recipientName || log.leadName}</span>
                            <span className="text-gray-500 font-mono text-[10px] truncate max-w-[150px]">{log.recipientEmail || log.leadEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-light truncate max-w-[200px] normal-case">{log.subject}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded border border-white/10">{log.triggerEvent}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400 font-mono text-[10px]">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('en-IN') : 'Recent'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Template used</th>
                    <th className="px-6 py-4">Message payload</th>
                    <th className="px-6 py-4 text-right">Sent Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {whatsappLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-gray-500 uppercase tracking-wider">No WhatsApp logs found.</td>
                    </tr>
                  ) : (
                    whatsappLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition">
                        <td className="px-6 py-4 text-white font-medium">{log.recipientName || log.name}</td>
                        <td className="px-6 py-4 font-mono text-gray-300 text-[10px]">{log.recipientPhone || log.phone}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded border border-white/10">{log.templateUsed}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-light truncate max-w-[200px] normal-case">{log.body || log.payload}</td>
                        <td className="px-6 py-4 text-right text-gray-400 font-mono text-[10px]">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('en-IN') : 'Recent'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="col-span-12 rounded-xl border border-white/5 bg-white/[0.01] p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#5E0ED7]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Automated Follow-up Sequences</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Total Candidates: {campaignLeads.length}</span>
          </div>

          {campaignLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
            </div>
          ) : campaignLeads.length === 0 ? (
            <div className="py-12 text-center text-gray-500 uppercase tracking-widest text-xs">
              No leads currently registered in follow-up pipelines.
            </div>
          ) : (
            <div className="space-y-6">
              {campaignLeads.map((lead) => {
                const audit = audits[lead.id];
                const stage = lead.campaignStage || 0; // 0, 2, 5, 7

                return (
                  <div key={lead.id} className="p-6 rounded-2xl border border-white/5 bg-black/40 space-y-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{lead.name}</span>
                        <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">{lead.company || 'N/A'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 space-y-0.5">
                        <p className="normal-case">Email: {lead.email}</p>
                        {audit && <p className="text-emerald-400 font-bold uppercase tracking-wide">Projected Savings: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(audit.roiEstimate?.annualSavings || 0)}/yr</p>}
                      </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="flex-1 max-w-xl flex items-center justify-between relative px-4">
                      {/* Backing connection line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                      <div 
                        className="absolute top-1/2 left-0 h-0.5 bg-[#5E0ED7] -translate-y-1/2 transition-all duration-300 z-0" 
                        style={{ width: stage === 0 ? '0%' : stage === 2 ? '33%' : stage === 5 ? '66%' : '100%' }}
                      />

                      {/* Timeline Steps */}
                      {[
                        { day: 0, label: 'Day 0', title: 'Audit Sent' },
                        { day: 2, label: 'Day 2', title: 'Case Study' },
                        { day: 5, label: 'Day 5', title: 'ROI Forecast' },
                        { day: 7, label: 'Day 7', title: 'Strategy Call' }
                      ].map((step) => {
                        const isCompleted = stage >= step.day || (step.day === 0 && lead.id);
                        const isPending = stage < step.day;
                        const canTrigger = stage === 0 && step.day === 2 || stage === 2 && step.day === 5 || stage === 5 && step.day === 7;

                        return (
                          <div key={step.day} className="flex flex-col items-center gap-2 relative z-10">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold transition-all duration-300 ${
                              isCompleted 
                                ? 'bg-black border-[#5E0ED7] text-white shadow-[0_0_10px_rgba(94,14,215,0.4)]'
                                : 'bg-black border-white/10 text-gray-600'
                            }`}>
                              {step.day}
                            </div>
                            <div className="text-center">
                              <span className="text-[9px] font-bold text-white uppercase block tracking-wide">{step.title}</span>
                              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">{step.label}</span>
                            </div>

                            {/* Trigger Button overlay for pending stage */}
                            {isPending && canTrigger && (
                              <button
                                onClick={() => handleTriggerCampaign(lead, step.day)}
                                className="absolute -top-10 px-3 py-1 bg-white text-black hover:bg-gray-100 text-[8px] font-bold tracking-widest uppercase rounded shadow transition"
                              >
                                Trigger
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
