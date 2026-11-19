import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Upload,
  Plus,
  Trash2,
  Printer,
  Paperclip,
  FileCheck,
  Image as ImageIcon,
  Eye,
  X,
  File,
  ShieldCheck,
  GraduationCap,
  PenTool,
  FolderPlus,
  RotateCw
} from 'lucide-react';
import api, { getStorageUrl } from '../services/api';
import { DEFAULT_SESSIONS, DEFAULT_ACTIVITIES } from '../utils/constants';
import { compressImageFile, formatReadableSize } from '../utils/imageCompressor';
import AdmissionPrintDocument from './AdmissionPrintDocument';

const REQUIRED_ATTACHMENTS = [
  {
    key: 'ssc_marksheet',
    label: 'SSC / সমমান পরীক্ষার নম্বরপত্র / মার্কশিট (SSC Marksheet / Transcript)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'ssc_certificate',
    label: 'SSC / সমমান মূল সনদপত্র বা প্রশংসাপত্র (SSC Certificate / Testimonial)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'hsc_marksheet',
    label: 'HSC / সমমান পরীক্ষার নম্বরপত্র / মার্কশিট (HSC Marksheet / Transcript)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'hsc_certificate',
    label: 'HSC / সমমান মূল সনদপত্র বা প্রশংসাপত্র (HSC Certificate / Testimonial)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'admission_test_doc',
    label: 'ডিজিএইচএস মেডিকেল ভর্তি পরীক্ষার প্রবেশপত্র ও ফলাফল/স্কোরশীট (DGHS Admit & Score Card)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'student_nid_birth',
    label: 'শিক্ষার্থীর জাতীয় পরিচয়পত্র (NID) অথবা অনলাইন জন্ম নিবন্ধন সনদ (Candidate NID / Birth Cert)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'guardian_nid',
    label: 'পিতা / মাতা / বৈধ অভিভাবকের জাতীয় পরিচয়পত্র (Parent / Guardian NID Card)',
    required: true,
    accept: '.pdf,image/*',
  },
  {
    key: 'citizenship_certificate',
    label: 'ওয়ার্ড কাউন্সিলর / পৌর মেয়র / ইউপি চেয়ারম্যানের নাগরিকত্ব ও চারিত্রিক সনদ (Citizenship Certificate)',
    required: false,
    accept: '.pdf,image/*',
  },
  {
    key: 'candidate_signature',
    label: 'আবেদনকারী শিক্ষার্থীর আনুষ্ঠানিক স্বাক্ষর (Candidate Formal Signature)',
    required: true,
    accept: 'image/*',
  },
  {
    key: 'guardian_signature',
    label: 'পিতা / মাতা / অভিভাবকের আনুষ্ঠানিক স্বাক্ষর (Parent / Guardian Signature)',
    required: true,
    accept: 'image/*',
  },
  {
    key: 'quota_certificate',
    label: 'কোটা সনদপত্র - মুক্তিযোদ্ধা / উপজাতি / অন্যান্য (Quota Certificate - if applicable)',
    required: false,
    accept: '.pdf,image/*',
  },
  {
    key: 'other_document',
    label: 'অন্যান্য প্রয়োজনীয় কাগজপত্র বা প্রশংসাপত্র (Other Supportive Document)',
    required: false,
    accept: '.pdf,image/*',
  },
];

export default function AdmissionForm({ sessions = [], activities = [] }) {
  const [availableSessions, setAvailableSessions] = useState(() => {
    return (sessions && sessions.length > 0) ? sessions : DEFAULT_SESSIONS;
  });
  const [availableActivities, setAvailableActivities] = useState(() => {
    return (activities && activities.length > 0) ? activities : DEFAULT_ACTIVITIES;
  });

  const [formData, setFormData] = useState({
    candidate_name: '',
    candidate_name_bn: '',
    sex: 'Male',
    father_name: '',
    father_name_bn: '',
    father_occupation: '',
    mother_name: '',
    mother_name_bn: '',
    mother_occupation: '',
    guardian_name: '',
    guardian_occupation: '',
    date_of_birth: '',
    religion: 'Islam',
    identification_mark: '',
    nationality: 'Bangladeshi',
    home_district: '',
    communication_address: '',
    permanent_address: '',
    mobile: '',
    phone: '',
    email: '',
    session_name: (sessions && sessions[0]) || DEFAULT_SESSIONS[0] || '2026-2027',
    group_name: 'MBBS',
    college_code: '1st Migration',
    admission_roll_no: '',
    merit_position: '',
    merit_score: '',
  });

  // Student Category (Local vs Foreigner) -> maps directly to college_code on print
  const [studentCategory, setStudentCategory] = useState('Local Student');
  const [migrationOption, setMigrationOption] = useState('1st Migration');
  const [eligibleListNo, setEligibleListNo] = useState('');

  useEffect(() => {
    if (studentCategory === 'Local Student') {
      setFormData((prev) => ({
        ...prev,
        college_code: migrationOption || '1st Migration',
      }));
    } else {
      const cleanEl = eligibleListNo.trim();
      setFormData((prev) => ({
        ...prev,
        college_code: cleanEl ? `Eligible List: ${cleanEl}` : 'Eligible List',
      }));
    }
  }, [studentCategory, migrationOption, eligibleListNo]);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setAvailableSessions(sessions);
      setFormData((prev) => ({
        ...prev,
        session_name: prev.session_name || sessions[0],
      }));
    } else {
      api.get('/settings/public')
        .then((res) => {
          if (res.data?.success) {
            if (res.data.sessions && res.data.sessions.length > 0) {
              setAvailableSessions(res.data.sessions);
              setFormData((prev) => ({
                ...prev,
                session_name: prev.session_name || res.data.sessions[0],
              }));
            }
            if (res.data.activities && res.data.activities.length > 0) {
              setAvailableActivities(res.data.activities);
            }
          }
        })
        .catch(() => {});
    }
    if (activities && activities.length > 0) {
      setAvailableActivities(activities);
    }
  }, [sessions, activities]);

  const [academicHistory, setAcademicHistory] = useState([
    { exam: 'S.S.C / Equivalent', board: 'Dhaka', roll: '', reg: '', year: '2020', gpa: '5.00', gpa_without_4th: '5.00' },
    { exam: 'H.S.C / Equivalent', board: 'Dhaka', roll: '', reg: '', year: '2022', gpa: '5.00', gpa_without_4th: '5.00' },
  ]);

  const [selectedActivities, setSelectedActivities] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoSizeInfo, setPhotoSizeInfo] = useState(null);
  const [undertakingAgreed, setUndertakingAgreed] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState({});
  const [attachmentPreviews, setAttachmentPreviews] = useState({});

  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [error, setError] = useState(null);

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [otpSending, setOtpSending] = useState(false);

  useEffect(() => {
    if (timerSeconds <= 0) return;
    const t = setTimeout(() => setTimerSeconds((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timerSeconds]);

  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const isFieldInvalid = (f) => (submitted || touched[f]) && !formData[f]?.trim();
  const handleBlur = (f) => setTouched((prev) => ({ ...prev, [f]: true }));

  const handleTextChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoProcessing(true);
    try {
      // Auto-convert & compress any large image (e.g. 10MB+) down to clean JPEG under 1.5MB
      const compressed = await compressImageFile(file, {
        maxSizeMB: 1.5,
        maxDimension: 1000,
        initialQuality: 0.88,
      });

      if (compressed && compressed.file) {
        setPhoto(compressed.file);
        setPhotoPreview(compressed.dataUrl || URL.createObjectURL(compressed.file));
        if (compressed.originalSize > compressed.compressedSize) {
          setPhotoSizeInfo(
            `${formatReadableSize(compressed.originalSize)} → ${formatReadableSize(compressed.compressedSize)}`
          );
        } else {
          setPhotoSizeInfo(formatReadableSize(compressed.compressedSize));
        }
      }
    } catch (err) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoSizeInfo(formatReadableSize(file.size));
    } finally {
      setPhotoProcessing(false);
    }
  };

  const handleAttachmentChange = async (key, file) => {
    if (!file) return;

    if (file.type && file.type.startsWith('image/') && file.size > 1.8 * 1024 * 1024) {
      try {
        const compressed = await compressImageFile(file, {
          maxSizeMB: 1.8,
          maxDimension: 1800,
          initialQuality: 0.85,
        });
        if (compressed && compressed.file) {
          setAttachments((prev) => ({ ...prev, [key]: compressed.file }));
          setAttachmentPreviews((prev) => ({
            ...prev,
            [key]: compressed.dataUrl || URL.createObjectURL(compressed.file),
          }));
          return;
        }
      } catch {}
    }

    setAttachments((prev) => ({ ...prev, [key]: file }));
    if (file.type.startsWith('image/')) {
      setAttachmentPreviews((prev) => ({ ...prev, [key]: URL.createObjectURL(file) }));
    } else {
      setAttachmentPreviews((prev) => ({ ...prev, [key]: null }));
    }
  };

  const removeAttachment = (key) => {
    setAttachments((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setAttachmentPreviews((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleAcademicChange = (index, field, value) => {
    const updated = [...academicHistory];
    updated[index][field] = value;
    setAcademicHistory(updated);
  };

  const addAcademicRow = () => {
    setAcademicHistory([...academicHistory, { exam: '', board: '', roll: '', reg: '', year: '', gpa: '', gpa_without_4th: '' }]);
  };

  const calculateGrandTotalGpa = () => {
    const total = academicHistory.reduce((sum, item) => {
      const val = parseFloat(item.gpa_without_4th !== undefined && item.gpa_without_4th !== '' ? item.gpa_without_4th : item.gpa);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    return total > 0 ? total.toFixed(2) : '0.00';
  };

  const removeAcademicRow = (index) => {
    setAcademicHistory(academicHistory.filter((_, i) => i !== index));
  };

  const toggleActivity = (act) => {
    if (selectedActivities.includes(act)) {
      setSelectedActivities(selectedActivities.filter((a) => a !== act));
    } else {
      setSelectedActivities([...selectedActivities, act]);
    }
  };

  // Step 1: Validate Form & Request OTP to Candidate Mobile Number
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (studentCategory === 'Foreigner Student' && !eligibleListNo.trim()) {
      setError('অনুগ্রহ করে Foreigner Student-এর জন্য Eligible List নম্বরটি লিখুন।');
      const elInput = document.getElementById('eligible-list-input');
      if (elInput) {
        elInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elInput.focus();
      }
      return;
    }

    if (!formData.candidate_name?.trim() || !formData.mobile?.trim()) {
      setError('অনুগ্রহ করে লাল চিহ্নিত সবকটি আবশ্যক ঘর পূরণ করুন। (Please fill in all required fields)');
      const firstInvalid = document.querySelector('.border-red-500');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    if (!undertakingAgreed) {
      setError('অনুগ্রহ করে ফরমের নিচের অঙ্গীকারনামা (Declaration / Undertaking) বক্সে টিক চিহ্ন দিন।');
      return;
    }

    setLoading(true);
    setError(null);
    setSubmittedData(null);

    try {
      const res = await api.post('/admissions/request-otp', {
        candidate_name: formData.candidate_name.trim(),
        mobile: formData.mobile.trim(),
        session_name: formData.session_name,
      });

      if (res.data.success) {
        setMaskedPhone(res.data.masked_phone || formData.mobile);
        setOtpCode('');
        setOtpError(null);
        setTimerSeconds(60);
        setShowOtpModal(true);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const first = Object.values(err.response.data.errors)[0]?.[0];
        setError(first || 'Validation failed');
      } else {
        setError(err.response?.data?.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend Admission OTP
  const handleResendOtp = async () => {
    if (timerSeconds > 0 || otpSending) return;
    setOtpSending(true);
    setOtpError(null);

    try {
      const res = await api.post('/admissions/request-otp', {
        candidate_name: formData.candidate_name.trim(),
        mobile: formData.mobile.trim(),
        session_name: formData.session_name,
      });

      if (res.data.success) {
        setMaskedPhone(res.data.masked_phone || formData.mobile);
        setTimerSeconds(60);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'পুনরায় ওটিপি পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Verify OTP & Submit Final Admission Application
  const handleVerifyAndSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (!cleanOtp) {
      setOtpError('অনুগ্রহ করে আপনার মোবাইলে পাঠানো ৬-সংখ্যার ওটিপি কোডটি লিখুন।');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const data = new FormData();
      Object.keys(formData).forEach((k) => {
        data.append(k, formData[k] || '');
      });

      data.append('otp_code', cleanOtp);
      data.append('academic_json', JSON.stringify(academicHistory));
      data.append('activities_json', JSON.stringify(selectedActivities));
      data.append('undertaking_json', JSON.stringify({ agreed: true, timestamp: new Date().toISOString() }));

      if (photo) {
        data.append('photo', photo);
      }

      // Append all attachments
      Object.entries(attachments).forEach(([key, file]) => {
        if (file) {
          data.append(key, file);
        }
      });

      const res = await api.post('/admissions/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setShowOtpModal(false);
        setSubmittedData({
          ...res.data,
          admission: {
            ...res.data.admission,
            photo_preview: photoPreview,
          },
        });
        setShowPrintModal(true);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const first = Object.values(err.response.data.errors)[0]?.[0];
        setOtpError(first || 'Validation failed');
      } else {
        setOtpError(err.response?.data?.message || 'ওটিপি যাচাই বা আবেদন জমা দিতে সমস্যা হয়েছে।');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-8 no-print">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          MBBS Course Admission
        </span>
        <h1 className="text-3xl font-extrabold text-[#1e2d7d] tracking-tight sm:text-4xl">
          Popular Medical College Admission Form
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto">
          Please provide verified candidate details, academic history, and upload all required certificates and attachments.
        </p>
      </div>

      {/* Success Notification / Print Slip */}
      {submittedData && (
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-white border border-emerald-300 shadow-xl">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">Application Submitted Successfully!</h2>
              <p className="text-sm text-slate-600 mt-1">
                Your admission application and uploaded documents have been securely received by Popular Medical College.
              </p>

              <div className="mt-5 p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase text-slate-500 font-bold tracking-wider block">Admission Tracking Serial</span>
                  <span className="text-2xl font-mono font-extrabold text-emerald-800">{submittedData.serial_no}</span>
                </div>
                <div>
                  <span className="text-xs uppercase text-slate-500 font-bold tracking-wider block">Applicant Name</span>
                  <span className="text-base font-bold text-slate-800">{submittedData.admission.candidate_name}</span>
                </div>
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer no-print transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Application Form (প্রিন্ট বা পিডিএফ)</span>
                </button>
              </div>

              {/* Uploaded Documents Summary */}
              {submittedData.admission?.attachments_json && Object.keys(submittedData.admission.attachments_json).length > 0 && (
                <div className="mt-5 pt-4 border-t border-emerald-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Attached Documents Checklist ({Object.keys(submittedData.admission.attachments_json).length} Files Attached)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(submittedData.admission.attachments_json).map((att, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-emerald-200 text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold truncate flex-1">{att.label}</span>
                        <span className="text-slate-400 font-mono text-[11px] uppercase">.{att.extension}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 no-print">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Application Submission Error</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      {!submittedData && (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-md">
          {/* Section 1: Candidate Basic Info & Photo */}
          <div>
            <h3 className="text-base font-bold text-[#1e2d7d] pb-3 border-b border-slate-200 flex items-center justify-between uppercase tracking-wider">
              <span>1. Candidate Particulars (শিক্ষার্থীর তথ্য ও ছবি)</span>
              <span className="text-xs font-normal text-slate-500 lowercase">* fields required</span>
            </h3>

            <div className="mt-6 flex flex-col md:flex-row gap-6">
              {/* Photo Box */}
              <div className="w-full md:w-48 shrink-0 flex flex-col items-center">
                <div className="w-36 h-44 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 flex flex-col items-center justify-center overflow-hidden relative group">
                  {photoProcessing ? (
                    <div className="text-center p-3 text-emerald-700">
                      <span className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-1"></span>
                      <span className="text-[11px] block font-bold">Optimizing...</span>
                    </div>
                  ) : photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <Upload className="w-8 h-8 mx-auto mb-1 text-emerald-600 opacity-60" />
                      <span className="text-xs block font-semibold text-slate-600">Passport Photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-2 text-center leading-tight">
                  ছবি আপলোড করুন (বড় ছবি দিলে স্বয়ংক্রিয়ভাবে ২ MB-এর নিচে কনভার্ট হবে)
                </span>
                {photoSizeInfo && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1">
                    {photoSizeInfo}
                  </span>
                )}
              </div>

              {/* Basic Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Type Selection (Before Candidate Full Name) */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1e2d7d]">
                      Student Type (শিক্ষার্থীর ধরন নির্বাচন করুন) <span className="text-red-500 font-black">*</span>
                    </label>
                    <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                      {['Local Student', 'Foreigner Student'].map((type) => {
                        const active = studentCategory === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setStudentCategory(type)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {studentCategory === 'Local Student' ? (
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Select Migration Stage <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['1st Migration', '2nd Migration', '3rd Migration', '4th Migration'].map((opt) => {
                          const selected = migrationOption === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setMigrationOption(opt)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                                selected
                                  ? 'bg-[#1e2d7d] text-white border-[#1e2d7d] shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="px-3.5 py-2 rounded-xl bg-[#1e2d7d] text-white text-xs font-bold whitespace-nowrap w-fit">
                        Eligible List
                      </span>
                      <input
                        id="eligible-list-input"
                        type="text"
                        value={eligibleListNo}
                        onChange={(e) => setEligibleListNo(e.target.value)}
                        placeholder="Enter Eligible List Number (e.g. 125)"
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-sm font-mono font-bold bg-white outline-none transition-all ${
                          submitted && !eligibleListNo.trim()
                            ? 'border-red-500 ring-2 ring-red-500/20'
                            : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Candidate Full Name <span className="text-red-500 font-black text-sm">*</span>
                  </label>
                  <input
                    type="text"
                    name="candidate_name"
                    value={formData.candidate_name}
                    onChange={handleTextChange}
                    onBlur={() => handleBlur('candidate_name')}
                    placeholder="Full name in English"
                    className={`w-full px-3.5 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                      isFieldInvalid('candidate_name')
                        ? 'border-red-500 bg-red-50/40 ring-2 ring-red-500/20 placeholder-red-300'
                        : 'border-slate-300 focus:ring-2 focus:ring-emerald-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Candidate Name (বাংলায়)
                  </label>
                  <input
                    type="text"
                    name="candidate_name_bn"
                    value={formData.candidate_name_bn}
                    onChange={handleTextChange}
                    placeholder="বাংলায় পূর্ণ নাম"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Admission Session <span className="text-red-500 font-black text-sm">*</span>
                  </label>
                  <select
                    name="session_name"
                    value={formData.session_name}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
                  >
                    {availableSessions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Gender / Sex</label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Religion</label>
                  <select
                    name="religion"
                    value={formData.religion}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleTextChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Home District</label>
                  <input
                    type="text"
                    name="home_district"
                    value={formData.home_district}
                    onChange={handleTextChange}
                    placeholder="e.g. Dhaka, Cumilla"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Medical Admission Test Roll No
                  </label>
                  <input
                    type="text"
                    name="admission_roll_no"
                    value={formData.admission_roll_no}
                    onChange={handleTextChange}
                    placeholder="DGHS Roll No"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Merit Score & Position
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="merit_score"
                      value={formData.merit_score}
                      onChange={handleTextChange}
                      placeholder="Score (e.g. 280)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                    <input
                      type="text"
                      name="merit_position"
                      value={formData.merit_position}
                      onChange={handleTextChange}
                      placeholder="Merit (e.g. 3420)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Parents & Guardian */}
          <div>
            <h3 className="text-base font-bold text-[#1e2d7d] pb-3 border-b border-slate-200 uppercase tracking-wider">
              2. Parents & Legal Guardian Particulars (পিতা-মাতা ও অভিভাবক)
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Father's Name (English)</label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Father's Name (বাংলায়)</label>
                <input
                  type="text"
                  name="father_name_bn"
                  value={formData.father_name_bn}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Father's Occupation</label>
                <input
                  type="text"
                  name="father_occupation"
                  value={formData.father_occupation}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mother's Name (English)</label>
                <input
                  type="text"
                  name="mother_name"
                  value={formData.mother_name}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mother's Name (বাংলায়)</label>
                <input
                  type="text"
                  name="mother_name_bn"
                  value={formData.mother_name_bn}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mother's Occupation</label>
                <input
                  type="text"
                  name="mother_occupation"
                  value={formData.mother_occupation}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Legal Guardian's Name (if other than parents)
                </label>
                <input
                  type="text"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleTextChange}
                  placeholder="Guardian's name"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Guardian's Occupation</label>
                <input
                  type="text"
                  name="guardian_occupation"
                  value={formData.guardian_occupation}
                  onChange={handleTextChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Addresses */}
          <div>
            <h3 className="text-base font-bold text-[#1e2d7d] pb-3 border-b border-slate-200 uppercase tracking-wider">
              3. Contact & Addresses (যোগাযোগ ও ঠিকানা)
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500 font-black text-sm">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleTextChange}
                  onBlur={() => handleBlur('mobile')}
                  placeholder="01XXXXXXXXX"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm font-mono ${
                    isFieldInvalid('mobile')
                      ? 'border-red-500 bg-red-50/40 ring-2 ring-red-500/20 placeholder-red-300'
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-600'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Telephone / Alternate</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleTextChange}
                  placeholder="Alternate contact"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleTextChange}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Present Address</label>
                <textarea
                  name="communication_address"
                  value={formData.communication_address}
                  onChange={handleTextChange}
                  rows={2}
                  placeholder="House, Road, Area, District..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Permanent Address</label>
                <textarea
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleTextChange}
                  rows={2}
                  placeholder="Village, Post, Thana, District..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Academic History */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#1e2d7d] uppercase tracking-wider">
                4. Academic Qualifications (শিক্ষাগত যোগ্যতা)
              </h3>
              <button
                type="button"
                onClick={addAcademicRow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Row
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-3 py-2.5">Exam Name</th>
                    <th className="px-3 py-2.5">Board / University</th>
                    <th className="px-3 py-2.5">Roll No</th>
                    <th className="px-3 py-2.5">Reg No</th>
                    <th className="px-3 py-2.5">Year</th>
                    <th className="px-3 py-2.5">Total GPA</th>
                    <th className="px-3 py-2.5">GPA without 4th</th>
                    <th className="px-3 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {academicHistory.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.exam}
                          onChange={(e) => handleAcademicChange(idx, 'exam', e.target.value)}
                          placeholder="e.g. SSC"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.board}
                          onChange={(e) => handleAcademicChange(idx, 'board', e.target.value)}
                          placeholder="e.g. Dhaka"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.roll}
                          onChange={(e) => handleAcademicChange(idx, 'roll', e.target.value)}
                          placeholder="Roll"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.reg}
                          onChange={(e) => handleAcademicChange(idx, 'reg', e.target.value)}
                          placeholder="Reg"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.year}
                          onChange={(e) => handleAcademicChange(idx, 'year', e.target.value)}
                          placeholder="Year"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.gpa}
                          onChange={(e) => handleAcademicChange(idx, 'gpa', e.target.value)}
                          placeholder="5.00"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs font-mono font-bold text-slate-800"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.gpa_without_4th !== undefined ? item.gpa_without_4th : item.gpa}
                          onChange={(e) => handleAcademicChange(idx, 'gpa_without_4th', e.target.value)}
                          placeholder="5.00"
                          className="w-full px-2 py-1.5 border rounded-lg text-xs font-mono font-bold text-emerald-700 bg-emerald-50/30"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeAcademicRow(idx)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Grand Total GPA banner */}
            <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  Grand Total GPA (৪র্থ বিষয় বাদে সকল বিষয়ের মোট জিপিএ-এর যোগফল):
                </span>
                <span className="text-[11px] text-emerald-700">
                  GPA without 4th Subject-এর মানগুলো স্বয়ংক্রিয়ভাবে যোগ করা হয়েছে।
                </span>
              </div>
              <div className="font-mono text-xl font-black text-emerald-900 bg-white px-4 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                {calculateGrandTotalGpa()}
              </div>
            </div>
          </div>

          {/* Section 5: Extracurricular Activities */}
          {availableActivities.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-[#1e2d7d] pb-3 border-b border-slate-200 uppercase tracking-wider">
                5. Extracurricular Interests & Activities (সহশিক্ষা কার্যক্রম)
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {availableActivities.map((act) => {
                  const isSelected = selectedActivities.includes(act);
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => toggleActivity(act)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {act}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 6: Document Attachments & Required Uploads */}
          <div>
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1e2d7d] uppercase tracking-wider flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  6. Attachments & Required Documents (প্রয়োজনীয় কাগজপত্র ও সনদসমূহ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  প্রতিটি আবশ্যক কাগজের সামনে থাকা <strong>Choose File</strong> বাটনে ক্লিক করে ফাইলটি (PDF বা ছবি) সংযুক্ত করুন।
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                {Object.keys(attachments).length} Files Attached
              </span>
            </div>

            <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="hidden sm:flex items-center justify-between px-4 py-2.5 bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <span className="flex-1">প্রয়োজনীয় কাগজের বিবরণ (Attachment Required)</span>
                <span className="w-80 text-left pl-3">ফাইল নির্বাচন (Choose File)</span>
              </div>

              <div className="divide-y divide-slate-100">
                {REQUIRED_ATTACHMENTS.map((item, idx) => {
                  const file = attachments[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        file ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Left: Attachment Name in one line */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-xs font-mono font-bold text-slate-400 w-5 shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="text-xs sm:text-sm text-slate-800 leading-tight">
                          <span className="font-semibold">{item.label}</span>
                          {item.required ? (
                            <span className="text-red-500 font-bold ml-1">*</span>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal ml-1">(ঐচ্ছিক)</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Choose File directly in front */}
                      <div className="flex items-center gap-2 shrink-0 sm:w-80 justify-start sm:justify-start">
                        <input
                          type="file"
                          id={`file_${item.key}`}
                          accept={item.accept}
                          onChange={(e) => handleAttachmentChange(item.key, e.target.files?.[0])}
                          className="text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-emerald-50 hover:file:text-emerald-700 hover:file:border-emerald-300 cursor-pointer max-w-full"
                        />
                        {file && (
                          <button
                            type="button"
                            onClick={() => {
                              removeAttachment(item.key);
                              const el = document.getElementById(`file_${item.key}`);
                              if (el) el.value = '';
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 7: Undertaking Agreement */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={undertakingAgreed}
                onChange={(e) => setUndertakingAgreed(e.target.checked)}
                className="w-4 h-4 mt-1 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                I hereby declare that all entries and document attachments made in this application are correct, authentic, and complete to the best of my knowledge. I promise to abide by the disciplinary rules of Popular Medical College and the regulatory authorities.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Sending OTP to Mobile...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Verify Mobile OTP &amp; Submit Application (ওটিপি যাচাই করে সাবমিট করুন)</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ==================== ADMISSION OTP VERIFICATION MODAL ==================== */}
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
                    Admission Mobile OTP Verification
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
                প্রার্থী <strong className="font-bold">{formData.candidate_name}</strong>-এর মোবাইল নম্বর{' '}
                <strong className="font-mono text-emerald-950 font-bold">{maskedPhone}</strong>-এ ৬-সংখ্যার অ্যাডমিশন ওটিপি পাঠানো হয়েছে। আবেদনটি চূড়ান্তভাবে জমা দিতে ওটিপি কোডটি প্রবেশ করান।
              </span>
            </div>

            {otpError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Admission OTP <span className="text-red-500">*</span>
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
                <span className="text-[11px] text-slate-400 text-center block mt-1.5 whitespace-pre-line">
                  SMS Format: "Welcome to Popular Medical College.{'\n'}Name : {formData.candidate_name}{'\n'}Admission OTP : [CODE]"
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
                      <span>Verifying & Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP &amp; Confirm Admission</span>
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

      {/* Official A4 Printable Application Form Modal */}
      {showPrintModal && submittedData?.admission && (
        <AdmissionPrintDocument
          admission={submittedData.admission}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}