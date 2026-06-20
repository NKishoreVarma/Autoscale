import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { calendarService } from '../utils/calendarService';
import { 
  Calendar, Clock, CheckCircle, Video, User, Building, Send, MessageSquare, 
  ArrowLeft, Compass, Cpu, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerToast } from '../utils/errorHandler';

export default function BookMeeting() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'discovery';

  const [meetingType, setMeetingType] = useState(initialType);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    date: '',
    time: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calendarLink, setCalendarLink] = useState('');

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['discovery', 'audit_review', 'strategy'].includes(typeParam)) {
      setMeetingType(typeParam);
    }
  }, [searchParams]);

  const meetingDetails = {
    discovery: {
      title: 'Discovery Call',
      duration: '15 Mins',
      desc: 'Understand AutoScale services, align goals, and explore general collaboration avenues.',
      icon: Compass,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    audit_review: {
      title: 'Audit Review',
      duration: '30 Mins',
      desc: 'Deep-dive review of your generated AI growth audit, optimization opportunities, and ROI metrics.',
      icon: Cpu,
      color: 'text-[#5E0ED7]',
      bgColor: 'bg-[#5E0ED7]/10',
      borderColor: 'border-[#5E0ED7]/20'
    },
    strategy: {
      title: 'Strategy Session',
      duration: '45 Mins',
      desc: 'Detailed discussion mapping system architecture, workflows, scope, and technical proposals.',
      icon: Target,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.date || !form.time) {
      triggerToast('Please fill out all required fields.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Lead document in Firestore if not existing (as scheduling visitor)
      const leadPayload = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        service: meetingDetails[meetingType].title,
        message: form.message.trim() || `Scheduled ${meetingDetails[meetingType].title}`,
        leadSource: `Meeting Booking - ${meetingDetails[meetingType].title}`,
        source: 'Booking System',
        status: 'Scheduled',
        preferredDate: `${form.date} ${form.time}`,
        createdAt: serverTimestamp()
      };
      
      const leadDocRef = await addDoc(collection(db, 'leads'), leadPayload);
      const leadId = leadDocRef.id;

      // 2. Trigger Google Calendar scheduling
      let calLink = '';
      try {
        const calData = {
          id: leadId,
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || 'N/A',
          service: meetingDetails[meetingType].title,
          message: form.message.trim() || 'No bottlenecks specified',
          date: form.date,
          time: form.time,
          type: meetingType
        };
        calLink = await calendarService.createEvent(calData);
        if (calLink) setCalendarLink(calLink);
      } catch (calErr) {
        console.error('[BookMeeting] Google Calendar integration failed:', calErr);
      }

      // If calendar link is empty, write meeting as fallback locally
      if (!calLink) {
        await addDoc(collection(db, 'meetings'), {
          title: `${meetingDetails[meetingType].title}: ${form.name.trim()} (${form.company.trim() || 'N/A'})`,
          date: form.date,
          time: form.time,
          link: '',
          leadId,
          type: meetingType,
          createdAt: serverTimestamp()
        });
      }

      // 3. Create Admin notification and log activity
      await addDoc(collection(db, 'notifications'), {
        type: 'meeting_booked',
        title: `Meeting Scheduled: ${meetingDetails[meetingType].title}`,
        message: `${form.name.trim()} scheduled a ${meetingDetails[meetingType].title} for ${form.date} at ${form.time}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activity_logs'), {
        action: 'Meeting Scheduled',
        entity: 'meeting',
        entityId: leadId,
        performedBy: 'website_visitor',
        details: `Public visitor scheduled a ${meetingDetails[meetingType].title} for ${form.date} at ${form.time}.`,
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('[BookMeeting] Booking process exception:', err);
      triggerToast('Booking scheduling failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  const SelectedIcon = meetingDetails[meetingType].icon;

  return (
    <div className="pt-28 pb-24 px-6 md:px-12 lg:px-16 relative z-10 max-w-5xl mx-auto flex flex-col items-center">
      {/* Background ambient radial light glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5E0ED7]/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left side: Selector cards (Col-span 5) */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#5E0ED7] uppercase block mb-2 font-mono">
                  SCHEDULER ENGINE
                </span>
                <h1 className="text-3xl md:text-4xl font-light text-white uppercase tracking-tight">
                  BOOK A CALL
                </h1>
                <p className="text-xs text-gray-400 mt-2 font-light leading-relaxed normal-case">
                  Select a meeting tier. Our calendar integration secures your booking slots immediately.
                </p>
              </div>

              <div className="space-y-4">
                {Object.entries(meetingDetails).map(([key, details]) => {
                  const Icon = details.icon;
                  const isSelected = meetingType === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setMeetingType(key)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 ${
                        isSelected 
                          ? 'border-white bg-white/[0.04] shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                          : 'border-white/5 bg-transparent hover:border-white/20 hover:bg-white/[0.01]'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${details.bgColor} ${details.color} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wide">{details.title}</span>
                          <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">{details.duration}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-light leading-relaxed normal-case">{details.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side: Input Form (Col-span 7) */}
            <div className="lg:col-span-7">
              <form 
                onSubmit={handleSubmit}
                className="p-6 md:p-8 rounded-[24px] border border-white/10 bg-white/[0.01] backdrop-blur-md space-y-5 shadow-2xl"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className={`p-2.5 rounded-xl ${meetingDetails[meetingType].bgColor} ${meetingDetails[meetingType].color}`}>
                    <SelectedIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block font-mono">SELECTED MEETING TIER</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{meetingDetails[meetingType].title} ({meetingDetails[meetingType].duration})</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-[#5E0ED7]" /> Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleInputChange}
                      className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                      placeholder="Your Full Name"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1">
                      <Send className="w-3 h-3 text-[#5E0ED7]" /> Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleInputChange}
                      className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1">
                    <Building className="w-3 h-3 text-[#5E0ED7]" /> Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleInputChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case"
                    placeholder="E.g. AutoScale Logistics"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Date Select *</label>
                    <input
                      type="date"
                      name="date"
                      required
                      value={form.date}
                      onChange={handleInputChange}
                      className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Time Slot *</label>
                    <input
                      type="time"
                      name="time"
                      required
                      value={form.time}
                      onChange={handleInputChange}
                      className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-[#5E0ED7]" /> What bottlenecks should we focus on?
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={handleInputChange}
                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition duration-200 normal-case resize-none"
                    placeholder="Brief details about your operations and challenges..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-white text-black text-xs font-semibold tracking-widest uppercase hover:bg-gray-100 transition duration-200 rounded-xl flex items-center justify-center gap-2 mt-4 cursor-target disabled:opacity-50"
                >
                  <Video className="w-4 h-4 text-[#5E0ED7]" />
                  <span>{loading ? 'Securing Slot...' : 'Schedule Invitation'}</span>
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg text-center p-8 rounded-[24px] border border-white/10 bg-white/[0.01] backdrop-blur-md space-y-6 shadow-2xl flex flex-col items-center"
          >
            <CheckCircle className="w-16 h-16 text-emerald-400" />
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-400 uppercase font-mono">BOOKING SECURED</span>
              <h2 className="text-xl md:text-2xl font-light text-white uppercase mt-1">Slot Scheduled Successfully!</h2>
              <p className="text-xs text-gray-400 mt-3 font-light leading-relaxed normal-case">
                A Google Calendar invite and confirmation email have been sent to <span className="font-semibold text-white">{form.email}</span>.
              </p>
            </div>

            {calendarLink && (
              <a
                href={calendarLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10 rounded-xl transition flex items-center justify-center gap-2"
              >
                <span>View Google Calendar Event</span>
              </a>
            )}

            <button
              onClick={() => {
                setSuccess(false);
                setForm({
                  name: '',
                  email: '',
                  company: '',
                  message: '',
                  date: '',
                  time: ''
                });
              }}
              className="text-[10px] font-bold tracking-widest uppercase text-gray-500 hover:text-white transition flex items-center gap-1.5 mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Book Another Slot</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
