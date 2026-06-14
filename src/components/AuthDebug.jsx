import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

export default function AuthDebug() {
  const [visible, setVisible] = useState(false);
  const { user, isAdmin, userRole, loading: authLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle debug panel on Shift + Cmd + D or Shift + Ctrl + D
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 10,
        fontFamily: 'monospace',
        color: '#aaa',
        lineHeight: 1.6,
        maxWidth: 280,
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#666', fontWeight: 'bold', marginBottom: 2 }}>AUTH DEBUG</div>
      <div>User: <span style={{ color: user ? '#4ade80' : '#f87171' }}>{user?.email || 'null'}</span></div>
      <div>Role: <span style={{ color: '#60a5fa' }}>{userRole || 'null'}</span></div>
      <div>isAdmin: <span style={{ color: isAdmin ? '#4ade80' : '#f87171' }}>{String(isAdmin)}</span></div>
      <div>Loading: <span style={{ color: authLoading ? '#facc15' : '#4ade80' }}>{String(authLoading)}</span></div>
      <div>Route: <span style={{ color: '#c084fc' }}>{location.pathname}</span></div>
    </div>
  );
}
