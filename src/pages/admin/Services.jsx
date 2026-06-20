import { triggerToast } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
Search, X, Plus, Star, Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Edit3
} from 'lucide-react';

const CATEGORIES = [
  'AI Agents',
  'WhatsApp Automation',
  'Lead Generation',
  'CRM Automation',
  'Customer Support',
  'Appointment Booking',
  'Custom Systems'
];

const EMPTY_SERVICE = {
  name: '',
  category: '',
  description: '',
  price: '',
  deliveryTime: '',
  isFeatured: false,
  isVisible: true
};

export default function Services() {
  const { user: authUser, userRole } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_SERVICE });
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';
  const isAdminOrSuper = userRole === 'super_admin' || userRole === 'admin';

  // Sync services by order, falling back to name
  useEffect(() => {
    const unsubServices = onSnapshot(
      query(collection(db, 'services'), orderBy('order', 'asc')),
      (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (docs.some(d => d.order === undefined)) {
          docs = docs.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
        }
        setServices(docs);
        setLoading(false);
      }
    );
    return () => unsubServices();
  }, []);

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'services'), {
        ...formData,
        price: Number(formData.price) || 0,
        order: services.length,
        createdAt: serverTimestamp()
      });
      setFormData({ ...EMPTY_SERVICE });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating service:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditService = async (e) => {
    e.preventDefault();
    if (!selectedService || !formData.name.trim() || !formData.category) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'services', selectedService.id), {
        ...formData,
        price: Number(formData.price) || 0
      });
      setShowEditModal(false);
      setSelectedService(null);
    } catch (err) {
      console.error('Error editing service:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name || '',
      category: service.category || '',
      description: service.description || '',
      price: service.price || '',
      deliveryTime: service.deliveryTime || '',
      isFeatured: !!service.isFeatured,
      isVisible: !!service.isVisible
    });
    setShowEditModal(true);
  };

  const handleToggleVisibility = async (serviceId, currentVisible) => {
    try {
      await updateDoc(doc(db, 'services', serviceId), {
        isVisible: !currentVisible
      });
    } catch (err) {
      console.error('Error toggling visibility:', err);
    }
  };

  const handleToggleFeatured = async (serviceId, currentFeatured) => {
    try {
      await updateDoc(doc(db, 'services', serviceId), {
        isFeatured: !currentFeatured
      });
    } catch (err) {
      console.error('Error toggling featured status:', err);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!isSuperAdmin) {
      triggerToast('Access Denied: Only Super Admin can delete records.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteDoc(doc(db, 'services', serviceId));
    } catch (err) {
      console.error('Error deleting service:', err);
    }
  };

  const handleReorder = async (index, direction) => {
    if (!isAdminOrSuper) {
      triggerToast('Access Denied: Only Admins can reorder services.', 'error');
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    const currentService = services[index];
    const swapService = services[newIndex];

    const currentOrder = currentService.order !== undefined ? currentService.order : index;
    const swapOrder = swapService.order !== undefined ? swapService.order : newIndex;

    try {
      await updateDoc(doc(db, 'services', currentService.id), { order: swapOrder });
      await updateDoc(doc(db, 'services', swapService.id), { order: currentOrder });
    } catch (err) {
      console.error('Error reordering services:', err);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₹0';
    return '₹' + Number(value).toLocaleString('en-IN');
  };

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            SERVICE DEPLOYMENT
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            AUTOMATION CATALOG
          </h1>
        </div>
        <button
          onClick={() => {
            setFormData({ ...EMPTY_SERVICE });
            setShowCreateModal(true);
          }}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Services Catalog */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
          No services defined in the catalog yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <div
              key={service.id}
              className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between relative overflow-hidden"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)' }}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    {service.category}
                  </span>
                  
                  {/* Action controls */}
                  <div className="flex items-center gap-1">
                    
                    {/* Reorder actions */}
                    {isAdminOrSuper && (
                      <div className="flex items-center border border-white/5 rounded-full mr-2">
                        <button
                          onClick={() => handleReorder(idx, 'up')}
                          disabled={idx === 0}
                          className="w-5 h-5 text-gray-500 hover:text-white flex items-center justify-center disabled:opacity-25"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleReorder(idx, 'down')}
                          disabled={idx === services.length - 1}
                          className="w-5 h-5 text-gray-500 hover:text-white flex items-center justify-center disabled:opacity-25"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleToggleFeatured(service.id, service.isFeatured)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition border ${
                        service.isFeatured
                          ? 'border-yellow-500/20 text-yellow-400 bg-yellow-950/10'
                          : 'border-white/5 text-gray-600 hover:text-white'
                      }`}
                      title="Feature Service"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(service.id, service.isVisible)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition border ${
                        service.isVisible
                          ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10'
                          : 'border-white/5 text-gray-600 hover:text-white'
                      }`}
                      title="Toggle Visibility"
                    >
                      {service.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => openEditModal(service)}
                      className="w-6 h-6 rounded-full border border-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                      title="Edit Service"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${isSuperAdmin ? 'border-red-500/20 text-red-400 hover:bg-red-950/20' : 'border-white/5 text-gray-600 cursor-not-allowed'}`}
                      title={isSuperAdmin ? "Delete Service" : "Super Admin Clearance Required"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white uppercase tracking-tight">{service.name}</h3>
                  <p className="text-xs text-gray-400 font-light mt-1.5 leading-relaxed line-clamp-3 normal-case">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-end justify-between">
                <div>
                  <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase">Delivery Window</span>
                  <p className="text-xs font-mono text-white mt-0.5">{service.deliveryTime || 'TBD'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold tracking-wider text-gray-500 uppercase">Base Rate</span>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">{formatCurrency(service.price)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">New Service</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">ADD SERVICE</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Delivery Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2-3 Weeks, 30 Days"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Description *</label>
                <textarea
                  required
                  rows="4"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case resize-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="accent-white cursor-pointer w-4 h-4 bg-black border border-white/10 rounded"
                  />
                  <span>Featured Service</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                    className="accent-white cursor-pointer w-4 h-4 bg-black border border-white/10 rounded"
                  />
                  <span>Visible on Catalog</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowEditModal(false);
              setSelectedService(null);
            }}
          />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Update Record</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">EDIT SERVICE</h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedService(null);
                }}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditService} className="p-6 space-y-5 overflow-y-auto no-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Delivery Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2-3 Weeks, 30 Days"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Description *</label>
                <textarea
                  required
                  rows="4"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case resize-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="accent-white cursor-pointer w-4 h-4 bg-black border border-white/10 rounded"
                  />
                  <span>Featured Service</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                    className="accent-white cursor-pointer w-4 h-4 bg-black border border-white/10 rounded"
                  />
                  <span>Visible on Catalog</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedService(null);
                  }}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition uppercase px-6 py-2.5 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
