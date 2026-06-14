import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthDebug from './components/AuthDebug';

// Public Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Section2 from './components/Section2';
import RevenueLeakMap from './components/RevenueLeakMap';
import IndustrySolutions from './components/IndustrySolutions';
import SolutionsLibrary from './components/SolutionsLibrary';
import CaseStudies from './components/CaseStudies';
import ROICalculator from './components/ROICalculator';
import Timeline from './components/Timeline';
import CTA from './components/CTA';
import Footer from './components/Footer';
import LeadFormModal from './components/LeadFormModal';
import TargetCursor from './components/cursor/TargetCursor';

// Admin Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './components/admin/AdminLogin';
import DashboardOverview from './components/admin/DashboardOverview';
import LeadsList from './components/admin/LeadsList';
import AnalyticsDashboard from './components/admin/AnalyticsDashboard';
import AdminSettings from './components/admin/AdminSettings';

// New Admin Pages
import Clients from './pages/admin/Clients';
import Projects from './pages/admin/Projects';
import Services from './pages/admin/Services';
import Bookings from './pages/admin/Bookings';
import ContactForms from './pages/admin/ContactForms';
import Users from './pages/admin/Users';
import NotificationsPage from './pages/admin/NotificationsPage';
import Team from './pages/admin/Team';
import Invoices from './pages/admin/Invoices';
import Tasks from './pages/admin/Tasks';

// Client Portal Pages
import ClientProtectedRoute from './components/ClientProtectedRoute';
import ClientLogin from './pages/client/ClientLogin';
import ClientDashboard from './pages/client/ClientDashboard';

// Public Homepage Sub-Layout
function PublicHome() {
  return (
    <div className="relative min-h-screen text-white selection:bg-white selection:text-black overflow-x-hidden bg-transparent">
      {/* Target Cursor */}
      <TargetCursor spinDuration={2} hideDefaultCursor={true} />

      {/* Global Grain/Noise Overlay */}
      <div className="noise-overlay" />

      {/* Layer 4: Large Blurred Ambient Glows */}
      <div className="ambient-glow-1 absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="ambient-glow-2 absolute right-1/4 top-1/3 translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* 1. Pill Topbar Navigation */}
      <Navbar />

      {/* 2. Hero */}
      <Hero />

      {/* 2a. Section 2: Service Orbit */}
      <Section2 />

      {/* 2b. Revenue Leak Map (Flowchart & Fixes) */}
      <RevenueLeakMap />

      {/* 3. Business Systems (AI Agents, WhatsApp, Lead Gen, Support, Automation, Custom Systems) */}
      <SolutionsLibrary />

      {/* 4. Industries Section (Healthcare, Real Estate, Education, Ecommerce, Agencies, Legal) */}
      <IndustrySolutions />

      {/* 5. Case Studies */}
      <CaseStudies />

      {/* 6. Timeline framework (5 steps: Audit, Design, Build, Deploy, Optimize) */}
      <Timeline />

      {/* 7. Dedicated ROI Calculator */}
      <ROICalculator />

      {/* 8. Final CTA Banner */}
      <CTA />

      {/* 9. Footer Links & Copyrights */}
      <Footer />

      {/* 10. Floating Lead Capture Modal overlay */}
      <LeadFormModal />
    </div>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay prevented or failed:', err);
      }
    };
    playVideo();
  }, []);

  // STEP 5: Global keyboard shortcut — works from ANY page
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        console.log('[App] Shortcut triggered — navigating to /admin/login');
        navigate('/admin/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="relative min-h-screen text-white selection:bg-white selection:text-black overflow-x-hidden bg-transparent">
      {/* Global Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.28 }}
        >
          <source src="/silk-1781249661241.webm" type="video/webm" />
        </video>
      </div>

      {/* Global Dark Overlay */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none" 
        style={{ background: 'rgba(0, 0, 0, 0.60)' }}
      />

      {/* Global Blueprint Grid Overlay */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          opacity: 0.05,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Website Content */}
      <div className="relative z-10">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Client Portal Routes */}
          <Route path="/client/login" element={<ClientLogin />} />
          <Route 
            path="/client/dashboard" 
            element={
              <ClientProtectedRoute>
                <ClientDashboard />
              </ClientProtectedRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="dashboard" element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="leads" element={<LeadsList />} />
            <Route path="clients" element={<Clients />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="team" element={<Team />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="services" element={<Services />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="contact-forms" element={<ContactForms />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Fallback Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* STEP 6: Dev-only Debug Panel */}
      {import.meta.env.DEV && <AuthDebug />}
    </div>
  );
}
