import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeInput } from '../utils/sanitizer';
import { emailService } from '../utils/emailService';
import { whatsappService } from '../utils/whatsappService';
import { calendarService } from '../utils/calendarService';

export default function LeadFormModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'contact'
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    service: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail) {
        setForm(prev => ({
          ...prev,
          service: e.detail.service || '',
          message: e.detail.message || ''
        }));

        // Determine default tab based on incoming request details
        const msg = (e.detail.message || '').toLowerCase();
        const serv = (e.detail.service || '').toLowerCase();
        if (
          msg.includes('schedule') || 
          msg.includes('contact') || 
          msg.includes('call') || 
          e.detail.source === 'Contact'
        ) {
          setActiveTab('contact');
        } else {
          setActiveTab('audit');
        }
      } else {
        setActiveTab('audit');
      }
      setIsOpen(true);
      setSuccess(false);
      setError('');
    };

    window.addEventListener('open-lead-modal', handleOpen);
    return () => window.removeEventListener('open-lead-modal', handleOpen);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs based on active tab
    if (activeTab === 'audit') {
      if (!form.name || !form.email || !form.phone || !form.company || !form.industry || !form.service) {
        setError('Please fill out all required fields.');
        return;
      }
    } else {
      if (!form.name || !form.email || !form.phone || !form.company || !form.message) {
        setError('Please fill out all required fields.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const sanitizedName = sanitizeInput(form.name.trim());
      const sanitizedEmail = sanitizeInput(form.email.trim());
      const sanitizedPhone = sanitizeInput(form.phone.trim());
      const sanitizedCompany = sanitizeInput(form.company.trim());

      if (activeTab === 'audit') {
        const leadPayload = {
          name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          company: sanitizedCompany,
          industry: sanitizeInput(form.industry) || 'Other',
          service: sanitizeInput(form.service) || 'Custom Systems',
          requestedService: sanitizeInput(form.service) || 'Custom Systems',
          preferredDate: 'TBD',
          message: `System requested: ${form.service}.`,
          leadSource: 'Book Audit',
          source: 'Book Audit',
          status: 'New',
          createdAt: serverTimestamp()
        };

        // STEP 2 Trace: console logs for Book Audit submission
        console.log("Submitting Book Audit Form");
        console.log("Firestore Payload", leadPayload);
        const docRef = await addDoc(collection(db, 'leads'), leadPayload);
        console.log("Document Created", docRef.id);
        const leadWithId = { id: docRef.id, ...leadPayload };

        // Send Confirmation Email, WhatsApp, and Google Calendar Booking
        try {
          await emailService.sendAuditConfirmation(leadWithId);
          await whatsappService.sendLeadCreated(leadWithId);
          await calendarService.createEvent(leadWithId);
        } catch (eErr) {
          console.error('Real integrations triggers failed:', eErr);
        }

        // Create notification
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'new_booking',
            title: 'New Booking Request',
            message: `${sanitizedName} from ${sanitizedCompany} requested a Book Audit for ${form.service}.`,
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.error('Notification failed:', nErr);
        }

        // Create activity log
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'Booking Created',
            entity: 'lead',
            entityId: docRef.id,
            performedBy: 'website',
            details: `New audit booking request from ${sanitizedName} (${sanitizedCompany}) for ${form.service}`,
            createdAt: serverTimestamp()
          });
        } catch (aErr) {
          console.error('Activity log failed:', aErr);
        }

      } else {
        const leadPayload = {
          name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          company: sanitizedCompany,
          industry: 'Other',
          service: 'Custom Systems',
          message: sanitizeInput(form.message.trim()),
          leadSource: 'Contact Form',
          source: 'Contact Form',
          status: 'New',
          createdAt: serverTimestamp()
        };

        // STEP 1 Trace: console logs for Contact Form submission
        console.log("Submitting Contact Form");
        console.log("Firestore Payload", leadPayload);
        const docRef = await addDoc(collection(db, 'leads'), leadPayload);
        console.log("Document Created", docRef.id);
        const leadWithId = { id: docRef.id, ...leadPayload };

        // Send Thank You Email and WhatsApp alert
        try {
          await emailService.sendThankYouEmail(leadWithId);
          await whatsappService.sendLeadCreated(leadWithId);
        } catch (eErr) {
          console.error('Real integrations triggers failed:', eErr);
        }

        // Create notification
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'new_lead',
            title: 'New Contact Submission',
            message: `${sanitizedName} from ${sanitizedCompany} submitted the contact form.`,
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.error('Notification failed:', nErr);
        }

        // Create activity log
        try {
          await addDoc(collection(db, 'activity_logs'), {
            action: 'Contact Form Submitted',
            entity: 'lead',
            entityId: docRef.id,
            performedBy: 'website',
            details: `New contact form submission from ${form.name.trim()} (${form.company.trim()})`,
            createdAt: serverTimestamp()
          });
        } catch (aErr) {
          console.error('Activity log failed:', aErr);
        }
      }

      setSuccess(true);
      setForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        industry: '',
        service: '',
        message: ''
      });
    } catch (err) {
      console.error('Error submitting lead:', err);
      // STEP 6: Show visible UI error on failure
      setError('Lead submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-xl liquid-glass border border-white/10 rounded-2xl p-6 md:p-8 z-10 overflow-hidden shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition duration-200"
            >
              <X className="w-5 h-5" />
            </button>

            {success ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-6 bg-white/5">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold tracking-wider uppercase mb-2">
                  {activeTab === 'audit' ? 'AUDIT REQUEST RECEIVED' : 'MESSAGE TRANSMITTED'}
                </h3>
                <p className="text-sm text-gray-300 max-w-sm leading-relaxed">
                  {activeTab === 'audit' 
                    ? 'Our systems architect will audit your bottlenecks and contact you within 24 hours.'
                    : 'Your message has been logged in our system. An engineer will reach out shortly.'
                  }
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="mt-8 px-6 py-2.5 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-200 transition duration-200"
                >
                  CLOSE WINDOW
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg md:text-xl font-semibold tracking-wider uppercase mb-1">
                  {activeTab === 'audit' ? 'REQUEST AUTOMATION AUDIT' : 'GET IN TOUCH'}
                </h3>
                <p className="text-xs text-gray-300 mb-6">
                  {activeTab === 'audit' 
                    ? 'Provide details about your operational bottlenecks.'
                    : 'Send us a message and our team will get back to you shortly.'
                  }
                </p>

                {/* Sliding Glass Tab Selector */}
                <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mb-6 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('audit');
                      setError('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase rounded-lg transition-all duration-300 relative z-10 ${
                      activeTab === 'audit' ? 'text-black bg-white shadow-lg font-extrabold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Book Audit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('contact');
                      setError('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase rounded-lg transition-all duration-300 relative z-10 ${
                      activeTab === 'contact' ? 'text-black bg-white shadow-lg font-extrabold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Contact Us
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-lg">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="company"
                        required
                        value={form.company}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                      />
                    </div>
                  </div>

                  {activeTab === 'audit' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                          Industry *
                        </label>
                        <select
                          name="industry"
                          required={activeTab === 'audit'}
                          value={form.industry}
                          onChange={handleChange}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                        >
                          <option value="">Select Industry</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Education">Education</option>
                          <option value="Ecommerce">Ecommerce</option>
                          <option value="Agencies">Agencies</option>
                          <option value="Legal">Legal</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                          Business System Needed *
                        </label>
                        <select
                          name="service"
                          required={activeTab === 'audit'}
                          value={form.service}
                          onChange={handleChange}
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200"
                        >
                          <option value="">Select System</option>
                          <option value="AI Agents">AI Agents</option>
                          <option value="WhatsApp Automation">WhatsApp Automation</option>
                          <option value="Lead Generation">Lead Generation</option>
                          <option value="Customer Support">Customer Support</option>
                          <option value="Business Automation">Business Automation</option>
                          <option value="Custom Systems">Custom Systems</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-gray-300 uppercase mb-1.5">
                      {activeTab === 'audit' ? 'Bottleneck Description (Optional)' : 'Message *'}
                    </label>
                    <textarea
                      name="message"
                      rows={3}
                      required={activeTab === 'contact'}
                      value={form.message}
                      onChange={handleChange}
                      placeholder={activeTab === 'audit' ? 'Tell us about the workflows that leak revenue...' : 'How can we help you?'}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-lg bg-white text-black text-xs font-semibold tracking-wider hover:bg-gray-100 transition duration-200 disabled:opacity-50 uppercase flex items-center justify-center"
                  >
                    {loading 
                      ? 'SUBMITTING...' 
                      : (activeTab === 'audit' ? 'SUBMIT AUDIT REQUEST' : 'SUBMIT CONTACT INQUIRY')
                    }
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
