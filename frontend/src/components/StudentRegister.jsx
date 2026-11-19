import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle2, AlertCircle, AlertTriangle, ChevronDown, ShieldCheck, RotateCw, X, Send } from 'lucide-react';
import api from '../services/api';
import { DEFAULT_SESSIONS } from '../utils/constants';

export default function StudentRegister({ sessions = [] }) {
  const [availableSessions, setAvailableSessions] = useState(() => {
    return (sessions && sessions.length > 0) ? sessions : DEFAULT_SESSIONS;
  });
  const [formData, setFormData] = useState({
    reg_no: '',
    student_name: '',
    session_name: (sessions && sessions[0]) || DEFAULT_SESSIONS[0] || '2026-2027',
    phone: '',
    father_name: '',
    mother_name: '',
    address: '',
  });

  // Always ensure fresh sessions from database/admin settings
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setAvailableSessions(sessions);
      setFormData((prev) => ({
        ...prev,
        session_name: prev.session_name || sessions[0],
      }));
    } else {
      // Fetch directly if not passed from parent
      api.get('/settings/public')
        .then((res) => {
          if (res.data.success && res.data.sessions?.length > 0) {
            setAvailableSessions(res.data.sessions);
            setFormData((prev) => ({
              ...prev,
              session_name: prev.session_name || res.data.sessions[0],
            }));
          }
        })
        .catch((e) => console.error('Error fetching sessions:', e));
    }
  }, [sessions]);

  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // OTP Verification Modal States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(60);

  // Countdown timer for OTP
  useEffect(() => {
    let interval = null;
    if (showOtpModal && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpModal, timerSeconds]);

  const isFieldInvalid = (fieldName) => {
    return (submitted || touched[fieldName]) && !formData[fieldName]?.trim();
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Step 1: Validate form and request OTP to student phone
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    // Validate all required fields
    const emptyKeys = Object.keys(formData).filter((k) => !formData[k]?.trim());
    if (emptyKeys.length > 0) {
      setError('অনুগ্রহ করে লাল চিহ্নিত সবকটি আবশ্যক ঘর সঠিকভাবে পূরণ করুন। (Please fill in all highlighted fields)');
      const firstInvalid = document.querySelector('.border-red-500');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessData(null);

    try {
      const res = await api.post('/students/register/request-otp', formData);
      if (res.data.success) {
        setMaskedPhone(res.data.masked_phone || formData.phone);
        setOtpCode('');
        setOtpError(null);
        setTimerSeconds(60);
        setShowOtpModal(true);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const firstErr = Object.values(err.response.data.errors)[0]?.[0];
        setError(firstErr || 'Validation error');
      } else {
        setError(err.response?.data?.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (timerSeconds > 0 || otpSending) return;
    setOtpSending(true);
    setOtpError(null);

    try {
      const res = await api.post('/students/register/request-otp', formData);
      if (res.data.success) {
        setMaskedPhone(res.data.masked_phone || formData.phone);
        setTimerSeconds(60);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'পুনরায় ওটিপি পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Verify OTP and finalize student enrollment
  const handleVerifyAndRegister = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setOtpError('অনুগ্রহ করে ফোনে পাঠানো ৬ সংখ্যার ওটিপি কোডটি লিখুন।');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await api.post('/students/register', {
        ...formData,
        otp_code: cleanOtp,
      }, { encrypt: true });

      if (res.data.success) {
        setShowOtpModal(false);
        setSuccessData(res.data.student);
        setSubmitted(false);
        setTouched({});
        setFormData({
          reg_no: '',
          student_name: '',
          session_name: availableSessions[0] || '',
          phone: '',
          father_name: '',
          mother_name: '',
          address: '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const firstErr = Object.values(err.response.data.errors)[0]?.[0];
        setOtpError(firstErr || 'Validation error');
      } else {
        setOtpError(err.response?.data?.message || 'ওটিপি কোড যাচাই ব্যর্থ হয়েছে।');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const getInputStyle = (fieldName) => {
    const invalid = isFieldInvalid(fieldName);
    return `w-full px-4 py-2.5 rounded-xl border transition-all text-sm outline-none ${
      invalid
        ? 'border-red-500 bg-red-50/40 ring-2 ring-red-500/20 text-slate-900 placeholder-red-300'
        : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900'
    }`;
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
          <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
          Direct Student Registration
        </span>
        <h1 className="text-3xl font-extrabold text-[#1e2d7d] tracking-tight sm:text-4xl">
          Popular Medical College Enrollment
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Enroll new student particulars directly into the institutional record management database.
        </p>
      </div>

      {successData && (
        <div className="mb-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-emerald-900">Enrollment Completed!</h3>
              <p className="text-sm mt-1 text-emerald-800">
                Student <strong className="underline">{successData.student_name}</strong> has been enrolled with Registration No: <strong className="font-mono bg-white/80 px-2 py-0.5 rounded border border-emerald-300">{successData.reg_no}</strong> for session <strong className="font-mono">{successData.session_name}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Registration Incomplete</h4>
            <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Registration No */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Registration No <span className="text-red-500 font-black text-sm">*</span>
              </label>
              <input
                type="text"
                name="reg_no"
                value={formData.reg_no}
                onChange={handleChange}
                onBlur={() => handleBlur('reg_no')}
                placeholder="e.g. 10098"
                className={`${getInputStyle('reg_no')} font-mono`}
              />
              {isFieldInvalid('reg_no') && (
                <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  এই ঘরটি অবশ্যই পূরণ করতে হবে (Registration No is required)
                </span>
              )}
            </div>

            {/* Student Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Full Name of Student <span className="text-red-500 font-black text-sm">*</span>
              </label>
              <input
                type="text"
                name="student_name"
                value={formData.student_name}
                onChange={handleChange}
                onBlur={() => handleBlur('student_name')}
                placeholder="e.g. Mohammad Rahim"
                className={`${getInputStyle('student_name')} font-medium`}
              />
              {isFieldInvalid('student_name') && (
                <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  এই ঘরটি অবশ্যই পূরণ করতে হবে (Student Name is required)
                </span>
              )}
            </div>

            {/* Admission Session Dropdown (Automated selection from Admin Panel) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Admission Session <span className="text-red-500 font-black text-sm">*</span>
              </label>
              <div className="relative">
                <select
                  name="session_name"
                  value={formData.session_name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('session_name')}
                  className={`${getInputStyle('session_name')} bg-white cursor-pointer font-bold appearance-none pr-10`}
                >
                  <option value="">-- Select Admission Session --</option>
                  {availableSessions.map((sess, idx) => (
                    <option key={sess} value={sess} className="font-semibold text-slate-800">
                      {sess} {idx === 0 ? '★ (Current Session)' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              {isFieldInvalid('session_name') && (
                <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  অনুগ্রহ করে একটি সেশন নির্বাচন করুন (Admission Session is required)
                </span>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Contact Phone / Mobile <span className="text-red-500 font-black text-sm">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={() => handleBlur('phone')}
                placeholder="e.g. 01700000000"
                className={`${getInputStyle('phone')} font-mono`}
              />
              {isFieldInvalid('phone') && (
                <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  এই ঘরটি অবশ্যই পূরণ করতে হবে (Phone is required)
                </span>
              )}
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Father's Name <span className="text-red-500 font-black text-sm">*</span>
              </label>
              <input
                type="text"
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                onBlur={() => handleBlur('father_name')}
                placeholder="Father's Full Name"
                className={getInputStyle('father_name')}
              />
              {isFieldInvalid('father_name') && (
                <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  এই ঘরটি অবশ্যই পূরণ করতে হবে (Father's Name is required)
                </span>
              )}
            </div>

            {/* Mother's Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Mother's Name <span className="text-red-500 font-black text-sm">*</span>
              </label>
              <input
                type="text"
                name="mother_name"
                value={formData.mother_name}
                onChange={handleChange}
                onBlur={() => handleBlur('mother_name')}
                placeholder="Mother's Full Name"
                className={getInputStyle('mother_name')}
              />
              {isFieldInvalid('mother_name') && (
                <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  এই ঘরটি অবশ্যই পূরণ করতে হবে (Mother's Name is required)
                </span>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Present / Permanent Address <span className="text-red-500 font-black text-sm">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              onBlur={() => handleBlur('address')}
              rows={3}
              placeholder="Full mailing address..."
              className={getInputStyle('address')}
            />
            {isFieldInvalid('address') && (
              <span className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                এই ঘরটি অবশ্যই পূরণ করতে হবে (Address is required)
              </span>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Sending Verification OTP via SMS...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Student Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ==================== OTP VERIFICATION MODAL ==================== */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1e2d7d]">
                    মোবাইল ওটিপি ভেরিফিকেশন
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Mobile OTP Verification
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
              <span className="block font-bold mb-0.5">এসএমএস পাঠানো হয়েছে:</span>
              <span>
                আপনার মোবাইল নম্বর <strong className="font-mono text-emerald-950 font-bold">{maskedPhone}</strong>-এ ৬-সংখ্যার ভেরিফিকেশন ওটিপি পাঠানো হয়েছে। রেজিস্ট্রেশন সম্পন্ন করতে কোডটি প্রবেশ করান।
              </span>
            </div>

            {otpError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndRegister} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit OTP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full text-center tracking-[0.4em] text-2xl font-mono font-black py-3 rounded-2xl border-2 border-emerald-500/50 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 outline-none bg-slate-50 text-slate-900"
                />
                <span className="text-[11px] text-slate-400 text-center block mt-1.5">
                  SMS Format: "Welcome to Popular Medical College. Your Registration OTP: [CODE]"
                </span>
              </div>

              {/* Countdown / Resend row */}
              <div className="text-center pt-1">
                {timerSeconds > 0 ? (
                  <span className="text-xs text-slate-500 font-medium">
                    পুনরায় ওটিপি পাঠাতে অপেক্ষা করুন:{' '}
                    <strong className="font-mono text-emerald-700">
                      00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                    </strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpSending}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${otpSending ? 'animate-spin' : ''}`} />
                    <span>Resend OTP / পুনরায় ওটিপি পাঠান</span>
                  </button>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length < 4}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {otpLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Verifying & Enrolling Student...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP & Complete Registration</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel / Edit Information (সংশোধন করুন)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
