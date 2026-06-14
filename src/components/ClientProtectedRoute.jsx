import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ClientProtectedRoute({ children }) {
  const { user, userRole, loading } = useAuth();

  console.log("[ClientProtectedRoute] Check — loading:", loading, "user:", user?.email || "null", "userRole:", userRole);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-t border-r border-white animate-spin" />
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            Verifying Portal Clearance...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[ClientProtectedRoute] No user — redirecting to /client/login");
    return <Navigate to="/client/login" replace />;
  }

  if (userRole !== 'client') {
    console.log("[ClientProtectedRoute] User is logged in but role is not client — redirecting to /client/login");
    return <Navigate to="/client/login" replace />;
  }

  console.log("[ClientProtectedRoute] Access GRANTED for", user?.email, "role:", userRole);
  return children;
}
