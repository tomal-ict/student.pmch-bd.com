import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ResultLookup from './components/ResultLookup';
import AdmissionForm from './components/AdmissionForm';
import StudentRegister from './components/StudentRegister';
import StudentPortal from './components/StudentPortal';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/AdminLayout';
import api from './services/api';
import { DEFAULT_SESSIONS, DEFAULT_ACTIVITIES } from './utils/constants';

function MainApp() {
  const { isAuthenticated } = useAuth();
  
  // Check if current URL requests secret admin access
  const checkIsAdminRoute = () => {
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    const search = window.location.search || '';
    return hash.includes('myadmin') || path.includes('myadmin') || search.includes('myadmin') || window.__IS_ADMIN__ === true;
  };

  // Map any url alias to standard tab identifier
  const normalizeTab = (raw) => {
    if (!raw) return null;
    const clean = raw.toLowerCase().trim();
    if (['lookup', 'register', 'admission', 'student_portal'].includes(clean)) {
      return clean;
    }
    if (clean === 'result' || clean === 'results') return 'lookup';
    if (clean === 'registration') return 'register';
    if (clean === 'admission-form' || clean === 'admissions') return 'admission';
    if (clean === 'student_login' || clean === 'student-login' || clean === 'login' || clean === 'portal') return 'student_portal';
    return null;
  };

  // Determine initial active tab based on URL hash, query param, or localStorage
  const getInitialTab = () => {
    // 1. URL Hash
    const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim();
    const hashTab = normalizeTab(rawHash);
    if (hashTab) return hashTab;

    // 2. URL Query Param
    try {
      const urlParams = new URLSearchParams(window.location.search || '');
      const tabParam = normalizeTab(urlParams.get('tab') || urlParams.get('page'));
      if (tabParam) return tabParam;
    } catch {}

    // 3. Saved localStorage preference
    try {
      const saved = normalizeTab(localStorage.getItem('portal_active_tab'));
      if (saved) return saved;
    } catch {}

    return 'lookup';
  };

  const [isAdminView, setIsAdminView] = useState(checkIsAdminRoute);
  const [activeTab, setActiveTab] = useState(getInitialTab);

  const [publicData, setPublicData] = useState({
    settings: {
      site_header: 'Popular Medical College',
      landing_subtitle: 'Academic & Examination Result Portal - Estd. 2010',
      student_registration_enabled: true,
      student_lookup_enabled: true,
    },
    sessions: DEFAULT_SESSIONS,
    activities: DEFAULT_ACTIVITIES,
  });

  const fetchPublicSettings = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.success) {
        setPublicData((prev) => ({
          ...prev,
          settings: res.data.settings || prev.settings,
          sessions: (res.data.sessions && res.data.sessions.length > 0) ? res.data.sessions : prev.sessions,
          activities: (res.data.activities && res.data.activities.length > 0) ? res.data.activities : prev.activities,
        }));
      }
    } catch (e) {
      console.error('Failed to load public settings', e);
    }
  };

  const handleTabChange = (newTab) => {
    const valid = normalizeTab(newTab) || 'lookup';
    setActiveTab(valid);
    try {
      localStorage.setItem('portal_active_tab', valid);
    } catch {}
    if (!isAdminView) {
      // Keep hash in browser URL so refresh / sharing always lands on the exact page
      window.location.hash = valid;
    }
  };

  useEffect(() => {
    fetchPublicSettings();

    // Sync initial active tab to URL hash if empty
    if (!isAdminView && !window.location.hash) {
      window.location.hash = activeTab;
    }

    // Listen for hash changes or browser back/forward buttons
    const handleUrlChange = () => {
      const isAdmin = checkIsAdminRoute();
      setIsAdminView(isAdmin);
      if (!isAdmin) {
        const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim();
        const matched = normalizeTab(rawHash);
        if (matched) {
          setActiveTab(matched);
          try {
            localStorage.setItem('portal_active_tab', matched);
          } catch {}
        }
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleBackToPublic = () => {
    window.location.hash = 'lookup';
    if (window.location.pathname.includes('myadmin')) {
      const cleanPath = window.location.pathname.replace(/\/myadmin.*$/i, '') || '/';
      window.history.pushState(null, '', cleanPath);
    }
    setIsAdminView(false);
    handleTabChange('lookup');
  };

  // If in Secret Admin mode (/myadmin)
  if (isAdminView) {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-900 to-[#0e1638] flex flex-col justify-between">
          <div className="p-4 flex items-center justify-between max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <img src="./logo.png" alt="Popular Medical College" className="w-12 h-12 object-contain" />
              <div>
                <span className="font-bold text-white tracking-tight block">Popular Medical College</span>
                <span className="text-xs text-emerald-400">Institutional Administration Terminal</span>
              </div>
            </div>
            <button
              onClick={handleBackToPublic}
              className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              &larr; Public Portal
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <AdminLogin onSuccess={() => setIsAdminView(true)} />
          </div>

          <footer className="py-4 text-center text-xs text-slate-400">
            Popular Medical College &middot; Restricted Access Environment
          </footer>
        </div>
      );
    }

    return (
      <AdminLayout
        onBackToPublic={handleBackToPublic}
        onSettingsUpdated={fetchPublicSettings}
      />
    );
  }

  // Public View: NO admin button visible
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      <div>
        <Navbar activeTab={activeTab} setActiveTab={handleTabChange} settings={publicData.settings} />

        <main className="pb-16">
          {activeTab === 'lookup' && <ResultLookup />}
          {activeTab === 'admission' && (
            <AdmissionForm
              sessions={publicData.sessions}
              activities={publicData.activities}
            />
          )}
          {activeTab === 'register' && (
            <StudentRegister sessions={publicData.sessions} />
          )}
          {activeTab === 'student_portal' && (
            <StudentPortal sessions={publicData.sessions} />
          )}
        </main>
      </div>

      <Footer settings={publicData.settings} />
    </div>
  );
}

function Footer({ settings }) {
  return (
    <footer className="bg-white border-t border-emerald-100 py-10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src="./logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-bold text-base text-[#1e2d7d]">
                {settings?.site_header || 'Popular Medical College'}
              </span>
              <span className="text-xs text-slate-500 block">Dhaka, Bangladesh &middot; Established in 2010</span>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            &copy; {new Date().getFullYear()} {settings?.site_header || 'Popular Medical College'}. All rights reserved.
          </div>
          <div className="text-slate-400 font-medium text-center sm:text-right">
            Developer by :{' '}
            <a
              href="https://tomal-ict.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-emerald-700 font-semibold no-underline transition-colors cursor-pointer"
            >
              Tomal Krishna Howlader
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
