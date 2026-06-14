import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthDebug from './components/AuthDebug';

// Light Core Components (Static)
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ClientProtectedRoute from './components/ClientProtectedRoute';
import LeadFormModal from './components/LeadFormModal';
import TargetCursor from './components/cursor/TargetCursor';
import Footer from './components/Footer';
import Toast from './components/ui/Toast';

// Lazy Public Components
const Hero = React.lazy(() => import('./components/Hero'));
const Section2 = React.lazy(() => import('./components/Section2'));
const RevenueLeakMap = React.lazy(() => import('./components/RevenueLeakMap'));
const IndustrySolutions = React.lazy(() => import('./components/IndustrySolutions'));
const SolutionsLibrary = React.lazy(() => import('./components/SolutionsLibrary'));
const CaseStudies = React.lazy(() => import('./components/CaseStudies'));
const ROICalculator = React.lazy(() => import('./components/ROICalculator'));
const Timeline = React.lazy(() => import('./components/Timeline'));
const Testimonials = React.lazy(() => import('./components/Testimonials'));
const FAQs = React.lazy(() => import('./components/FAQs'));
const CTA = React.lazy(() => import('./components/CTA'));

// Lazy Admin Layout / Setup Components
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const AdminLogin = React.lazy(() => import('./components/admin/AdminLogin'));
const DashboardOverview = React.lazy(() => import('./components/admin/DashboardOverview'));
const LeadsList = React.lazy(() => import('./components/admin/LeadsList'));
const AnalyticsDashboard = React.lazy(() => import('./components/admin/AnalyticsDashboard'));
const AdminSettings = React.lazy(() => import('./components/admin/AdminSettings'));
const PipelineBoard = React.lazy(() => import('./components/admin/PipelineBoard'));

// Lazy Admin Pages
const Clients = React.lazy(() => import('./pages/admin/Clients'));
const Projects = React.lazy(() => import('./pages/admin/Projects'));
const Services = React.lazy(() => import('./pages/admin/Services'));
const Bookings = React.lazy(() => import('./pages/admin/Bookings'));
const ContactForms = React.lazy(() => import('./pages/admin/ContactForms'));
const Users = React.lazy(() => import('./pages/admin/Users'));
const NotificationsPage = React.lazy(() => import('./pages/admin/NotificationsPage'));
const Team = React.lazy(() => import('./pages/admin/Team'));
const Invoices = React.lazy(() => import('./pages/admin/Invoices'));
const Tasks = React.lazy(() => import('./pages/admin/Tasks'));
const AIAudit = React.lazy(() => import('./pages/admin/AIAudit'));
const ProposalGenerator = React.lazy(() => import('./pages/admin/ProposalGenerator'));
const CommunicationHub = React.lazy(() => import('./pages/admin/CommunicationHub'));
const WebsiteCMS = React.lazy(() => import('./pages/admin/WebsiteCMS'));

// Lazy Client Pages
const ClientLogin = React.lazy(() => import('./pages/client/ClientLogin'));
const ClientDashboard = React.lazy(() => import('./pages/client/ClientDashboard'));

// Sleek loading fallback for code-split lazy loading
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-[2px] border-[#5E0ED7]/30 border-t-[#5E0ED7] rounded-full animate-spin" />
      <span className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase animate-pulse">
        Initializing Autoscale...
      </span>
    </div>
  );
}

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

      {/* 7a. Client Testimonials Carousel */}
      <Testimonials />

      {/* 7b. Common Queries FAQ Grid */}
      <FAQs />

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
  const [isVideoInit, setIsVideoInit] = useState(false);
  const { user, isAdmin, userRole, loading: authLoading } = useAuth();

  // Defer background video load until after first paint
  useEffect(() => {
    setIsVideoInit(true);
  }, []);

  // Control playback based on page visibility to optimize resource usage
  useEffect(() => {
    if (!isVideoInit) return;
    const video = videoRef.current;
    if (!video) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(err => console.warn('Play interrupted on tab reveal:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial play attempt
    if (!document.hidden) {
      video.play().catch(err => console.warn('Background video play failed:', err));
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVideoInit]);

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
      {/* Global Video Background with visibility control and poster fallback */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-black">
        {isVideoInit && (
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="metadata"
            poster="/assets/background-poster.webp"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.28 }}
          >
            <source src="/silk-1781249661241.webm" type="video/webm" />
          </video>
        )}
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
        <Suspense fallback={<LoadingFallback />}>
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
              <Route path="pipeline" element={<PipelineBoard />} />
              <Route path="leads" element={<LeadsList />} />
              <Route path="audit" element={<AIAudit />} />
              <Route path="proposals" element={<ProposalGenerator />} />
              <Route path="clients" element={<Clients />} />
              <Route path="projects" element={<Projects />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="team" element={<Team />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="communication" element={<CommunicationHub />} />
              <Route path="cms" element={<WebsiteCMS />} />
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
        </Suspense>
      </div>

      {/* STEP 6: Dev-only Debug Panel */}
      {import.meta.env.DEV && <AuthDebug />}

      {/* Global Toast Notifier */}
      <Toast />
    </div>
  );
}
