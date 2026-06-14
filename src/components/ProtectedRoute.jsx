import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAdmin, userRole, loading } = useAuth();

  console.log("[ProtectedRoute] Check — loading:", loading, "user:", user?.email || "null", "isAdmin:", isAdmin, "userRole:", userRole);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-t border-r border-white animate-spin" />
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            Verifying Credentials...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user — redirecting to /admin/login");
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    console.log("[ProtectedRoute] User exists but isAdmin=false — redirecting to /admin/login");
    // Redirect to login, NOT to "/" — if they're not admin they should see the login page
    // not be silently dumped on the landing page
    return <Navigate to="/admin/login" replace />;
  }

  // Role-based check if requiredRole is specified
  if (requiredRole) {
    const ROLE_HIERARCHY = {
      super_admin: 4,
      admin: 3,
      manager: 2,
      viewer: 1
    };

    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    const currentLevel = ROLE_HIERARCHY[userRole] || 0;

    if (currentLevel < requiredLevel) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold tracking-[0.25em] text-gray-500 uppercase mb-2">
                Access Denied
              </p>
              <p className="text-sm text-gray-400">
                You don't have permission to access this area.
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="bg-white text-black text-xs font-semibold tracking-wider rounded-lg px-6 py-2.5 hover:bg-gray-100 transition duration-200 uppercase"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  console.log("[ProtectedRoute] Access GRANTED for", user?.email, "role:", userRole);
  return children;
}
