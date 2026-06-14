import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationCenter from './NotificationCenter';
import {
  LayoutDashboard, Users, BarChart3, Settings, LogOut, Menu, X, Bell,
  Building2, FolderKanban, Package, Calendar, Inbox, UsersRound, Lock,
  CheckSquare, FileText
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard },
  { name: 'Leads', path: '/admin/leads', icon: Users },
  { name: 'Clients', path: '/admin/clients', icon: Building2 },
  { name: 'Projects', path: '/admin/projects', icon: FolderKanban },
  { name: 'Tasks', path: '/admin/tasks', icon: CheckSquare },
  { name: 'Team', path: '/admin/team', icon: UsersRound },
  { name: 'Invoices', path: '/admin/invoices', icon: FileText },
  { name: 'Services', path: '/admin/services', icon: Package },
  { name: 'Bookings', path: '/admin/bookings', icon: Calendar },
  { name: 'Contact Forms', path: '/admin/contact-forms', icon: Inbox },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Users', path: '/admin/users', icon: UsersRound, restricted: true },
  { name: 'Notifications', path: '/admin/notifications', icon: Bell },
  { name: 'Settings', path: '/admin/settings', icon: Settings, restricted: true },
];

export default function AdminLayout() {
  const { logout, user, userRole } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const displayRole = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    viewer: 'Viewer'
  }[userRole] || 'Viewer';

  const isSuperAdmin = userRole === 'super_admin';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const renderNavItem = (item, onClickExtra) => {
    const Icon = item.icon;
    const isRestrictedAndLocked = item.restricted && !isSuperAdmin;

    return (
      <NavLink
        key={item.name}
        to={item.path}
        onClick={onClickExtra}
        className={({ isActive }) =>
          `flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
            isActive
              ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`
        }
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 stroke-[2]" />
          <span>{item.name}</span>
        </div>
        {isRestrictedAndLocked && (
          <Lock className="w-3.5 h-3.5 text-gray-600" />
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 bg-black/60 backdrop-blur-md z-30 flex-shrink-0">
        <div className="p-6 pb-0 mb-6">
          <span className="text-sm font-bold tracking-[0.25em] text-gray-500 block">SYSTEM WORKSPACE</span>
          <span className="text-xl font-semibold tracking-tight text-white uppercase mt-1 block">AUTOSCALE</span>
        </div>

        <nav className="flex-1 flex flex-col overflow-y-auto px-3 pb-4 gap-0.5">
          <span className="text-[8px] font-bold tracking-[0.2em] text-gray-600 uppercase px-4 mb-2 block">
            Navigation Menu
          </span>
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        <div className="border-t border-white/10 p-6 flex flex-col gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Logged in as</span>
            <span className="text-xs text-white truncate font-mono mt-0.5">{user?.email || 'admin@autoscale'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Role Clearance</span>
            <span className="text-xs text-white font-mono mt-0.5 uppercase tracking-wide">{displayRole}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-200 w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header / Nav Drawer */}
      <div className="lg:hidden fixed top-0 left-0 w-full border-b border-white/10 bg-black/80 backdrop-blur-md z-40 px-6 py-4 flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight text-white uppercase">AUTOSCALE ADMIN</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-white/5 transition"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#5E0ED7] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white hover:text-gray-300 focus:outline-none"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <nav className="relative w-64 bg-black border-r border-white/10 h-full flex flex-col z-10 pt-24 overflow-y-auto">
            <div className="flex-1 flex flex-col px-3 gap-0.5">
              <span className="text-[8px] font-bold tracking-[0.2em] text-gray-600 uppercase px-4 mb-2 block">
                Navigation Menu
              </span>
              {navItems.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
            </div>
            <div className="border-t border-white/10 p-6 flex flex-col gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Logged in as</span>
                <span className="text-xs text-gray-400 truncate font-mono mt-0.5">{user?.email}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Role Clearance</span>
                <span className="text-xs text-white font-mono mt-0.5 uppercase tracking-wide">{displayRole}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase text-red-400 hover:bg-red-950/20 w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Viewport Dashboard Content */}
      <main className="flex-grow flex flex-col min-h-screen pt-20 lg:pt-0 overflow-y-auto z-10 relative">
        <div className="p-6 md:p-10 max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {/* Top bar with notification bell (desktop) */}
          <div className="hidden lg:flex items-center justify-end mb-6 gap-4">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-white/5 transition"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#5E0ED7] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <Outlet />
        </div>
      </main>

      {/* Notification Center Slide-over */}
      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}
