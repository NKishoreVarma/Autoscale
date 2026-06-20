import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAuditAction } from '../../utils/auditLogger';
import {
  Shield, Bell, CheckCircle, Lock, Building, Globe, Mail, PhoneCall, Cpu, Save, RefreshCw, Calendar
} from 'lucide-react';

import { triggerToast } from '../../utils/errorHandler';

import { appConfig } from '../../config/appConfig';

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building },
  { id: 'website', label: 'Website Settings', icon: Globe },
  { id: 'smtp', label: 'SMTP Email', icon: Mail },
  { id: 'twilio', label: 'Twilio Gateway', icon: PhoneCall },
  { id: 'google_calendar', label: 'Google Calendar', icon: Calendar },
  { id: 'firebase', label: 'Firebase Config', icon: Cpu }
];

export default function AdminSettings() {
  const { userRole, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: 'AutoScale Systems',
    companyAddress: 'Tech Hub, Bangalore, India',
    companyEmail: 'contact@autoscale.systems',
    companyLogo: 'https://autoscale.systems/logo.png',
    websiteMaintenance: false,
    websiteAllowRegistration: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUsername: 'notifications@autoscale.systems',
    smtpPassword: '••••••••••••••••',
    twilioSid: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    twilioToken: '••••••••••••••••••••••••••••••••',
    twilioPhone: '+14155552671',
    googleClientId: '',
    googleClientSecret: '',
    googleRefreshToken: '',
    googleCalendarId: 'primary',
    firebaseApiKey: appConfig.firebase.apiKey || 'AIzaSyA...',
    firebaseProjectId: appConfig.firebase.projectId || 'autoscale-prod',
    firebaseAppId: appConfig.firebase.appId || '1:123456:web:abcd'
  });

  const isSuperAdmin = userRole === 'super_admin';

  // Read split settings from Firestore
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        console.log('[AdminSettings] Fetching workspace configurations...');
        const companySnap = await getDoc(doc(db, 'settings', 'company'));
        const websiteSnap = await getDoc(doc(db, 'settings', 'website'));
        const smtpSnap = await getDoc(doc(db, 'settings', 'smtp'));
        const twilioSnap = await getDoc(doc(db, 'settings', 'twilio'));
        const calSnap = await getDoc(doc(db, 'settings', 'google_calendar'));

        setFormData(prev => {
          const newFormData = { ...prev };

          if (companySnap.exists()) {
            const data = companySnap.data();
            newFormData.companyName = data.companyName || newFormData.companyName;
            newFormData.companyAddress = data.address || newFormData.companyAddress;
            newFormData.companyEmail = data.supportEmail || newFormData.companyEmail;
            newFormData.companyLogo = data.logoUrl || newFormData.companyLogo;
          }

          if (websiteSnap.exists()) {
            const data = websiteSnap.data();
            newFormData.websiteMaintenance = data.websiteMaintenance ?? newFormData.websiteMaintenance;
            newFormData.websiteAllowRegistration = data.websiteAllowRegistration ?? newFormData.websiteAllowRegistration;
          }

          if (smtpSnap.exists()) {
            const data = smtpSnap.data();
            newFormData.smtpHost = data.host || newFormData.smtpHost;
            newFormData.smtpPort = data.port || newFormData.smtpPort;
            newFormData.smtpUsername = data.username || newFormData.smtpUsername;
            newFormData.smtpPassword = data.smtpPassword || newFormData.smtpPassword;
          }

          if (twilioSnap.exists()) {
            const data = twilioSnap.data();
            newFormData.twilioSid = data.accountSid || newFormData.twilioSid;
            newFormData.twilioToken = data.twilioToken || newFormData.twilioToken;
            newFormData.twilioPhone = data.phoneNumber || newFormData.twilioPhone;
          }

          if (calSnap.exists()) {
            const data = calSnap.data();
            newFormData.googleClientId = data.clientId || newFormData.googleClientId;
            newFormData.googleClientSecret = data.clientSecret || newFormData.googleClientSecret;
            newFormData.googleRefreshToken = data.refreshToken || newFormData.googleRefreshToken;
            newFormData.googleCalendarId = data.calendarId || newFormData.googleCalendarId;
          }

          return newFormData;
        });
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isSuperAdmin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setSaving(true);
    setSuccess(false);

    try {
      let docRef;
      let dataToSave = {};
      let auditMsg = '';

      if (activeTab === 'company') {
        docRef = doc(db, 'settings', 'company');
        dataToSave = {
          companyName: formData.companyName,
          address: formData.companyAddress,
          supportEmail: formData.companyEmail,
          logoUrl: formData.companyLogo,
          updatedAt: serverTimestamp()
        };
        auditMsg = `Updated company profile name to "${formData.companyName}"`;
      } else if (activeTab === 'website') {
        docRef = doc(db, 'settings', 'website');
        dataToSave = {
          siteTitle: formData.companyName,
          primaryColor: '#ffffff',
          secondaryColor: '#000000',
          websiteMaintenance: formData.websiteMaintenance,
          websiteAllowRegistration: formData.websiteAllowRegistration,
          updatedAt: serverTimestamp()
        };
        auditMsg = `Updated website maintenance to ${formData.websiteMaintenance} and registration to ${formData.websiteAllowRegistration}`;
      } else if (activeTab === 'smtp') {
        docRef = doc(db, 'settings', 'smtp');
        dataToSave = {
          host: formData.smtpHost,
          port: formData.smtpPort,
          username: formData.smtpUsername,
          senderEmail: formData.smtpUsername,
          smtpPassword: formData.smtpPassword,
          updatedAt: serverTimestamp()
        };
        auditMsg = `Updated SMTP settings for server ${formData.smtpHost}`;
      } else if (activeTab === 'twilio') {
        docRef = doc(db, 'settings', 'twilio');
        dataToSave = {
          accountSid: formData.twilioSid,
          twilioToken: formData.twilioToken,
          phoneNumber: formData.twilioPhone,
          whatsappNumber: `whatsapp:${formData.twilioPhone}`,
          updatedAt: serverTimestamp()
        };
        auditMsg = `Updated Twilio gateway with Account SID ${formData.twilioSid.substring(0, 8)}...`;
      } else if (activeTab === 'google_calendar') {
        docRef = doc(db, 'settings', 'google_calendar');
        dataToSave = {
          clientId: formData.googleClientId,
          clientSecret: formData.googleClientSecret,
          refreshToken: formData.googleRefreshToken,
          calendarId: formData.googleCalendarId,
          updatedAt: serverTimestamp()
        };
        auditMsg = `Updated Google Calendar settings for ID "${formData.googleCalendarId}"`;
      } else {
        setSaving(false);
        return;
      }

      await setDoc(docRef, dataToSave, { merge: true });

      // Log this action in auditLogs
      await logAuditAction(
        userProfile?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Updated ${activeTab.toUpperCase()} Settings`,
        'settings',
        auditMsg
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      triggerToast('Failed to save settings. Please verify Firestore security rules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 1. Strict Security Block for non-super-admins
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-6 max-w-md p-8 rounded-2xl border border-white/5 bg-white/[0.01] text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full border border-red-500/20 bg-red-950/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-[0.25em] text-red-500 uppercase block mb-1">
              Access Denied
            </span>
            <h2 className="text-xl font-normal text-white uppercase tracking-tight">
              SUPER ADMIN CLEARANCE REQUIRED
            </h2>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed normal-case">
              Only the primary Super Admin (`kishorevarma2205@gmail.com`) can view system configurations, Twilio API tokens, SMTP credentials, or Firebase project setups.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-10">
      
      {/* Title Header */}
      <div>
        <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
          SYSTEM PREFERENCES
        </span>
        <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
          WORKSPACE CONFIGURATION
        </h1>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Settings Sub-navigation Tabs */}
          <aside className="w-full lg:w-64 flex flex-col gap-1 flex-shrink-0">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSuccess(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-black font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Settings Details Form */}
          <div className="flex-grow max-w-2xl w-full">
            
            {success && (
              <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Workspace configurations saved successfully to Cloud Firestore.</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Tab 1: Company Profile */}
              {activeTab === 'company' && (
                <div 
                  className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-5"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Building className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
                      Company Profile settings
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Company Name *</label>
                      <input
                        type="text"
                        name="companyName"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Support Email *</label>
                      <input
                        type="email"
                        name="companyEmail"
                        required
                        value={formData.companyEmail}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Physical Address</label>
                      <input
                        type="text"
                        name="companyAddress"
                        value={formData.companyAddress}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Company Logo URI</label>
                      <input
                        type="text"
                        name="companyLogo"
                        value={formData.companyLogo}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Website Settings */}
              {activeTab === 'website' && (
                <div 
                  className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-5"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
                      Global Website Settings
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs py-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-semibold uppercase tracking-wider text-[10px]">Maintenance Mode</span>
                        <span className="text-gray-500 font-light">Lock website frontends to show a maintenance billboard.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, websiteMaintenance: !prev.websiteMaintenance }))}
                        className={`w-10 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                          formData.websiteMaintenance ? 'bg-white' : 'bg-white/10'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full transition duration-200 ${
                          formData.websiteMaintenance ? 'bg-black translate-x-5' : 'bg-gray-400'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-semibold uppercase tracking-wider text-[10px]">Allow Administrator Registrations</span>
                        <span className="text-gray-500 font-light">Allow staff signups at /admin/login interface.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, websiteAllowRegistration: !prev.websiteAllowRegistration }))}
                        className={`w-10 h-5 rounded-full p-0.5 transition duration-200 focus:outline-none ${
                          formData.websiteAllowRegistration ? 'bg-white' : 'bg-white/10'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full transition duration-200 ${
                          formData.websiteAllowRegistration ? 'bg-black translate-x-5' : 'bg-gray-400'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: SMTP Settings */}
              {activeTab === 'smtp' && (
                <div 
                  className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-5"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
                      SMTP Mail Server Configuration
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">SMTP Server Host *</label>
                        <input
                          type="text"
                          name="smtpHost"
                          required
                          value={formData.smtpHost}
                          onChange={handleChange}
                          className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Host Port *</label>
                        <input
                          type="text"
                          name="smtpPort"
                          required
                          value={formData.smtpPort}
                          onChange={handleChange}
                          className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">SMTP Username *</label>
                      <input
                        type="text"
                        name="smtpUsername"
                        required
                        value={formData.smtpUsername}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">SMTP Password *</label>
                      <input
                        type="password"
                        name="smtpPassword"
                        required
                        value={formData.smtpPassword}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Twilio settings */}
              {activeTab === 'twilio' && (
                <div 
                  className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-5"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <PhoneCall className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
                      Twilio SMS / WhatsApp API Gateway
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Twilio Account SID</label>
                      <input
                        type="text"
                        name="twilioSid"
                        value={formData.twilioSid}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Twilio Auth Token</label>
                      <input
                        type="password"
                        name="twilioToken"
                        value={formData.twilioToken}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Sender Phone (WhatsApp)</label>
                      <input
                        type="text"
                        name="twilioPhone"
                        value={formData.twilioPhone}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Google Calendar settings */}
              {activeTab === 'google_calendar' && (
                <div 
                  className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-5"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
                      Google Calendar OAuth Configuration
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Google Client ID</label>
                      <input
                        type="text"
                        name="googleClientId"
                        value={formData.googleClientId}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Google Client Secret</label>
                      <input
                        type="password"
                        name="googleClientSecret"
                        value={formData.googleClientSecret}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Google Refresh Token</label>
                      <input
                        type="password"
                        name="googleRefreshToken"
                        value={formData.googleRefreshToken}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Calendar ID</label>
                      <input
                        type="text"
                        name="googleCalendarId"
                        value={formData.googleCalendarId}
                        onChange={handleChange}
                        className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Firebase settings */}
              {activeTab === 'firebase' && (
                <div 
                  className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-5"
                  style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Cpu className="w-5 h-5 text-gray-400" />
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-white">
                      Active Firebase Credentials
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Firebase API Key</label>
                      <input
                        type="text"
                        name="firebaseApiKey"
                        disabled
                        value={formData.firebaseApiKey}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Project ID</label>
                      <input
                        type="text"
                        name="firebaseProjectId"
                        disabled
                        value={formData.firebaseProjectId}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">App ID</label>
                      <input
                        type="text"
                        name="firebaseAppId"
                        disabled
                        value={formData.firebaseAppId}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full lg:w-fit px-8 py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition duration-200 uppercase flex items-center justify-center gap-2 self-end disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving configurations...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
