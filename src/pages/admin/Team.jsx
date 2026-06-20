import { triggerToast } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import {
Search, X, Plus, User, Mail, Shield, Trash2, Calendar, Lock, Briefcase, Power, CheckCircle
} from 'lucide-react';

const ROLES = ['Founder', 'Manager', 'Developer', 'Designer', 'Automation Engineer'];
const DEPARTMENTS = ['Management', 'Development', 'Sales', 'Engineering', 'Design'];

const ROLE_COLORS = {
  Founder: 'border-red-500/20 text-red-400 bg-red-950/10',
  Manager: 'border-purple-500/20 text-purple-400 bg-purple-950/10',
  Developer: 'border-blue-500/20 text-blue-400 bg-blue-950/10',
  Designer: 'border-pink-500/20 text-pink-400 bg-pink-950/10',
  'Automation Engineer': 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
};

const EMPTY_MEMBER = {
  name: '',
  email: '',
  role: 'Developer',
  department: 'Development',
  status: 'Active',
};

export default function Team() {
  const { user: authUser, userRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_MEMBER });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = userRole === 'super_admin';

  // Sync team members and auto-seed if empty
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'team'), orderBy('name', 'asc')),
      async (snapshot) => {
        if (snapshot.empty) {
          console.log('[Team] team collection is empty. Seeding defaults...');
          const defaults = [
            { name: "Kishore Varma", email: "kishorevarma2205@gmail.com", role: "Founder", department: "Management", status: "Active", lastLogin: null, joinedAt: new Date(2026, 0, 1).toISOString().split('T')[0] },
            { name: "Priya Nair", email: "priya@autoscale.systems", role: "Automation Engineer", department: "Engineering", status: "Active", lastLogin: null, joinedAt: new Date(2026, 1, 15).toISOString().split('T')[0] },
            { name: "Amit Patel", email: "amit@autoscale.systems", role: "Developer", department: "Development", status: "Active", lastLogin: null, joinedAt: new Date(2026, 2, 10).toISOString().split('T')[0] }
          ];

          for (const d of defaults) {
            try {
              await addDoc(collection(db, 'team'), {
                ...d,
                createdAt: serverTimestamp()
              });
            } catch (err) {
              console.error('Error seeding default team member:', err);
            }
          }
        } else {
          setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to team:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'team'), {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        lastLogin: null,
        joinedAt: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      await logAuditAction(
        authUser?.email || 'admin@autoscale.systems',
        userRole || 'admin',
        'Added Team Member',
        'team',
        docRef.id,
        `Added team member "${formData.name.trim()}" in ${formData.department} as a ${formData.role}`
      );

      setFormData({ ...EMPTY_MEMBER });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating member:', err);
    }
    setSaving(false);
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!isSuperAdmin) {
      triggerToast('Access Denied: Only Super Admin can change clearances.', 'error');
      return;
    }
    try {
      const target = members.find(m => m.id === memberId);
      await updateDoc(doc(db, 'team', memberId), { role: newRole });

      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Changed Team Member Role',
        'team',
        memberId,
        `Updated role of "${target?.name || memberId}" to "${newRole}"`
      );
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleDepartmentChange = async (memberId, newDept) => {
    if (!isSuperAdmin) {
      triggerToast('Access Denied: Only Super Admin can change clearances.', 'error');
      return;
    }
    try {
      const target = members.find(m => m.id === memberId);
      await updateDoc(doc(db, 'team', memberId), { department: newDept });

      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Changed Team Member Dept',
        'team',
        memberId,
        `Updated department of "${target?.name || memberId}" to "${newDept}"`
      );
    } catch (err) {
      console.error('Error updating department:', err);
    }
  };

  const handleToggleSuspension = async (memberId) => {
    if (!isSuperAdmin) {
      triggerToast('Access Denied: Only Super Admin can suspend team members.', 'error');
      return;
    }
    try {
      const target = members.find(m => m.id === memberId);
      if (!target) return;

      const newStatus = target.status === 'Suspended' ? 'Active' : 'Suspended';
      await updateDoc(doc(db, 'team', memberId), { status: newStatus });

      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Toggled Team Member Suspension',
        'team',
        memberId,
        `Updated suspension status of "${target.name}" to "${newStatus}"`
      );
    } catch (err) {
      console.error('Error toggling suspension:', err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!isSuperAdmin) {
      triggerToast('Access Denied: Only Super Admin can remove team members.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this team member?')) return;
    try {
      const target = members.find(m => m.id === memberId);
      await deleteDoc(doc(db, 'team', memberId));

      await logAuditAction(
        authUser?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        'Deleted Team Member',
        'team',
        memberId,
        `Removed team member "${target?.name || memberId}"`
      );
    } catch (err) {
      console.error('Error deleting member:', err);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            OPERATIONS CONTROL
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            TEAM COMMAND
          </h1>
        </div>
        {isSuperAdmin ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        ) : (
          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 border border-white/5 bg-white/[0.01] rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Super Admin Required to Invite</span>
          </div>
        )}
      </div>

      {/* Search Filter */}
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white transition duration-200 normal-case"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No team members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">SaaS Clearance Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Joined Date</th>
                  {isSuperAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredMembers.map(member => (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition duration-150">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xs font-semibold">
                        {member.name ? member.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                      </div>
                      <span>{member.name || 'Anonymous'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{member.email}</td>
                    <td className="px-6 py-4">
                      {isSuperAdmin ? (
                        <select
                          value={member.department || 'Development'}
                          onChange={(e) => handleDepartmentChange(member.id, e.target.value)}
                          className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-300">{member.department || 'Development'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isSuperAdmin ? (
                        <select
                          value={member.role || 'Developer'}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="bg-black border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase ${ROLE_COLORS[member.role] || 'border-white/10 text-gray-300'}`}>
                          {member.role || 'Developer'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border uppercase ${
                        member.status === 'Active' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10' : 'border-rose-500/20 text-rose-400 bg-rose-950/10'
                      }`}>
                        {member.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                      {member.joinedAt || '—'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleSuspension(member.id)}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center transition ${
                              member.status === 'Suspended' 
                                ? 'border-emerald-500/20 hover:bg-emerald-950/20 text-emerald-400' 
                                : 'border-rose-500/20 hover:bg-rose-950/20 text-rose-400'
                            }`}
                            title={member.status === 'Suspended' ? 'Activate User' : 'Suspend User'}
                          >
                            {member.status === 'Suspended' ? <CheckCircle className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="w-7 h-7 rounded-full border border-red-500/20 hover:bg-red-950/20 text-red-400 hover:text-red-300 flex items-center justify-center transition"
                            title="Remove User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">New Member</span>
                <h2 className="text-xl font-normal text-white uppercase mt-1">ADD TEAM MEMBER</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-6 space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Role Access Level</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
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
                  {saving ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
