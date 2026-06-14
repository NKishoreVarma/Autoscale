import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Mail, MessageSquare, Plus, Settings, ShieldCheck, History, Send, Globe, Server, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';

export default function CommunicationHub() {
  const { user: authUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('email'); // email, whatsapp
  const [emailLogs, setEmailLogs] = useState([]);
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      query(collection(db, 'emailLogs'), orderBy('timestamp', 'desc')),
      (snap) => {
        setEmailLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => console.error("Error loading email logs:", err)
    );

    const unsubWhatsapp = onSnapshot(
      query(collection(db, 'whatsappLogs'), orderBy('timestamp', 'desc')),
      (snap) => {
        setWhatsappLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => console.error("Error loading WhatsApp logs:", err)
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
      await addDoc(collection(db, 'emailLogs'), {
        leadEmail: 'contact@patelclinics.com',
        leadName: 'Amit Patel',
        subject: 'Welcome to Autoscale Systems',
        body: 'Hi Amit,\n\nThank you for contacting Autoscale. We have received your automation request.',
        status: 'sent',
        triggerEvent: 'New Lead',
        timestamp: serverTimestamp()
      });

      await addDoc(collection(db, 'whatsappLogs'), {
        phone: '+919988776655',
        name: 'Amit Patel',
        templateUsed: 'Welcome Template',
        status: 'sent',
        payload: 'Hi Amit, welcome to Autoscale! We are reviewing your systems audit details.',
        timestamp: serverTimestamp()
      });

      alert('Simulated test logs triggered successfully!');
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
      </div>

      {/* Tab Contents */}
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
                            <span className="font-medium text-white">{log.leadName}</span>
                            <span className="text-gray-500 font-mono text-[10px] truncate max-w-[150px]">{log.leadEmail}</span>
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
                        <td className="px-6 py-4 text-white font-medium">{log.name}</td>
                        <td className="px-6 py-4 font-mono text-gray-300 text-[10px]">{log.phone}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded border border-white/10">{log.templateUsed}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-light truncate max-w-[200px] normal-case">{log.payload}</td>
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
    </div>
  );
}
