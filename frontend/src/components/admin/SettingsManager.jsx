import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Shield, 
  MessageSquare, 
  Send, 
  Radio, 
  Sliders, 
  GraduationCap, 
  Calendar, 
  Layers, 
  Award,
  BookOpen,
  RotateCcw,
  Save,
  PlusCircle,
  Edit2,
  Check,
  Database
} from 'lucide-react';
import api from '../../services/api';
import DataSyncManager from './DataSyncManager';

const PROF_CURRICULUM = [
  {
    stage: '1st Professional',
    total_marks: 1300,
    subjects: [
      { name: 'Anatomy', full: 500 },
      { name: 'Physiology', full: 400 },
      { name: 'Biochemistry', full: 400 },
    ]
  },
  {
    stage: '2nd Professional',
    total_marks: 600,
    subjects: [
      { name: 'Community Medicine', full: 300 },
      { name: 'Forensic Medicine', full: 300 },
    ]
  },
  {
    stage: '3rd Professional',
    total_marks: 600,
    subjects: [
      { name: 'Pharmacology & Therapeutics', full: 300 },
      { name: 'Pathology & Microbiology', full: 300 },
    ]
  },
  {
    stage: 'Final Professional',
    total_marks: 1500,
    subjects: [
      { name: 'Medicine', full: 500 },
      { name: 'Surgery', full: 500 },
      { name: 'Obstetrics & Gynaecology', full: 500 },
    ]
  },
];

export default function SettingsManager({ activeTab = 'general', onTabChange, onSettingsUpdated }) {
  const currentTab = activeTab || 'general';

  const [settings, setSettings] = useState({
    site_header: '',
    landing_subtitle: '',
    student_registration_enabled: true,
    student_lookup_enabled: true,
  });

  const [smsSettings, setSmsSettings] = useState({
    sms_enabled: true,
    sms_gateway_url: 'https://smpp.revesms.com:7790/sendtext',
    sms_api_key: 'da897b03922028b9',
    sms_secret_key: '3de63a78',
    sms_caller_id: 'POPULAR DCL',
  });

  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newSession, setNewSession] = useState('');
  const [newActivity, setNewActivity] = useState('');

  // MBBS 4-Professional Examination Curriculum State
  const [curriculum, setCurriculum] = useState(PROF_CURRICULUM);
  const [curriculumSaving, setCurriculumSaving] = useState(false);
  const [curriculumSaved, setCurriculumSaved] = useState(false);
  const [newSubjectInputs, setNewSubjectInputs] = useState({});
  const [editingKey, setEditingKey] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings({
          site_header: res.data.settings.site_header || '',
          landing_subtitle: res.data.settings.landing_subtitle || '',
          student_registration_enabled: res.data.settings.student_registration_enabled === '1',
          student_lookup_enabled: res.data.settings.student_lookup_enabled === '1',
        });

        setSmsSettings({
          sms_enabled: res.data.settings.sms_enabled !== '0',
          sms_gateway_url: res.data.settings.sms_gateway_url || 'https://smpp.revesms.com:7790/sendtext',
          sms_api_key: res.data.settings.sms_api_key || 'da897b03922028b9',
          sms_secret_key: res.data.settings.sms_secret_key || '3de63a78',
          sms_caller_id: res.data.settings.sms_caller_id || 'POPULAR DCL',
        });

        setSessions(res.data.sessions || []);
        setActivities(res.data.activities || []);

        if (res.data.prof_curriculum && res.data.prof_curriculum.length > 0) {
          setCurriculum(res.data.prof_curriculum);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddSubjectToProf = (stageName) => {
    const input = newSubjectInputs[stageName];
    if (!input || !input.name?.trim()) {
      alert('অনুগ্রহ করে সাবজেক্টের নাম লিখুন। (Please enter subject name)');
      return;
    }

    const fullMarks = Number(input.full) > 0 ? Number(input.full) : 100;
    const subjectName = input.name.trim();

    setCurriculum((prev) =>
      prev.map((prof) => {
        if (prof.stage !== stageName) return prof;
        const exists = prof.subjects.some(
          (s) => s.name.toLowerCase() === subjectName.toLowerCase()
        );
        if (exists) {
          alert(`Subject "${subjectName}" already exists in ${stageName}.`);
          return prof;
        }

        const updatedSubjects = [...prof.subjects, { name: subjectName, full: fullMarks }];
        const newTotal = updatedSubjects.reduce((sum, s) => sum + Number(s.full || 0), 0);

        return {
          ...prof,
          total_marks: newTotal,
          subjects: updatedSubjects,
        };
      })
    );

    setNewSubjectInputs((prev) => ({
      ...prev,
      [stageName]: { name: '', full: 300 }
    }));
  };

  const handleUpdateSubjectName = (stageName, subjectIdx, newName) => {
    setCurriculum((prev) =>
      prev.map((prof) => {
        if (prof.stage !== stageName) return prof;
        const updatedSubjects = prof.subjects.map((sub, idx) =>
          idx === subjectIdx ? { ...sub, name: newName } : sub
        );
        return {
          ...prof,
          subjects: updatedSubjects,
        };
      })
    );
  };

  const handleUpdateSubjectMarks = (stageName, subjectIdx, newMarks) => {
    const parsed = Number(newMarks) || 0;
    setCurriculum((prev) =>
      prev.map((prof) => {
        if (prof.stage !== stageName) return prof;
        const updatedSubjects = prof.subjects.map((sub, idx) =>
          idx === subjectIdx ? { ...sub, full: parsed } : sub
        );
        const newTotal = updatedSubjects.reduce((sum, s) => sum + Number(s.full || 0), 0);
        return {
          ...prof,
          total_marks: newTotal,
          subjects: updatedSubjects,
        };
      })
    );
  };

  const handleSaveCurriculum = async () => {
    setCurriculumSaving(true);
    setCurriculumSaved(false);
    try {
      const res = await api.post('/settings/curriculum', { curriculum });
      if (res.data.success) {
        setCurriculumSaved(true);
        setTimeout(() => setCurriculumSaved(false), 4000);
        onSettingsUpdated?.();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save curriculum');
    } finally {
      setCurriculumSaving(false);
    }
  };

  const handleResetCurriculum = () => {
    if (!window.confirm('Reset examination matrix to default BM&DC curriculum structure?')) return;
    setCurriculum(PROF_CURRICULUM);
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await api.post('/settings/update', {
        site_header: settings.site_header,
        landing_subtitle: settings.landing_subtitle,
        student_registration_enabled: settings.student_registration_enabled ? 1 : 0,
        student_lookup_enabled: settings.student_lookup_enabled ? 1 : 0,
      });

      if (res.data.success) {
        setSaveSuccess(true);
        if (onSettingsUpdated) onSettingsUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update general settings');
    }
  };

  const handleSaveSms = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await api.post('/settings/update', {
        sms_enabled: smsSettings.sms_enabled ? 1 : 0,
        sms_gateway_url: smsSettings.sms_gateway_url,
        sms_api_key: smsSettings.sms_api_key,
        sms_secret_key: smsSettings.sms_secret_key,
        sms_caller_id: smsSettings.sms_caller_id,
      });

      if (res.data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update SMS Gateway settings');
    }
  };

  const handleTestSms = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await api.post('/settings/test-sms', { phone: testPhone.trim() });
      setTestResult({
        success: res.data.success,
        message: res.data.message,
        details: res.data.details?.response || res.data.details?.error,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Error executing test SMS',
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!newSession.trim()) return;
    try {
      const res = await api.post('/settings/sessions', { session_name: newSession.trim() });
      if (res.data.success) {
        setNewSession('');
        fetchSettings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding session');
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this academic session?')) return;
    try {
      await api.delete(`/settings/sessions/${id}`);
      fetchSettings();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.trim()) return;
    try {
      const res = await api.post('/settings/activities', { activity_name: newActivity.trim() });
      if (res.data.success) {
        setNewActivity('');
        fetchSettings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding activity');
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Delete this activity entry?')) return;
    try {
      await api.delete(`/settings/activities/${id}`);
      fetchSettings();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const switchTab = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration & Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage general institutional identity, REVE SMS Gateway integration, and admission sessions & exam curriculum.
        </p>
      </div>

      {/* Top Sub-Tab Navigation Pills */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-2xl shadow-2xs gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => switchTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'general'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>General Settings</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('sms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'sms'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS Gateway Settings</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('academic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'academic'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Admission Session & Exam Setup</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('datasync')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'datasync'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data Synchronize</span>
        </button>
      </div>

      {/* Global Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GENERAL SETTINGS TAB                                                   */}
      {/* ========================================================================= */}
      {currentTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Institutional Identity & Public Services</h3>
              <p className="text-xs text-slate-500">Configure portal headers, branding text, and public module access.</p>
            </div>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Sliders className="w-5 h-5" />
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Institutional Header / College Title
              </label>
              <input
                type="text"
                value={settings.site_header}
                onChange={(e) => setSettings({ ...settings, site_header: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Portal Subtitle / Accreditation Line
              </label>
              <input
                type="text"
                value={settings.landing_subtitle}
                onChange={(e) => setSettings({ ...settings, landing_subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <span className="block text-xs font-bold uppercase text-slate-700">Public Service Toggles</span>
            
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={settings.student_lookup_enabled}
                onChange={(e) => setSettings({ ...settings, student_lookup_enabled: e.target.checked })}
                className="rounded text-emerald-600 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Enable Public Student Result Verification
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Allows students to verify official marksheets online with 2-Factor SMS OTP authentication.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={settings.student_registration_enabled}
                onChange={(e) => setSettings({ ...settings, student_registration_enabled: e.target.checked })}
                className="rounded text-emerald-600 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Enable Online Student Self-Registration
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Allows newly enrolled candidates to submit their basic student profile online.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
            >
              Save General Settings
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 2. SMS GATEWAY SETTINGS TAB                                               */}
      {/* ========================================================================= */}
      {currentTab === 'sms' && (
        <div className="space-y-6 animate-in fade-in">
          <form onSubmit={handleSaveSms} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">REVE SMS Gateway Configuration</h3>
                  <p className="text-xs text-slate-500">Credentials for sending OTP verification messages to students.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={smsSettings.sms_enabled}
                  onChange={(e) => setSmsSettings({ ...smsSettings, sms_enabled: e.target.checked })}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Gateway Active</span>
              </label>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
              <span className="font-bold block mb-1">Standard SMS OTP Message Template:</span>
              <code className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-mono text-emerald-800 font-bold block">
                Welcome to Popular Medical College. Your OTP: [OTP_NUMBER]
              </code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Gateway Endpoint URL</label>
                <input
                  type="text"
                  required
                  value={smsSettings.sms_gateway_url}
                  onChange={(e) => setSmsSettings({ ...smsSettings, sms_gateway_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Caller ID / Sender Masking</label>
                <input
                  type="text"
                  required
                  value={smsSettings.sms_caller_id}
                  onChange={(e) => setSmsSettings({ ...smsSettings, sms_caller_id: e.target.value })}
                  placeholder="e.g. POPULAR DCL"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">API Key</label>
                <input
                  type="text"
                  required
                  value={smsSettings.sms_api_key}
                  onChange={(e) => setSmsSettings({ ...smsSettings, sms_api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Secret Key</label>
                <input
                  type="password"
                  required
                  value={smsSettings.sms_secret_key}
                  onChange={(e) => setSmsSettings({ ...smsSettings, sms_secret_key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
              >
                Save SMS Gateway Configuration
              </button>
            </div>
          </form>

          {/* Live Test SMS Delivery Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Send className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Live Test SMS Delivery</h3>
            </div>
            <p className="text-xs text-slate-500">
              Enter any mobile phone number to test connectivity with REVE SMS gateway and verify caller ID delivery.
            </p>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">{testResult.message}</span>
                  {testResult.details && <span className="font-mono text-[11px] block mt-0.5">{testResult.details}</span>}
                </div>
              </div>
            )}

            <form onSubmit={handleTestSms} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="e.g. 01720331586"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={testSending || !testPhone.trim()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {testSending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test SMS</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ADMISSION SESSIONS & EXAM SETUP TAB                                    */}
      {/* ========================================================================= */}
      {currentTab === 'academic' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Top Overview Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Admission Sessions & Examination Curriculum</h3>
              <p className="text-xs text-slate-500">
                Manage candidate admission session cohorts and University of Dhaka MBBS 4-Professional Examination stages.
              </p>
            </div>
            {sessions.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                Current Active: {sessions[0]?.session_name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Part 1: Academic / Admission Sessions */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Admission Sessions</h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {sessions.length} Recorded
                </span>
              </div>

              <form onSubmit={handleAddSession} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 2027-2028"
                  value={newSession}
                  onChange={(e) => setNewSession(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Add Session
                </button>
              </form>

              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {sessions.map((s, idx) => (
                  <div 
                    key={s.id} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      idx === 0
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{s.session_name}</span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                          Current Year
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Part 2: Extracurricular Activities */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">Extracurricular Activities</h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {activities.length} Recorded
                </span>
              </div>

              <form onSubmit={handleAddActivity} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Photography Club"
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Add
                </button>
              </form>

              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-800">{act.activity_name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(act.id)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                      title="Delete Activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Part 3: Professional Examination Stages & Subjects Matrix */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    MBBS 4-Professional Examination Stages & Marks Matrix
                  </h4>
                  <p className="text-xs text-slate-500">
                    এখানে প্রতিটি প্রফে নতুন সাবজেক্ট ও মার্ক যোগ করা বা পরিবর্তন করা যাবে। পরিবর্তিত সাবজেক্ট স্বয়ংক্রিয়ভাবে রেজাল্ট এন্ট্রি ফর্মে চলে আসবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCurriculum}
                  disabled={curriculumSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {curriculumSaving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Curriculum</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCurriculum}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset to default official curriculum"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Data Integrity Protection Notice */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">ডাটা ও রেজাল্ট সুরক্ষা (Data Integrity):</span>
                <span>
                  পূর্ববর্তী শিক্ষার্থীদের রেজাল্ট ও মার্কশিটের তথ্যের সুরক্ষার্থে কোনো সাবজেক্ট ডিলিট করার সুযোগ রাখা হয়নি। প্রয়োজন অনুযায়ী যেকোনো সাবজেক্টের নাম বা পূর্ণমান (Marks) এডিট করতে পারবেন এবং নতুন সাবজেক্ট যোগ করতে পারবেন।
                </span>
              </div>
            </div>

            {curriculumSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>সবগুলো প্রফের সাবজেক্ট ও ফুল মার্কস সফলভাবে সেভ হয়েছে! পরিবর্তিত সাবজেক্ট এখন রেজাল্ট এন্ট্রিতে শো করবে।</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {curriculum.map((prof) => (
                <div key={prof.stage} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="font-extrabold text-xs text-[#1e2d7d]">{prof.stage}</span>
                      <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-emerald-700">
                        Total: {prof.total_marks} M
                      </span>
                    </div>

                    {/* Subjects List */}
                    <div className="mt-3 space-y-2">
                      {prof.subjects.map((sub, sIdx) => {
                        const isEditing = editingKey === `${prof.stage}_${sIdx}`;

                        return isEditing ? (
                          <div key={sIdx} className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-300 space-y-2 shadow-2xs animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                <Edit2 className="w-3 h-3 text-emerald-600" />
                                Edit Subject
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingKey(null)}
                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-200"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                Done
                              </button>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Subject Name</label>
                              <input
                                type="text"
                                value={sub.name}
                                onChange={(e) => handleUpdateSubjectName(prof.stage, sIdx, e.target.value)}
                                className="w-full text-xs font-bold text-slate-900 px-2 py-1 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                                placeholder="Subject name"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Full Marks</label>
                              <input
                                type="number"
                                value={sub.full}
                                onChange={(e) => handleUpdateSubjectMarks(prof.stage, sIdx, e.target.value)}
                                className="w-full text-xs font-mono font-bold text-slate-900 px-2 py-1 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                                placeholder="Full Marks"
                              />
                            </div>
                          </div>
                        ) : (
                          <div key={sIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs hover:border-emerald-300 transition-colors">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800 block truncate" title={sub.name}>
                                {sub.name}
                              </span>
                              <span className="text-[11px] font-mono font-semibold text-emerald-700 block">
                                {sub.full} Marks
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingKey(`${prof.stage}_${sIdx}`)}
                              className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                              title="Edit this subject"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Subject to this Prof */}
                  <div className="pt-3 border-t border-slate-200 mt-2">
                    <span className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                      + Add New Subject (নতুন বিষয় যোগ)
                    </span>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Subject Name (e.g. Ophthalmology)"
                        value={newSubjectInputs[prof.stage]?.name || ''}
                        onChange={(e) =>
                          setNewSubjectInputs((prev) => ({
                            ...prev,
                            [prof.stage]: {
                              ...prev[prof.stage],
                              name: e.target.value,
                              full: prev[prof.stage]?.full || 300,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Marks"
                          value={newSubjectInputs[prof.stage]?.full ?? 300}
                          onChange={(e) =>
                            setNewSubjectInputs((prev) => ({
                              ...prev,
                              [prof.stage]: {
                                ...prev[prof.stage],
                                name: prev[prof.stage]?.name || '',
                                full: e.target.value,
                              },
                            }))
                          }
                          className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          title="Full marks"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSubjectToProf(prof.stage)}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB 4: DATA BACKUP & SYNCHRONIZE ==================== */}
      {currentTab === 'datasync' && <DataSyncManager />}

    </div>
  );
}
