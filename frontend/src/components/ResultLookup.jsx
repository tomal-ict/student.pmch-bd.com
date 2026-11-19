import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Award, 
  BookOpen, 
  GraduationCap, 
  Phone, 
  HelpCircle, 
  Calendar, 
  X, 
  KeyRound,
  RotateCcw,
  Check,
  Send,
  MessageSquare
} from 'lucide-react';
import api from '../services/api';
import { DEFAULT_SESSIONS } from '../utils/constants';

export default function ResultLookup() {
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'result'
  const [regNo, setRegNo] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const [sessionsList, setSessionsList] = useState(DEFAULT_SESSIONS);
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Countdown timer for OTP
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [canResend, setCanResend] = useState(false);

  // Forgot Phone Modal States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotRegNo, setForgotRegNo] = useState('');
  const [forgotSession, setForgotSession] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [phoneHintData, setPhoneHintData] = useState(null);

  useEffect(() => {
    api.get('/settings/public')
      .then((res) => {
        if (res.data.success && res.data.sessions && res.data.sessions.length > 0) {
          setSessionsList(res.data.sessions);
          if (!sessionName) {
            setSessionName(res.data.sessions[0]);
          }
        }
      })
      .catch((e) => console.error('Failed to load public settings', e));
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerSeconds === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timerSeconds]);

  // Step 1: Request OTP via REVE SMS Gateway
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanReg = regNo.trim();
    const cleanSession = sessionName.trim();
    const cleanPhone = phone.trim();

    if (!cleanReg || !cleanSession || !cleanPhone) {
      setError('Please provide your Registration Number, Academic Session, and Phone Number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/results/request-otp', {
        reg_no: cleanReg,
        session_name: cleanSession,
        phone: cleanPhone,
      });

      if (res.data.success) {
        setMaskedPhone(res.data.masked_phone || cleanPhone);
        setStep('otp');
        setOtpCode('');
        setTimerSeconds(180);
        setCanResend(false);
      } else {
        setError(res.data.message || 'Verification failed');
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Unable to send verification OTP. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Load Marksheet
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP code sent to your phone.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/results/verify-otp', {
        reg_no: regNo.trim(),
        session_name: sessionName.trim(),
        phone: phone.trim(),
        otp_code: cleanOtp,
      });

      if (res.data.success) {
        setStudentData(res.data);
        setSelectedResultIndex(0);
        setStep('result');
      } else {
        setError(res.data.message || 'OTP verification failed');
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Invalid or expired OTP code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    await handleRequestOtp();
  };

  const handleResetSearch = () => {
    setStep('form');
    setOtpCode('');
    setError(null);
    setStudentData(null);
  };

  // Forgot Phone Modal Handlers
  const openForgotModal = () => {
    setForgotRegNo(regNo || '');
    setForgotSession(sessionName || sessionsList[0] || '');
    setForgotError(null);
    setPhoneHintData(null);
    setIsForgotModalOpen(true);
  };

  const handleGetPhoneHint = async (e) => {
    if (e) e.preventDefault();
    const cleanReg = forgotRegNo.trim();
    const cleanSession = forgotSession.trim();

    if (!cleanReg || !cleanSession) {
      setForgotError('Please enter both Registration Number and Academic Session.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setPhoneHintData(null);

    try {
      const res = await api.post('/students/phone-hint', {
        reg_no: cleanReg,
        session_name: cleanSession,
      });

      if (res.data.success) {
        setPhoneHintData(res.data);
      } else {
        setForgotError(res.data.message || 'Unable to retrieve phone hint');
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setForgotError(err.response.data.message);
      } else {
        setForgotError('No student matching this Registration Number and Session was found.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const applyHintAndClose = () => {
    if (phoneHintData) {
      setRegNo(phoneHintData.reg_no || forgotRegNo);
      setSessionName(phoneHintData.session_name || forgotSession);
    }
    setIsForgotModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const activeResult = studentData?.results?.[selectedResultIndex];

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      
      {/* Top Banner (Hidden in Print) */}
      <div className="text-center mb-8 no-print">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs mb-4">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>Popular Medical College &middot; Official Examination Portal</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1e2d7d] tracking-tight">
          MBBS Professional Result Verification
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Secure candidate result verification with SMS OTP 2-Factor Authentication.
        </p>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="max-w-xl mx-auto mb-6 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2.5 no-print shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: INITIAL INFORMATION FORM                                          */}
      {/* ========================================================================= */}
      {step === 'form' && (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 text-left no-print">
          <form onSubmit={handleRequestOtp} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Registration Number */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="e.g. 10095"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Academic Session */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Academic Session <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Select Session...</option>
                    {sessionsList.map((s, idx) => (
                      <option key={s} value={s}>
                        {s} {idx === 0 ? '★ (Latest)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Registered Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Registered Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01720331586"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button (Sends OTP) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Sending OTP via SMS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Verification OTP</span>
                  </>
                )}
              </button>
            </div>

            {/* Forgot Phone Link at the Bottom */}
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={openForgotModal}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 font-medium cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Forgot your registered phone number?</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ENTER OTP CODE VIEW                                               */}
      {/* ========================================================================= */}
      {step === 'otp' && (
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl text-center no-print animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight">Enter SMS Verification OTP</h2>
          <p className="text-xs text-slate-600 mt-1">
            An OTP code has been sent via REVE SMS to your registered number:
          </p>
          <div className="inline-block mt-1 font-mono font-bold text-sm bg-slate-100 text-[#1e2d7d] px-3 py-1 rounded-lg">
            {maskedPhone}
          </div>

          {/* OTP Input Form */}
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                autoFocus
                className="w-full py-3 px-4 text-center font-mono text-2xl font-black tracking-widest bg-slate-50 border-2 border-emerald-500/50 rounded-2xl text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none transition-all"
              />
              <span className="text-[11px] text-slate-400 block mt-1.5 font-mono">
                SMS Template: "Welcome to Popular Medical College. Your OTP: [NUMBER]"
              </span>
            </div>

            {/* Timer and Resend */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Code valid for: <strong className="font-mono text-emerald-700">{formatTimer(timerSeconds)}</strong>
              </span>
              <button
                type="button"
                disabled={!canResend || loading}
                onClick={handleResendOtp}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-40 underline cursor-pointer"
              >
                Resend OTP
              </button>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otpCode.length < 4}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-3" />
                  <span>Submit OTP & View Result</span>
                </>
              )}
            </button>

            {/* Back Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetSearch}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Change Registration No or Phone
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: OFFICIAL MARKSHEET DISPLAY (AFTER SUCCESSFUL OTP VERIFICATION)   */}
      {/* ========================================================================= */}
      {step === 'result' && studentData && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden transition-all print:border-none print:shadow-none animate-in fade-in">
          
          {/* Action Header (Hidden in Print) */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/70 to-slate-50 border-b border-emerald-100 flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-900">
                OTP Verified: Candidate {studentData.student?.student_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSearch}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Search Another
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Marksheet</span>
              </button>
            </div>
          </div>

          {/* Official Printable Header */}
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <img 
                  src="./logo.png" 
                  alt="Popular Medical College" 
                  className="w-20 h-20 object-contain drop-shadow-sm" 
                  onError={(e) => {
                    e.target.src = '/student_potal/logo.png';
                  }}
                />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e2d7d] tracking-tight">
                    Popular Medical College
                  </h2>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                    Affiliated with University of Dhaka &middot; Recognized by BM&DC
                  </p>
                  <p className="text-xs text-slate-500">
                    Official Academic Transcript & Professional Examination Record
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100/70 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  AUTHENTICATED RECORD
                </span>
              </div>
            </div>

            {/* Student Particulars Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Student Name</span>
                <span className="font-extrabold text-[#1e2d7d] text-base">{studentData.student.student_name}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Registration No</span>
                <span className="font-mono font-bold text-emerald-700 text-base">{studentData.student.reg_no}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Academic Session</span>
                <span className="font-semibold text-slate-800">{studentData.student.session_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 block">Father's Name</span>
                <span className="font-semibold text-slate-800">{studentData.student.father_name || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Exam Results Tab Switcher (Multi-attempt Progression) */}
          {studentData.results && studentData.results.length > 0 ? (
            <div>
              <div className="flex border-b border-slate-200 bg-slate-100/60 overflow-x-auto px-6 no-print">
                {studentData.results.map((resItem, idx) => (
                  <button
                    key={resItem.id || idx}
                    onClick={() => setSelectedResultIndex(idx)}
                    className={`py-3.5 px-5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                      selectedResultIndex === idx
                        ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Attempt #{idx + 1}: {resItem.exam_type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      resItem.result_status === 'Passed' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {resItem.result_status} ({resItem.exam_year || 'N/A'})
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Exam Details */}
              {activeResult && (
                <div className="p-6 sm:p-8">
                  {/* Meta Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 mb-6 text-sm">
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-bold">Examination</span>
                      <span className="font-bold text-[#1e2d7d]">
                        {activeResult.exam_type} [Attempt #{selectedResultIndex + 1}]
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-bold">Roll Number</span>
                      <span className="font-mono font-bold text-slate-800">{activeResult.roll_no || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-bold">Held In</span>
                      <span className="font-semibold text-slate-800">
                        {activeResult.exam_month ? `${activeResult.exam_month} ` : ''}
                        {activeResult.exam_year || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-bold">Final Status</span>
                      <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-md text-xs font-extrabold mt-0.5 ${
                        activeResult.result_status === 'Passed'
                          ? 'bg-emerald-600 text-white'
                          : activeResult.result_status === 'Failed'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {activeResult.result_status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Subject Marks Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 mb-6 shadow-2xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#1e2d7d] text-white uppercase text-xs font-bold tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">#</th>
                          <th className="px-5 py-3.5">Subject / Course Name</th>
                          <th className="px-5 py-3.5 text-center">Full Marks</th>
                          <th className="px-5 py-3.5 text-center">Obtained Marks</th>
                          <th className="px-5 py-3.5 text-center">Percentage</th>
                          <th className="px-5 py-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeResult.marks && activeResult.marks.length > 0 ? (
                          activeResult.marks.map((m, mIdx) => {
                            const pct = m.full_marks > 0 && m.obtained_marks !== null
                              ? Math.round((m.obtained_marks / m.full_marks) * 100)
                              : null;
                            const isPass = pct === null || pct >= 50;

                            return (
                              <tr key={m.id || mIdx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{mIdx + 1}</td>
                                <td className="px-5 py-3.5 font-bold text-slate-800">{m.subject_name}</td>
                                <td className="px-5 py-3.5 text-center font-mono text-slate-600">{m.full_marks}</td>
                                <td className="px-5 py-3.5 text-center font-mono font-extrabold text-[#1e2d7d] text-base">
                                  {m.obtained_marks !== null ? m.obtained_marks : '—'}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  {pct !== null ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${isPass ? 'bg-emerald-600' : 'bg-red-500'}`} 
                                          style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-xs font-bold text-slate-700">{pct}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  {m.obtained_marks !== null ? (
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-extrabold ${
                                      isPass ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                      {isPass ? 'PASSED' : 'REFERRED'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center py-6 text-slate-500">
                              No subject breakdown recorded for this examination.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {/* Grand Total Footer */}
                      {!activeResult.total_hidden && (
                        <tfoot className="bg-emerald-50/80 font-bold text-slate-900 border-t-2 border-emerald-200">
                          <tr>
                            <td colSpan="3" className="px-5 py-4 text-right uppercase tracking-wider text-xs text-emerald-900 font-extrabold">
                              Aggregated Grand Total Marks:
                            </td>
                            <td className="px-5 py-4 text-center font-mono text-lg font-black text-emerald-800">
                              {activeResult.grand_total !== null ? activeResult.grand_total : '—'}
                            </td>
                            <td colSpan="2" className="px-5 py-4 text-center">
                              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                activeResult.result_status === 'Passed'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'bg-red-600 text-white shadow-xs'
                              }`}>
                                {activeResult.result_status || 'Result Available'}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Remarks & Fail notes */}
                  {(activeResult.failed_subjects || activeResult.remarks) && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      {activeResult.failed_subjects && (
                        <p><span className="font-bold">Referred / Failed Subjects:</span> {activeResult.failed_subjects}</p>
                      )}
                      {activeResult.remarks && (
                        <p><span className="font-bold">Institutional Remarks:</span> {activeResult.remarks}</p>
                      )}
                    </div>
                  )}

                  {/* Marksheet Signatures for Print */}
                  <div className="hidden print:grid grid-cols-3 gap-8 pt-16 mt-8 border-t border-slate-300 text-center text-xs text-slate-700">
                    <div>
                      <div className="border-t border-slate-400 pt-2 font-bold">Prepared by</div>
                      <span className="text-[10px] text-slate-500">Computer Operator</span>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 pt-2 font-bold">Checked & Verified by</div>
                      <span className="text-[10px] text-slate-500">Academic Officer</span>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 pt-2 font-bold">Principal / Dean</div>
                      <span className="text-[10px] text-slate-500">Popular Medical College</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              No examination records found for this student.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORGOT PHONE NUMBER HINT MODAL                                            */}
      {/* ========================================================================= */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Phone Number Hint</h3>
              </div>
              <button 
                onClick={() => setIsForgotModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{forgotError}</span>
              </div>
            )}

            {!phoneHintData ? (
              <form onSubmit={handleGetPhoneHint} className="mt-3 space-y-3 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Registration No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotRegNo}
                    onChange={(e) => setForgotRegNo(e.target.value)}
                    placeholder="e.g. 10095"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Session <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={forgotSession}
                    onChange={(e) => setForgotSession(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Session...</option>
                    {sessionsList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer shadow-sm transition-all"
                  >
                    {forgotLoading ? 'Checking...' : 'Get Hint'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5 stroke-3" />
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{phoneHintData.student_name}</h4>
                  <span className="text-xs font-mono text-slate-500">
                    Reg: {phoneHintData.reg_no}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Phone Number Hint
                  </span>
                  <div className="text-xl font-mono font-black text-[#1e2d7d] tracking-widest">
                    {phoneHintData.masked_phone}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyHintAndClose}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                >
                  Continue to Search
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
