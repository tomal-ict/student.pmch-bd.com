import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  FileText, 
  BarChart3, 
  UserCog, 
  Settings, 
  LogOut, 
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Sliders,
  MessageSquare,
  GraduationCap,
  ImageDown,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import StudentsManager from './admin/StudentsManager';
import ResultsManager from './admin/ResultsManager';
import AdmissionsManager from './admin/AdmissionsManager';
import PhotoDownloadManager from './admin/PhotoDownloadManager';
import ReportsManager from './admin/ReportsManager';
import UsersManager from './admin/UsersManager';
import SettingsManager from './admin/SettingsManager';

export default function AdminLayout({ onBackToPublic, onSettingsUpdated }) {
  const { user, logout, hasPermission } = useAuth();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('general'); // 'general' | 'sms' | 'academic'
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Records', icon: Users, perm: 'students.view' },
    { id: 'results', label: 'Exam Results', icon: Award, perm: 'results.view' },
    { id: 'admissions', label: 'Admissions', icon: FileText, perm: 'admissions.view' },
    { id: 'photos', label: 'Photo Download', icon: ImageDown, perm: 'admissions.view' },
    { id: 'reports', label: 'Reports & Export', icon: BarChart3, perm: 'reports.view' },
    { id: 'users', label: 'Staff Accounts', icon: UserCog, perm: 'users.manage' },
  ].filter((item) => !item.perm || hasPermission(item.perm));

  const hasSettingsPerm = hasPermission('settings.manage');

  const settingsSubItems = [
    { id: 'general', label: 'General Settings', icon: Sliders },
    { id: 'sms', label: 'SMS Gateway Settings', icon: MessageSquare },
    { id: 'academic', label: 'Admission Session & Exam', icon: GraduationCap },
    { id: 'datasync', label: 'Data Synchronize', icon: Database },
  ];

  const handleSettingsMainClick = () => {
    setIsSettingsExpanded((prev) => !prev);
    setCurrentSection('settings');
  };

  const handleSubTabClick = (tabId) => {
    setSettingsTab(tabId);
    setCurrentSection('settings');
    setIsSettingsExpanded(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col md:flex-row">
      {/* Sidebar with Medical Theme */}
      <aside className="w-full md:w-64 bg-[#121c52] text-white shrink-0 p-4 md:min-h-screen flex flex-col justify-between no-print">
        <div>
          {/* Top Brand with Logo */}
          <div className="pb-6 border-b border-indigo-950/80">
            <button
              onClick={onBackToPublic}
              className="flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Portal</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center shadow-md">
                <img 
                  src="./logo.png" 
                  alt="Popular Medical College" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/student_potal/logo.png'; }}
                />
              </div>
              <div className="truncate">
                <span className="font-extrabold text-sm tracking-tight block truncate">Popular Med College</span>
                <span className="text-[11px] text-emerald-400 font-mono capitalize">
                  {user?.role_name?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 space-y-1.5">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentSection(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* System Settings Expandable Menu with Dropdown Button */}
            {hasSettingsPerm && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSettingsMainClick}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentSection === 'settings'
                      ? 'bg-emerald-700/80 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span>System Settings</span>
                  </div>
                  {isSettingsExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-300 transition-transform" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                  )}
                </button>

                {/* Sub-Items Dropdown Accordion */}
                {isSettingsExpanded && (
                  <div className="mt-1 pl-4 space-y-1 border-l-2 border-emerald-500/30 ml-4 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {settingsSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = currentSection === 'settings' && settingsTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSubTabClick(sub.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <SubIcon className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Footer User Profile */}
        <div className="pt-6 border-t border-indigo-950/80 mt-6">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <span className="text-xs font-bold text-slate-200 block truncate">{user?.display_name || user?.username}</span>
              <span className="text-[11px] font-mono text-slate-400 block truncate">@{user?.username}</span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0 print:max-w-none print:w-full">
        {currentSection === 'dashboard' && <AdminDashboard onNavigate={setCurrentSection} />}
        {currentSection === 'students' && <StudentsManager />}
        {currentSection === 'results' && <ResultsManager />}
        {currentSection === 'admissions' && <AdmissionsManager />}
        {currentSection === 'photos' && <PhotoDownloadManager />}
        {currentSection === 'reports' && <ReportsManager />}
        {currentSection === 'users' && <UsersManager />}
        {currentSection === 'settings' && (
          <SettingsManager 
            activeTab={settingsTab} 
            onTabChange={setSettingsTab} 
            onSettingsUpdated={onSettingsUpdated} 
          />
        )}
      </main>
    </div>
  );
}
