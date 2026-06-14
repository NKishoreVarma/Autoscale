import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Globe, Plus, X, Edit2, Trash2, Check, Sparkles, FolderOpen, HelpCircle, UserCheck, Briefcase, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';

export default function WebsiteCMS() {
  const { user: authUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('services'); // services, faqs, testimonials, caseStudies, industries
  
  // Data sets
  const [services, setServices] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit / Form states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null means adding
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // 1. Subscribe to Services
    const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('order', 'asc')), (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Subscribe to FAQs
    const unsubFaqs = onSnapshot(query(collection(db, 'faqs'), orderBy('order', 'asc')), (snap) => {
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Subscribe to Testimonials
    const unsubTestimonials = onSnapshot(query(collection(db, 'testimonials'), orderBy('order', 'asc')), (snap) => {
      setTestimonials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Subscribe to Case Studies
    const unsubCaseStudies = onSnapshot(query(collection(db, 'caseStudies'), orderBy('order', 'asc')), (snap) => {
      setCaseStudies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 5. Subscribe to Industries
    const unsubIndustries = onSnapshot(query(collection(db, 'industries'), orderBy('order', 'asc')), (snap) => {
      setIndustries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubServices();
      unsubFaqs();
      unsubTestimonials();
      unsubCaseStudies();
      unsubIndustries();
    };
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    if (activeTab === 'services') {
      setFormData({ name: '', category: 'Custom Systems', description: '', deliveryTime: 'Deploy: 7 Days', isVisible: true, order: services.length });
    } else if (activeTab === 'faqs') {
      setFormData({ question: '', answer: '', isVisible: true, order: faqs.length });
    } else if (activeTab === 'testimonials') {
      setFormData({ clientName: '', companyName: '', quote: '', rating: 5, isVisible: true, order: testimonials.length });
    } else if (activeTab === 'caseStudies') {
      setFormData({ client: '', industry: 'Healthcare', before: '', after: '', result: '', order: caseStudies.length });
    } else if (activeTab === 'industries') {
      setFormData({ title: '', leak: '', metricPrefix: '', metricValue: '', metricSuffix: '', order: industries.length });
    }
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const collectionName = activeTab === 'caseStudies' ? 'caseStudies' : activeTab;
      await deleteDoc(doc(db, collectionName, id));
      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Deleted CMS Content',
        collectionName,
        id,
        `Deleted CMS item "${title}" from tab "${activeTab}"`
      );
    } catch (err) {
      console.error("Error deleting CMS item:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const collectionName = activeTab === 'caseStudies' ? 'caseStudies' : activeTab;
    const updates = { ...formData, updatedAt: serverTimestamp() };

    // Format numbers
    if (updates.order !== undefined) updates.order = Number(updates.order) || 0;
    if (updates.rating !== undefined) updates.rating = Number(updates.rating) || 5;
    if (updates.metricValue !== undefined) updates.metricValue = Number(updates.metricValue) || 0;

    try {
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), updates);
        await logAuditAction(
          authUser?.email || 'admin@autoscale.systems',
          userRole || 'admin',
          'Updated CMS Content',
          collectionName,
          editingItem.id,
          `Updated CMS item "${updates.name || updates.question || updates.clientName || updates.client || updates.title || 'Untitled'}"`
        );
      } else {
        await addDoc(collection(db, collectionName), { ...updates, createdAt: serverTimestamp() });
        await logAuditAction(
          authUser?.email || 'admin@autoscale.systems',
          userRole || 'admin',
          'Created CMS Content',
          collectionName,
          'new',
          `Added new CMS item "${updates.name || updates.question || updates.clientName || updates.client || updates.title || 'Untitled'}"`
        );
      }
      setShowModal(false);
    } catch (err) {
      console.error("Error saving CMS data:", err);
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
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">WEBSITE CONTROL CONSOLE</span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">CMS MANAGER</h1>
        </div>
        <button
          onClick={openAddModal}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Website Content</span>
        </button>
      </div>

      {/* Selector Tabs */}
      <div className="flex flex-wrap border-b border-white/10 bg-black text-xs font-semibold tracking-wider uppercase">
        <button onClick={() => setActiveTab('services')} className={`px-5 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'services' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <FolderOpen className="w-4 h-4" />
          <span>Services</span>
        </button>
        <button onClick={() => setActiveTab('faqs')} className={`px-5 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'faqs' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <HelpCircle className="w-4 h-4" />
          <span>FAQs</span>
        </button>
        <button onClick={() => setActiveTab('testimonials')} className={`px-5 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'testimonials' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <UserCheck className="w-4 h-4" />
          <span>Testimonials</span>
        </button>
        <button onClick={() => setActiveTab('caseStudies')} className={`px-5 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'caseStudies' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <Briefcase className="w-4 h-4" />
          <span>Case Studies</span>
        </button>
        <button onClick={() => setActiveTab('industries')} className={`px-5 py-4 flex items-center gap-2 border-b-2 transition ${activeTab === 'industries' ? 'border-white text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <Building className="w-4 h-4" />
          <span>Industries</span>
        </button>
      </div>

      {/* Listing Panel */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {activeTab === 'services' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Delivery Time</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Sort Order</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-light">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4 font-semibold text-white uppercase">{s.name}</td>
                    <td className="px-6 py-4">{s.deliveryTime}</td>
                    <td className="px-6 py-4 text-gray-300 max-w-sm normal-case truncate">{s.description}</td>
                    <td className="px-6 py-4 font-mono">{s.order}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(s)} className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-gray-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 border border-red-500/10 rounded hover:bg-red-950/20 text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Question</th>
                  <th className="px-6 py-4">Answer</th>
                  <th className="px-6 py-4">Sort Order</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-light">
                {faqs.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4 font-semibold text-white normal-case">{f.question}</td>
                    <td className="px-6 py-4 text-gray-300 max-w-md normal-case truncate">{f.answer}</td>
                    <td className="px-6 py-4 font-mono">{f.order}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(f)} className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-gray-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(f.id, f.question)} className="p-1.5 border border-red-500/10 rounded hover:bg-red-950/20 text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'testimonials' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Quote</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-light">
                {testimonials.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4 font-semibold text-white">{t.clientName}</td>
                    <td className="px-6 py-4 text-gray-300">{t.companyName}</td>
                    <td className="px-6 py-4 text-gray-400 max-w-sm normal-case truncate">"{t.quote}"</td>
                    <td className="px-6 py-4 font-mono text-amber-400">{t.rating} ★</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(t)} className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-gray-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(t.id, t.clientName)} className="p-1.5 border border-red-500/10 rounded hover:bg-red-950/20 text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'caseStudies' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Client / Org</th>
                  <th className="px-6 py-4">Sector</th>
                  <th className="px-6 py-4">Manual (Before)</th>
                  <th className="px-6 py-4">Automated (After)</th>
                  <th className="px-6 py-4">Expected Impact</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-light">
                {caseStudies.map(cs => (
                  <tr key={cs.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4 font-semibold text-white uppercase">{cs.client}</td>
                    <td className="px-6 py-4">{cs.industry}</td>
                    <td className="px-6 py-4 text-gray-400 normal-case">{cs.before}</td>
                    <td className="px-6 py-4 text-gray-300 normal-case">{cs.after}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold normal-case">{cs.result}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(cs)} className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-gray-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(cs.id, cs.client)} className="p-1.5 border border-red-500/10 rounded hover:bg-red-950/20 text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'industries' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Sector</th>
                  <th className="px-6 py-4">Bottleneck Leak</th>
                  <th className="px-6 py-4">Expected Impact (Value)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-light">
                {industries.map(ind => (
                  <tr key={ind.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4 font-semibold text-white uppercase">{ind.title}</td>
                    <td className="px-6 py-4 text-gray-300 max-w-sm normal-case truncate">{ind.leak}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400">{ind.metricPrefix}{ind.metricValue}{ind.metricSuffix}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(ind)} className="p-1.5 border border-white/10 rounded hover:bg-white/5 text-gray-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(ind.id, ind.title)} className="p-1.5 border border-red-500/10 rounded hover:bg-red-950/20 text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 z-10 shadow-2xl mx-4">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">CMS EDITOR</span>
                <h2 className="text-xl font-normal text-white uppercase mt-0.5">{editingItem ? 'Edit item' : 'Add content'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Forms based on Tab */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {activeTab === 'services' && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Service Name</label>
                    <input type="text" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white normal-case" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Category</label>
                      <input type="text" required value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white normal-case" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Delivery Time (e.g. 7 Days)</label>
                      <input type="text" required value={formData.deliveryTime || ''} onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white normal-case" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Description</label>
                    <textarea required rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white normal-case resize-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Sort Order</label>
                    <input type="number" required value={formData.order === undefined ? '' : formData.order} onChange={e => setFormData({ ...formData, order: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono" />
                  </div>
                </>
              )}

              {activeTab === 'faqs' && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Question</label>
                    <input type="text" required value={formData.question || ''} onChange={e => setFormData({ ...formData, question: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white normal-case" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Answer</label>
                    <textarea required rows={4} value={formData.answer || ''} onChange={e => setFormData({ ...formData, answer: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white normal-case resize-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Sort Order</label>
                    <input type="number" required value={formData.order === undefined ? '' : formData.order} onChange={e => setFormData({ ...formData, order: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                </>
              )}

              {activeTab === 'testimonials' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Client Name</label>
                      <input type="text" required value={formData.clientName || ''} onChange={e => setFormData({ ...formData, clientName: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Company</label>
                      <input type="text" required value={formData.companyName || ''} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Quote</label>
                    <textarea required rows={3} value={formData.quote || ''} onChange={e => setFormData({ ...formData, quote: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Rating (1-5)</label>
                      <input type="number" min="1" max="5" required value={formData.rating || 5} onChange={e => setFormData({ ...formData, rating: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Sort Order</label>
                      <input type="number" required value={formData.order === undefined ? '' : formData.order} onChange={e => setFormData({ ...formData, order: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'caseStudies' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Client / Org</label>
                      <input type="text" required value={formData.client || ''} onChange={e => setFormData({ ...formData, client: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Sector / Industry</label>
                      <input type="text" required value={formData.industry || ''} onChange={e => setFormData({ ...formData, industry: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Before (Manual)</label>
                      <input type="text" required value={formData.before || ''} onChange={e => setFormData({ ...formData, before: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">After (Automated)</label>
                      <input type="text" required value={formData.after || ''} onChange={e => setFormData({ ...formData, after: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Expected Result / Impact</label>
                    <input type="text" required value={formData.result || ''} onChange={e => setFormData({ ...formData, result: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Sort Order</label>
                    <input type="number" required value={formData.order === undefined ? '' : formData.order} onChange={e => setFormData({ ...formData, order: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                </>
              )}

              {activeTab === 'industries' && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Sector Title</label>
                    <input type="text" required value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Bottleneck / Leak description</label>
                    <textarea required rows={3} value={formData.leak || ''} onChange={e => setFormData({ ...formData, leak: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Metric Prefix</label>
                      <input type="text" value={formData.metricPrefix || ''} onChange={e => setFormData({ ...formData, metricPrefix: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" placeholder="E.g. +" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Metric Value</label>
                      <input type="number" required value={formData.metricValue === undefined ? '' : formData.metricValue} onChange={e => setFormData({ ...formData, metricValue: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" placeholder="E.g. 35" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 block mb-1">Metric Suffix</label>
                      <input type="text" required value={formData.metricSuffix || ''} onChange={e => setFormData({ ...formData, metricSuffix: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none normal-case" placeholder="E.g. % booked" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 block mb-1">Sort Order</label>
                    <input type="number" required value={formData.order === undefined ? '' : formData.order} onChange={e => setFormData({ ...formData, order: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-xs font-semibold tracking-wider text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition uppercase">Cancel</button>
                <button type="submit" className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-5 py-2.5 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Save Updates' : 'Add Content'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
