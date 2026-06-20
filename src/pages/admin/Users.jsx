import { triggerToast } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../utils/auditLogger';
import {
Users as UsersIcon, Plus, X, Shield, ShieldCheck, Trash2, Edit2, Key, Lock, Mail
} from 'lucide-react';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full system control, settings management, and deletions.' },
  { value: 'admin', label: 'Admin', desc: 'Can manage leads, clients, projects, services, and bookings.' },
  { value: 'manager', label: 'Manager', desc: 'Can review details and reschedule appointments.' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only clearance across the workspace.' }
];

export default function Users() {
  const { userRole, userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = userRole === 'super_admin';

  // Read admins/users
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching users:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!email || !displayName) return;

    setSaving(true);
    try {
      // Create user profile document in users collection
      const newUserDoc = await addDoc(collection(db, 'users'), {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        role: role,
        createdAt: serverTimestamp(),
        lastLogin: null
      });

      // Maintain admins collection copy for rules compatibility
      if (role === 'super_admin' || role === 'admin') {
        try {
          // Pre-emptively write to admins collection using document id
          // (when the user signs up/in, their uid will match, or we seed a custom doc)
          await addDoc(collection(db, 'admins'), {
            email: email.trim().toLowerCase(),
            role: role,
            seeded: true
          });
        } catch (adminErr) {
          console.error('Error writing to backup admins list:', adminErr);
        }
      }

      // Add audit notification
      await addDoc(collection(db, 'notifications'), {
        type: 'system',
        title: 'New Admin Member Invited',
        message: `${displayName} has been added as a ${role}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await logAuditAction(
        userProfile?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Created User`,
        'users',
        `Invited user ${displayName} (${email}) as ${role}`
      );

      setShowAddModal(false);
      setEmail('');
      setDisplayName('');
      setRole('viewer');
      triggerToast('User clearance document provisioned successfully!', 'success');
    } catch (err) {
      console.error('Error inviting user:', err);
      triggerToast('Failed to add user. Ensure correct Firestore permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        displayName: displayName.trim(),
        role: role
      });

      // Add system notification
      await addDoc(collection(db, 'notifications'), {
        type: 'system',
        title: 'Clearance Role Updated',
        message: `${displayName}'s role updated to ${role}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await logAuditAction(
        userProfile?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Updated User`,
        'users',
        `Modified clearances for ${displayName} (${selectedUser.email}) to ${role}`
      );

      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (usr) => {
    setSelectedUser(usr);
    setDisplayName(usr.displayName || '');
    setRole(usr.role || 'viewer');
    setShowEditModal(true);
  };

  const handleDeleteUser = async (usrId, usrEmail) => {
    if (usrEmail === 'kishorevarma2205@gmail.com') {
      triggerToast('Forbidden: Cannot remove the primary Super Admin profile.', 'error');
      return;
    }
    if (usrId === userProfile?.id) {
      triggerToast('Forbidden: Cannot remove your own active credentials.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to revoke clearances for ${usrEmail}?`)) return;

    try {
      await deleteDoc(doc(db, 'users', usrId));
      
      await logAuditAction(
        userProfile?.email || 'super_admin@autoscale.systems',
        userRole || 'super_admin',
        `Deleted User`,
        'users',
        `Revoked administrative credentials for ${usrEmail}`
      );
    } catch (err) {
      console.error('Error revoking user clearances:', err);
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
              Only the primary Super Admin (`kishorevarma2205@gmail.com`) can view user listings, register new administrators, revoke credentials, or adjust workspace clearances.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase">
            ADMIN SYSTEM
          </span>
          <h1 className="text-3xl font-normal tracking-tight text-white uppercase mt-1">
            USER MANAGEMENT
          </h1>
        </div>
        <button
          onClick={() => {
            setEmail('');
            setDisplayName('');
            setRole('viewer');
            setShowAddModal(true);
          }}
          className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg hover:bg-gray-100 transition duration-200 uppercase px-5 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-6 h-6 border-t border-r border-white rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-500 uppercase tracking-wider">
            No registered users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest text-gray-400 uppercase bg-white/[0.02]">
                  <th className="px-6 py-4">Display Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Role Clearance</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {users.map((usr) => (
                  <tr
                    key={usr.id}
                    className="hover:bg-white/[0.02] transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                      {usr.displayName}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-light font-mono text-xs">{usr.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded border uppercase flex items-center gap-1.5 w-fit ${
                        usr.role === 'super_admin' ? 'border-red-500/20 text-red-400 bg-red-950/10' :
                        usr.role === 'admin' ? 'border-amber-500/20 text-amber-400 bg-amber-950/10' :
                        usr.role === 'manager' ? 'border-blue-500/20 text-blue-400 bg-blue-950/10' :
                        'border-gray-500/20 text-gray-400 bg-gray-950/10'
                      }`}>
                        {usr.role === 'super_admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        {usr.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                      {usr.lastLogin?.toDate
                        ? usr.lastLogin.toDate().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(usr)}
                          className="w-7 h-7 rounded-full border border-white/5 text-gray-400 hover:text-white flex items-center justify-center transition"
                          title="Edit User Role"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr.id, usr.email)}
                          disabled={usr.email === 'kishorevarma2205@gmail.com' || usr.id === userProfile?.id}
                          className="w-7 h-7 rounded-full border border-red-500/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 flex items-center justify-center transition disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Revoke Clearances"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col p-6">
            <h3 className="text-base font-normal text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-400" />
              <span>Register System User</span>
            </h3>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Full Name *</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  placeholder="e.g. Kishore Varma"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                  placeholder="admin@autoscale.systems"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Clearance Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                  {ROLES.find(r => r.value === role)?.desc}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-100 transition px-5 py-2 disabled:opacity-50"
                >
                  {saving ? 'Inviting...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }} />
          <div className="relative w-full max-w-md bg-black border border-white/10 rounded-xl shadow-2xl z-10 flex flex-col p-6">
            <h3 className="text-base font-normal text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-gray-400" />
              <span>Edit User Clearance</span>
            </h3>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">User Email</label>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400 font-mono flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {selectedUser?.email}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Display Name *</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white normal-case"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Clearance Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                  {ROLES.find(r => r.value === role)?.desc}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 border border-white/10 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-100 transition px-5 py-2 disabled:opacity-50"
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
