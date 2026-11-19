import React from 'react';
import { BookOpen, UserPlus, FileText, CheckCircle2, LogIn, GraduationCap } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, settings }) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40 shadow-xs no-print">
      {/* Top Emerald Accent Ribbon */}
      <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-[#1e2d7d]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand with Official Logo */}
          <div 
            onClick={() => setActiveTab('lookup')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="relative">
              <img 
                src="./logo.png" 
                alt="Popular Medical College" 
                className="w-13 h-13 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/student_potal/frontend/dist/logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-[#1e2d7d] tracking-tight block leading-tight">
                  {settings?.site_header || 'Popular Medical College'}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Estd. 2010
                </span>
              </div>
              <span className="text-xs font-medium text-emerald-700 block mt-0.5">
                {settings?.landing_subtitle || 'Academic & Examination Result Portal'}
              </span>
            </div>
          </div>

          {/* Navigation Links (Strictly Public - NO Admin Login Button) */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'lookup'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Result Verification
            </button>

            {settings?.student_registration_enabled && (
              <button
                onClick={() => setActiveTab('register')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Student Registration
              </button>
            )}

            <button
              onClick={() => setActiveTab('admission')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admission'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70'
              }`}
            >
              <FileText className="w-4 h-4" />
              Admission Form
            </button>

            <button
              onClick={() => setActiveTab('student_portal')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'student_portal'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student Login
            </button>
          </nav>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto py-2.5 gap-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('lookup')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'lookup' ? 'bg-emerald-600 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Result Verification
          </button>
          {settings?.student_registration_enabled && (
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-700 bg-slate-100'
              }`}
            >
              Registration
            </button>
          )}
          <button
            onClick={() => setActiveTab('admission')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'admission' ? 'bg-emerald-600 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Admission Form
          </button>
          <button
            onClick={() => setActiveTab('student_portal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'student_portal' ? 'bg-emerald-600 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Student Login
          </button>
        </div>
      </div>
    </header>
  );
}
