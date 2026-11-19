import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Award,
  Calendar,
  Printer,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  X,
  FileText,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import api from '../services/api';
import { DEFAULT_SESSIONS } from '../utils/constants';

const DEFAULT_SUBJECTS = {
  '1st Professional': [
    { subject_name: 'Anatomy', full_marks: 500, obtained_marks: '' },
    { subject_name: 'Physiology', full_marks: 400, obtained_marks: '' },
    { subject_name: 'Biochemistry', full_marks: 400, obtained_marks: '' },
  ],
  '2nd Professional': [
    { subject_name: 'Community Medicine', full_marks: 300, obtained_marks: '' },
    { subject_name: 'Forensic Medicine', full_marks: 300, obtained_marks: '' },
  ],
  '3rd Professional': [
    { subject_name: 'Pharmacology & Therapeutics', full_marks: 300, obtained_marks: '' },
    { subject_name: 'Pathology & Microbiology', full_marks: 300, obtained_marks: '' },
  ],
  'Final Professional': [
    { subject_name: 'Medicine', full_marks: 500, obtained_marks: '' },
    { subject_name: 'Surgery', full_marks: 500, obtained_marks: '' },
    { subject_name: 'Obstetrics & Gynaecology', full_marks: 500, obtained_marks: '' },
  ],
};

const PROF_STAGES = [
  '1st Professional',
  '2nd Professional',
  '3rd Professional',
  'Final Professional'
];

export default function StudentPortal({ sessions = [] }) {
  const availableSessions = (sessions && sessions.length > 0) ? sessions : DEFAULT_SESSIONS;

  // Auth state
  const [studentToken, setStudentToken] = useState(() => localStorage.getItem('student_token'));
  const [student, setStudent] = useState(() => {
    try {
      const saved = localStorage.getItem('student_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [regNo, setRegNo] = useState('');
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [timer, setTimer] = useState(0);

  // Forgot phone modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotSession, setForgotSession] = useState((sessions && sessions[0]) || DEFAULT_SESSIONS[0] || '2026-2027');
  const [phoneHint, setPhoneHint] = useState(null);
  const [phoneHintStudent, setPhoneHintStudent] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  // Portal tab: 'entry' (Record Result) | 'history' (My Exam Records)
  const [portalTab, setPortalTab] = useState('entry');

  // Dynamic Curriculum from settings
  const [curriculumMap, setCurriculumMap] = useState(DEFAULT_SUBJECTS);

  // Result entry form state
  const [entryData, setEntryData] = useState({
    exam_type: '1st Professional',
    exam_month: 'May',
    exam_year: String(new Date().getFullYear()),
    roll_no: '',
    grand_total: '',
    result_status: 'Passed',
    failed_subjects: '',
    remarks: '',
    marks: DEFAULT_SUBJECTS['1st Professional'],
  });
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState(null);
  const [entrySuccess, setEntrySuccess] = useState(null);

  // Fetch dynamic curriculum
  const fetchCurriculum = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.success && res.data.prof_curriculum) {
        const map = {};
        res.data.prof_curriculum.forEach((prof) => {
          map[prof.stage] = (prof.subjects || []).map((sub) => ({
            subject_name: sub.name,
            full_marks: Number(sub.full) || 100,
            obtained_marks: '',
          }));
        });
        setCurriculumMap((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      console.error('Failed to load curriculum', e);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  // Sync profile when token is present
  useEffect(() => {
    if (studentToken) {
      api.get('/student/profile')
        .then((res) => {
          if (res.data.success && res.data.student) {
            setStudent(res.data.student);
            localStorage.setItem('student_user', JSON.stringify(res.data.student));
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [studentToken]);

  // Setup initial eligible prof for logged in student
  useEffect(() => {
    if (student) {
      const existing = student.exam_results || [];
      const passedStages = existing
        .filter((e) => e.result_status === 'Passed')
        .map((e) => e.exam_type);

      const firstEligible = PROF_STAGES.find((s) => !passedStages.includes(s)) || '1st Professional';
      const subjects = (curriculumMap[firstEligible] || DEFAULT_SUBJECTS[firstEligible] || []).map((s) => ({
        ...s,
        obtained_marks: '',
      }));

      setEntryData((prev) => ({
        ...prev,
        exam_type: firstEligible,
        marks: subjects,
      }));
    }
  }, [student, curriculumMap]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // ==================== AUTH ACTIONS ====================

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!regNo.trim() || !phone.trim()) {
      setLoginError('অনুগ্রহ করে রেজিস্ট্রেশন নম্বর ও ফোন নম্বর সঠিকভাবে দিন।');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await api.post('/student-auth/request-otp', {
        reg_no: regNo.trim(),
        phone: phone.trim(),
      });

      if (res.data.success) {
        setOtpStep(true);
        setMaskedPhone(res.data.phone_masked || phone);
        setTimer(res.data.expires_in_seconds || 300);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। সঠিক তথ্য প্রদান করুন।');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setLoginError('অনুগ্রহ করে সঠিক ওটিপি কোডটি লিখুন।');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await api.post('/student-auth/verify-otp', {
        reg_no: regNo.trim(),
        phone: phone.trim(),
        otp_code: otpCode.trim(),
      });

      if (res.data.success && res.data.token) {
        localStorage.setItem('student_token', res.data.token);
        localStorage.setItem('student_user', JSON.stringify(res.data.student));
        setStudentToken(res.data.token);
        setStudent(res.data.student);
        setOtpStep(false);
        setOtpCode('');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'ওটিপি যাচাইকরণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/student/logout');
    } catch {
      // Ignore
    }
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    setStudentToken(null);
    setStudent(null);
    setOtpStep(false);
    setOtpCode('');
    setRegNo('');
    setPhone('');
  };

  // ==================== FORGOT PHONE HINT ====================

  const handleFetchPhoneHint = async (e) => {
    e.preventDefault();
    if (!regNo.trim()) {
      setForgotError('Please enter your Registration Number first.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setPhoneHint(null);
    setPhoneHintStudent(null);

    try {
      const res = await api.post('/students/phone-hint', {
        reg_no: regNo.trim(),
        session_name: forgotSession || availableSessions[0] || '',
      });

      if (res.data.success) {
        setPhoneHint(res.data.masked_phone || res.data.phone_masked);
        setPhoneHintStudent(res.data.student_name || null);
      }
    } catch (err) {
      setForgotError(
        err.response?.data?.message ||
          'No registered phone number found for this Registration Number and Session.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // ==================== RESULT ENTRY ACTIONS ====================

  const handleExamTypeChange = (newType) => {
    const subjects = (curriculumMap[newType] || DEFAULT_SUBJECTS[newType] || [
      { subject_name: '', full_marks: 100, obtained_marks: '' }
    ]).map((s) => ({ ...s, obtained_marks: '' }));

    setEntryData((prev) => ({
      ...prev,
      exam_type: newType,
      marks: subjects,
      grand_total: '',
      failed_subjects: '',
      result_status: 'Passed',
    }));
  };

  const handleMarkChange = (index, field, value) => {
    const updated = [...entryData.marks];
    updated[index][field] = value;

    // Calculate sum of obtained marks
    let sum = 0;
    let anyMarks = false;
    let failedCount = 0;
    const failedNames = [];

    updated.forEach((m) => {
      const obt = Number(m.obtained_marks);
      const full = Number(m.full_marks) || 100;
      if (m.obtained_marks !== '' && m.obtained_marks !== null && !isNaN(obt)) {
        sum += obt;
        anyMarks = true;
        // Standard medical pass threshold: 60%
        if (obt < full * 0.6) {
          failedCount++;
          failedNames.push(m.subject_name);
        }
      }
    });

    let autoStatus = 'Passed';
    if (failedCount > 0) {
      autoStatus = failedCount >= 2 ? 'Failed' : 'Referred';
    }

    setEntryData({
      ...entryData,
      marks: updated,
      grand_total: anyMarks ? String(sum) : '',
      result_status: autoStatus,
      failed_subjects: failedNames.join(', '),
    });
  };

  const addExtraSubject = () => {
    setEntryData({
      ...entryData,
      marks: [
        ...entryData.marks,
        { subject_name: '', full_marks: 100, obtained_marks: '' }
      ]
    });
  };

  const removeSubjectRow = (index) => {
    setEntryData({
      ...entryData,
      marks: entryData.marks.filter((_, idx) => idx !== index)
    });
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    setEntryLoading(true);
    setEntryError(null);
    setEntrySuccess(null);

    // Validate marks: at least one obtained mark entered
    const hasAnyMarks = entryData.marks.some((m) => m.obtained_marks !== '' && m.obtained_marks !== null);
    if (!hasAnyMarks) {
      setEntryError('অনুগ্রহ করে অন্তত একটি বিষয়ের প্রাপ্ত নম্বর (Obtained Marks) ইনপুট দিন।');
      setEntryLoading(false);
      return;
    }

    try {
      const res = await api.post('/student/results', {
        ...entryData,
        grand_total: entryData.grand_total ? Number(entryData.grand_total) : null,
      });

      if (res.data.success) {
        setEntrySuccess('আপনার পরীক্ষার রেজাল্ট সফলভাবে এন্ট্রি হয়েছে!');
        if (res.data.student) {
          setStudent(res.data.student);
          localStorage.setItem('student_user', JSON.stringify(res.data.student));
        }
        // Switch to history tab after 2 seconds
        setTimeout(() => {
          setPortalTab('history');
          setEntrySuccess(null);
        }, 1800);
      }
    } catch (err) {
      setEntryError(err.response?.data?.message || 'রেজাল্ট সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setEntryLoading(false);
    }
  };

  // Helper: check which exam stages student has already PASSED
  const passedStages = (student?.exam_results || [])
    .filter((e) => e.result_status === 'Passed')
    .map((e) => e.exam_type);

  // ==================== RENDER: NOT LOGGED IN ====================

  if (!studentToken || !student) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Student Self-Service Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e2d7d] tracking-tight">
              Student Portal Login
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Enter your Registration Number and Mobile Number to log in via OTP verification.
            </p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">লগইন ত্রুটি:</span>
                <span>{loginError}</span>
              </div>
            </div>
          )}

          {!otpStep ? (
            /* Step 1: Registration No & Phone */
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Student Registration Number (রেজিস্ট্রেশন নম্বর) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. 10095"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mobile Phone Number (মোবাইল নম্বর) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  নিবন্ধিত মোবাইল নম্বরে এসএমএস গেটওয়ের মাধ্যমে ওটিপি কোড পাঠানো হবে।
                </span>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loginLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Login OTP / ওটিপি পাঠান</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotError(null);
                    setPhoneHint(null);
                    setPhoneHintStudent(null);
                    if (!forgotSession && availableSessions.length > 0) {
                      setForgotSession(availableSessions[0]);
                    }
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Forget Your Number?</span>
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: OTP Verification */
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <span className="font-bold block mb-1">ওটিপি পাঠানো হয়েছে:</span>
                <span>
                  আপনার নিবন্ধিত মোবাইল নম্বর <strong>{maskedPhone}</strong>-এ ৬ সংখ্যার ভেরিফিকেশন ওটিপি পাঠানো হয়েছে।
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Enter 6-Digit OTP Code (ওটিপি কোড) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 font-mono text-center tracking-[0.5em] text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {timer > 0 ? (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      মেয়াদ শেষ: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-red-500 font-semibold">ওটিপির মেয়াদ শেষ হয়েছে</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={timer > 0 || loginLoading}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Resend OTP / পুনরায় পাঠান
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOtpStep(false)}
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loginLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Verify & Login / লগইন করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Forgot Phone Hint Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Forget Your Number? (Phone Hint)</span>
                </h3>
                <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Enter your Registration Number and Academic Session to view the first 3 and last 3 digits of your registered mobile number.
              </p>

              <form onSubmit={handleFetchPhoneHint} className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Registration No</label>
                  <input
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="e.g. 10095"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Academic Session</label>
                  <select
                    value={forgotSession}
                    onChange={(e) => setForgotSession(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-semibold"
                  >
                    {availableSessions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {forgotError && (
                  <p className="text-xs text-red-600 font-semibold">{forgotError}</p>
                )}

                {phoneHint && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Your Registered Mobile Number:</span>
                    <span className="text-lg font-mono font-extrabold text-emerald-800 tracking-wider block">{phoneHint}</span>
                    {phoneHintStudent && (
                      <span className="text-[11px] text-emerald-700 font-medium block">
                        Candidate: {phoneHintStudent}
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? 'Searching...' : 'Check Hint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== RENDER: LOGGED-IN STUDENT PORTAL ====================

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Student Profile Top Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#1e2d7d] text-white flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
            {student.student_name ? student.student_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {student.student_name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Reg: {student.reg_no}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Session: {student.session_name}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-500">
              <span>Mobile: <strong className="text-slate-800 font-mono">{student.phone}</strong></span>
              {student.father_name && <span>Father: <strong className="text-slate-800">{student.father_name}</strong></span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setPortalTab('entry')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            portalTab === 'entry'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record New Result (রেজাল্ট এন্ট্রি)</span>
        </button>

        <button
          onClick={() => setPortalTab('history')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            portalTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Results & Marksheets ({student.exam_results?.length || 0})</span>
        </button>
      </div>

      {/* ==================== TAB 1: RECORD RESULT ==================== */}
      {portalTab === 'entry' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#1e2d7d]">
                Self Result Entry Form (পরীক্ষার ফলাফল এন্ট্রি)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                অ্যাডমিন অ্যাকাউন্টের মতোই আপনার প্রফ অনুযায়ী নির্ধারিত বিষয়ের প্রাপ্ত নম্বর এন্ট্রি দিন।
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
              Student ID: #{student.id}
            </span>
          </div>

          {entryError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">এন্ট্রি সমস্যা:</span>
                <span>{entryError}</span>
              </div>
            </div>
          )}

          {entrySuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">{entrySuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmitResult} className="space-y-6">
            {/* Step 1: Exam Stage Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                1. Select Examination Stage (পরীক্ষার ধাপ নির্বাচন) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PROF_STAGES.map((stage) => {
                  const isPassed = passedStages.includes(stage);
                  const isSelected = entryData.exam_type === stage;

                  return (
                    <button
                      key={stage}
                      type="button"
                      disabled={isPassed}
                      onClick={() => !isPassed && handleExamTypeChange(stage)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isPassed
                          ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-extrabold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                          {stage}
                        </span>
                        {isPassed && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Passed
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {isPassed ? 'ইতিমধ্যে পাসকৃত (Locked)' : 'রেজাল্ট এন্ট্রি প্রযোজ্য'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Exam Month, Year & Roll No */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Examination Month <span className="text-red-500">*</span>
                </label>
                <select
                  value={entryData.exam_month}
                  onChange={(e) => setEntryData({ ...entryData, exam_month: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold"
                >
                  <option value="May">May</option>
                  <option value="November">November</option>
                  <option value="January">January</option>
                  <option value="July">July</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Examination Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={entryData.exam_year}
                  onChange={(e) => setEntryData({ ...entryData, exam_year: e.target.value })}
                  placeholder="2024"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Examination Roll No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={entryData.roll_no}
                  onChange={(e) => setEntryData({ ...entryData, roll_no: e.target.value })}
                  placeholder="e.g. 50124"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Step 3: Subject Marks Table */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Curriculum Subjects & Marks ({entryData.exam_type})</span>
                </h4>
                <button
                  type="button"
                  onClick={addExtraSubject}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Extra Subject</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-600 uppercase">
                  <span className="flex-1">Subject Name</span>
                  <span className="w-24 text-center">Full Marks</span>
                  <span className="w-32 text-center">Obtained Marks</span>
                  <span className="w-8"></span>
                </div>

                {entryData.marks.map((m, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl">
                    <input
                      type="text"
                      placeholder="Subject Name"
                      value={m.subject_name}
                      onChange={(e) => handleMarkChange(idx, 'subject_name', e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                    <div className="w-full sm:w-24">
                      <input
                        type="number"
                        placeholder="Full"
                        value={m.full_marks}
                        onChange={(e) => handleMarkChange(idx, 'full_marks', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-center font-bold bg-white"
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Obtained"
                        value={m.obtained_marks}
                        onChange={(e) => handleMarkChange(idx, 'obtained_marks', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-center font-extrabold text-emerald-700 bg-white"
                      />
                    </div>
                    {entryData.marks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubjectRow(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 self-end sm:self-center cursor-pointer"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: Summary & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Grand Total Marks (প্রাপ্ত মোট নম্বর)
                </label>
                <input
                  type="text"
                  value={entryData.grand_total}
                  onChange={(e) => setEntryData({ ...entryData, grand_total: e.target.value })}
                  placeholder="Auto calculated"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-extrabold text-emerald-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Result Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={entryData.result_status}
                  onChange={(e) => setEntryData({ ...entryData, result_status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-900"
                >
                  <option value="Passed">Passed (উত্তীর্ণ)</option>
                  <option value="Referred">Referred (রেফার্ড)</option>
                  <option value="Failed">Failed (অনূত্তীর্ণ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Referred / Failed Subjects
                </label>
                <input
                  type="text"
                  value={entryData.failed_subjects}
                  onChange={(e) => setEntryData({ ...entryData, failed_subjects: e.target.value })}
                  placeholder="e.g. Anatomy"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium text-red-600"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={entryLoading}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {entryLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Submit & Save Examination Result (রেজাল্ট সংরক্ষণ করুন)</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ==================== TAB 2: MY RESULTS & MARKSHEETS ==================== */}
      {portalTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between no-print">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                My Examination History & Records
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                আপনার এন্ট্রি করা সকল প্রফ পরীক্ষার ফলাফল ও বিস্তারিত মার্কশিট।
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Complete Marksheet</span>
            </button>
          </div>

          {/* Printable Institutional Header */}
          <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase text-slate-900">Popular Medical College</h1>
            <p className="text-xs font-medium text-slate-600">Dhaka, Bangladesh &middot; Established 2010</p>
            <h2 className="text-sm font-bold uppercase tracking-wider mt-2 text-slate-800">
              Official Student Academic Marksheet Summary
            </h2>
            <div className="mt-3 flex justify-between text-xs font-mono font-semibold text-slate-700">
              <span>Candidate: <strong>{student.student_name}</strong></span>
              <span>Reg No: <strong>{student.reg_no}</strong></span>
              <span>Session: <strong>{student.session_name}</strong></span>
            </div>
          </div>

          {(!student.exam_results || student.exam_results.length === 0) ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">No Examination Results Recorded Yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                আপনি এখনো কোনো প্রফের রেজাল্ট এন্ট্রি দেননি। উপরের "Record New Result" বাটনে ক্লিক করে ফলাফল এন্ট্রি দিন।
              </p>
              <button
                onClick={() => setPortalTab('entry')}
                className="mt-4 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Record First Result
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {student.exam_results.map((resItem) => {
                const isPassed = resItem.result_status === 'Passed';
                const isReferred = resItem.result_status === 'Referred';

                return (
                  <div
                    key={resItem.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-[#1e2d7d]">
                            {resItem.exam_type} Examination
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              isPassed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isReferred
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {resItem.result_status}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono block mt-0.5">
                          Exam: {resItem.exam_month} {resItem.exam_year} &middot; Roll No: {resItem.roll_no}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-bold block">Grand Total</span>
                        <span className="text-xl font-mono font-black text-slate-900">
                          {resItem.grand_total ?? '—'}
                        </span>
                      </div>
                    </div>

                    {/* Marks Table */}
                    {resItem.marks && resItem.marks.length > 0 && (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-bold">
                            <tr>
                              <th className="p-2.5">Subject</th>
                              <th className="p-2.5 text-center w-24">Full Marks</th>
                              <th className="p-2.5 text-center w-28">Obtained Marks</th>
                              <th className="p-2.5 text-center w-24">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {resItem.marks.map((m, i) => {
                              const obt = Number(m.obtained_marks);
                              const full = Number(m.full_marks) || 100;
                              const passed = !isNaN(obt) && obt >= full * 0.6;

                              return (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-semibold text-slate-800">{m.subject_name}</td>
                                  <td className="p-2.5 text-center font-mono text-slate-600">{m.full_marks}</td>
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-900">{m.obtained_marks ?? '—'}</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                      {passed ? 'Passed' : 'Referred'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {resItem.failed_subjects && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <strong>Referred Subjects:</strong> {resItem.failed_subjects}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Printable Signature Footer */}
          <div className="hidden print:flex items-center justify-between pt-16 mt-12 border-t border-slate-300 text-xs text-slate-700">
            <div className="text-center">
              <div className="w-48 border-t border-slate-600 pt-1">Student Signature</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t border-slate-600 pt-1">Printing By / Verified By</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t border-slate-600 pt-1">Authority Seal & Signature</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
