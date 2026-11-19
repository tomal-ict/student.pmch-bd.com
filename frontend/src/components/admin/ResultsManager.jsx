import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  X, 
  Printer, 
  RotateCcw, 
  FileText, 
  BookOpen, 
  Layers, 
  GraduationCap, 
  Calendar, 
  AlertTriangle,
  User,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

export default function ResultsManager() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal State for New Result / Edit Result
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);

  // Student Search / Verification Step
  const [regInput, setRegInput] = useState('');
  const [verifyingStudent, setVerifyingStudent] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  // Result Form Data
  const [formData, setFormData] = useState({
    student_id: '',
    exam_type: '1st Professional',
    exam_month: 'May',
    exam_year: '2024',
    roll_no: '',
    grand_total: '',
    total_hidden: false,
    result_status: 'Passed',
    failed_subjects: '',
    remarks: '',
    marks: DEFAULT_SUBJECTS['1st Professional'],
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Dynamic Curriculum from System Settings
  const [curriculumMap, setCurriculumMap] = useState(DEFAULT_SUBJECTS);

  const fetchCurriculum = async () => {
    try {
      const res = await api.get('/settings');
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
    } catch (err) {
      console.error('Failed to load dynamic curriculum:', err);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  // View Student Full Marksheet / Transcript Modal
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.get('/results', {
        params: { exam_type: examTypeFilter, search, page, per_page: 15 },
      });
      if (res.data.success) {
        setResults(res.data.data.data);
        setTotalPages(res.data.data.last_page);
        setTotalCount(res.data.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [page, examTypeFilter, search]);

  // Open Add Flow: Step 1 asks for Registration ID
  const openAddFlow = (presetReg = '') => {
    fetchCurriculum();
    setEditingResult(null);
    setRegInput(presetReg);
    setVerifiedStudent(null);
    setVerifyError(null);
    setModalError(null);
    setIsModalOpen(true);

    if (presetReg) {
      handleVerifyStudent(presetReg);
    }
  };

  // Verify Student by Registration No
  const handleVerifyStudent = async (regToSearch = regInput) => {
    const reg = trimSafe(regToSearch);
    if (!reg) {
      setVerifyError('Please enter a valid Registration Number');
      return;
    }

    setVerifyingStudent(true);
    setVerifyError(null);

    try {
      const res = await api.get(`/students/by-reg/${encodeURIComponent(reg)}`);
      if (res.data.success && res.data.data) {
        const student = res.data.data;
        setVerifiedStudent(student);

        // Determine eligible professional stages
        // Rule: If already Passed, cannot re-enter! If Referred/Failed or not taken, CAN enter!
        const existingExams = student.exam_results || [];
        const passedStages = existingExams
          .filter(e => e.result_status === 'Passed')
          .map(e => e.exam_type);

        // Pick first eligible stage that is not yet passed
        const firstEligible = PROF_STAGES.find(stage => !passedStages.includes(stage)) || '1st Professional';

        const stageMarks = (curriculumMap[firstEligible] || DEFAULT_SUBJECTS[firstEligible] || [
          { subject_name: '', full_marks: 100, obtained_marks: '' }
        ]).map((s) => ({ ...s }));

        setFormData({
          student_id: student.id,
          exam_type: firstEligible,
          exam_month: 'May',
          exam_year: new Date().getFullYear().toString(),
          roll_no: '',
          grand_total: '',
          total_hidden: false,
          result_status: 'Passed',
          failed_subjects: '',
          remarks: '',
          marks: stageMarks,
        });
      }
    } catch (err) {
      setVerifiedStudent(null);
      if (err.response?.status === 404) {
        setVerifyError(`No registered student found with Registration Number "${reg}". Please check the number or register the student first.`);
      } else {
        setVerifyError(err.response?.data?.message || 'Failed to verify student');
      }
    } finally {
      setVerifyingStudent(false);
    }
  };

  const trimSafe = (str) => (str ? str.trim() : '');

  const openEditModal = (resItem) => {
    setEditingResult(resItem);
    setVerifiedStudent(resItem.student || null);
    setVerifyError(null);
    setModalError(null);

    setFormData({
      student_id: resItem.student_id,
      exam_type: resItem.exam_type,
      exam_month: resItem.exam_month || '',
      exam_year: resItem.exam_year || '',
      roll_no: resItem.roll_no || '',
      grand_total: resItem.grand_total ?? '',
      total_hidden: resItem.total_hidden,
      result_status: resItem.result_status || 'Passed',
      failed_subjects: resItem.failed_subjects || '',
      remarks: resItem.remarks || '',
      marks: resItem.marks?.map((m) => ({
        subject_name: m.subject_name,
        full_marks: m.full_marks,
        obtained_marks: m.obtained_marks ?? '',
      })) || [],
    });
    setIsModalOpen(true);
  };

  const handleExamTypeChange = (newType) => {
    const subjects = (curriculumMap[newType] || DEFAULT_SUBJECTS[newType] || [
      { subject_name: '', full_marks: 100, obtained_marks: '' }
    ]).map((s) => ({ ...s }));

    setFormData({
      ...formData,
      exam_type: newType,
      marks: subjects,
    });
  };

  const handleMarkChange = (index, field, value) => {
    const updated = [...formData.marks];
    updated[index][field] = value;
    
    // Auto-calculate grand total if user is changing obtained_marks
    let sum = 0;
    let anyMarks = false;
    updated.forEach(m => {
      if (m.obtained_marks !== '' && m.obtained_marks !== null && !isNaN(Number(m.obtained_marks))) {
        sum += Number(m.obtained_marks);
        anyMarks = true;
      }
    });

    setFormData({ 
      ...formData, 
      marks: updated,
      grand_total: anyMarks ? sum : formData.grand_total
    });
  };

  const addMarkRow = () => {
    setFormData({
      ...formData,
      marks: [...formData.marks, { subject_name: '', full_marks: 100, obtained_marks: '' }],
    });
  };

  const removeMarkRow = (index) => {
    setFormData({
      ...formData,
      marks: formData.marks.filter((_, i) => i !== index),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    // Frontend validation: Check if student has already passed this stage when adding new
    if (!editingResult && verifiedStudent) {
      const alreadyPassed = (verifiedStudent.exam_results || []).some(
        r => r.exam_type === formData.exam_type && r.result_status === 'Passed'
      );
      if (alreadyPassed) {
        setModalError(`Candidate has already PASSED ${formData.exam_type}. Duplicate or further entries for a passed stage are prohibited.`);
        setModalLoading(false);
        return;
      }
    }

    try {
      if (editingResult) {
        await api.put(`/results/${editingResult.id}`, formData);
      } else {
        await api.post('/results', formData);
      }
      setIsModalOpen(false);
      fetchResults();
    } catch (err) {
      if (err.response?.data?.errors) {
        setModalError(Object.values(err.response.data.errors)[0]?.[0]);
      } else {
        setModalError(err.response?.data?.message || 'Failed to save examination result');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this examination record? All associated subject marks will be removed.')) return;
    try {
      await api.delete(`/results/${id}`);
      fetchResults();
    } catch (e) {
      alert('Delete failed');
    }
  };

  // View Full Chronological History & Marksheet for a Student
  const viewStudentHistory = async (studentId) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/students/${studentId}`);
      if (res.data.success) {
        setHistoryStudent(res.data.data);
      }
    } catch (e) {
      alert('Unable to load student history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Formatted Current Timestamp for Marksheet Print
  const printTimestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate stats for verified student's past attempts
  const pastExams = verifiedStudent?.exam_results || [];
  const passedExamTypes = pastExams.filter(e => e.result_status === 'Passed').map(e => e.exam_type);
  const isSelectedStagePassed = passedExamTypes.includes(formData.exam_type);

  return (
    <div className="space-y-6">
      {/* Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Examination Results & Marksheets</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Popular Medical College
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Record, verify, and print serial-wise professional MBBS examination results. Total {totalCount} examination records.
          </p>
        </div>

        {/* Quick Registration ID Entry Bar right in Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddFlow()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Result</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Registration Lookup Action Bar (Screen Only) */}
      <div className="no-print p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Table Search Filter */}
          <div className="flex-1 flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter results by Student Name, Reg No, or Exam Roll No..."
              className="w-full text-sm bg-transparent focus:outline-none placeholder-slate-400"
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>

          {/* Exam Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Stage:</span>
            <select
              value={examTypeFilter}
              onChange={(e) => {
                setExamTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="">All 4 Prof Stages</option>
              <option value="1st Professional">1st Professional</option>
              <option value="2nd Professional">2nd Professional</option>
              <option value="3rd Professional">3rd Professional</option>
              <option value="Final Professional">Final Professional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table (Screen Only) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#121c52] text-white uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="px-5 py-4">Student Particulars</th>
                <th className="px-5 py-4">Professional Stage</th>
                <th className="px-5 py-4">Roll No</th>
                <th className="px-5 py-4">Session / Month</th>
                <th className="px-5 py-4 text-center">Grand Total</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <span className="inline-block w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                    <p className="text-xs font-medium text-slate-400 mt-2">Loading examination results...</p>
                  </td>
                </tr>
              ) : results.length > 0 ? (
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 block group-hover:text-emerald-700 transition-colors">
                        {r.student?.student_name}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-block mt-0.5">
                        Reg: {r.student?.reg_no}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800 text-xs block">{r.exam_type}</span>
                      {r.failed_subjects && (
                        <span className="text-[10px] text-red-600 font-semibold block truncate max-w-xs" title={r.failed_subjects}>
                          Ref: {r.failed_subjects}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-700 text-xs">
                      {r.roll_no || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs">
                      {r.exam_month ? `${r.exam_month} ` : ''}{r.exam_year || '—'}
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-slate-900">
                      {r.total_hidden ? (
                        <span className="text-slate-400 font-sans italic text-xs">Confidential</span>
                      ) : (
                        r.grand_total ?? '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        r.result_status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : r.result_status === 'Failed'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {r.result_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => viewStudentHistory(r.student_id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-xs border border-indigo-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="View Full Serial Marksheet & History"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Marksheet</span>
                      </button>
                      <button
                        onClick={() => openEditModal(r)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors inline-flex"
                        title="Edit Marks"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors inline-flex"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <p className="font-semibold">No examination results found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your search query or stage filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>Showing Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> (Total {totalCount} results)</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RECORD NEW RESULT MODAL (WITH 2-STEP REGISTRATION ID VERIFICATION)        */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#121c52] text-white flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingResult ? 'Update Examination Result & Marks' : 'Record Professional Examination Result'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingResult ? 'Modifying existing examination entry' : 'Verified Student-Specific Result Entry'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Alert */}
            {modalError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* STEP 1: REGISTRATION ID VERIFICATION (When adding new result) */}
            {!editingResult && !verifiedStudent && (
              <div className="py-6 space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Enter Student Registration ID</span>
                  </p>
                  <p className="text-slate-600">
                    Please provide the student's unique Registration Number. The system will retrieve their academic eligibility and previous attempt history before allowing result entry.
                  </p>
                </div>

                {verifyError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Student Registration Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={regInput}
                        onChange={(e) => setRegInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVerifyStudent();
                          }
                        }}
                        placeholder="e.g. 10095"
                        autoFocus
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={verifyingStudent || !regInput.trim()}
                      onClick={() => handleVerifyStudent()}
                      className="px-5 py-2.5 rounded-xl bg-[#121c52] hover:bg-[#1a2873] text-white font-bold text-xs shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
                    >
                      {verifyingStudent ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Verify & Proceed</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center text-xs text-slate-400">
                  Tip: A student who has already passed a professional exam cannot be entered again for that same exam.
                </div>
              </div>
            )}

            {/* STEP 2: RESULT ENTRY FORM (Once Student is Verified or Editing) */}
            {(verifiedStudent || editingResult) && (
              <form onSubmit={handleSave} className="mt-4 space-y-5">
                
                {/* Verified Student Information Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
                  {!editingResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifiedStudent(null);
                        setRegInput('');
                      }}
                      className="absolute right-3 top-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Change Student</span>
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {verifiedStudent?.student_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{verifiedStudent?.student_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                          Reg: {verifiedStudent?.reg_no}
                        </span>
                        <span className="text-xs text-slate-500">
                          Session: <strong>{verifiedStudent?.session_name || 'N/A'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Past Attempts Summary Bar for this Student */}
                  {pastExams.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                        Previous Examination History for this Candidate:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {pastExams.map((pe, idx) => (
                          <span 
                            key={pe.id || idx} 
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                              pe.result_status === 'Passed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : pe.result_status === 'Referred'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            <span>{pe.exam_type} ({pe.exam_month} {pe.exam_year}):</span>
                            <span className="uppercase text-[10px] font-black">{pe.result_status}</span>
                            {pe.failed_subjects && <span className="text-[10px] text-red-700">({pe.failed_subjects})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Exam Stage Selection with Pass/Fail Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Professional Stage <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.exam_type}
                      onChange={(e) => handleExamTypeChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {PROF_STAGES.map((stage) => {
                        const isPassed = !editingResult && passedExamTypes.includes(stage);
                        const isReferred = !editingResult && pastExams.some(e => e.exam_type === stage && (e.result_status === 'Referred' || e.result_status === 'Failed'));

                        return (
                          <option 
                            key={stage} 
                            value={stage}
                            disabled={isPassed}
                          >
                            {stage} {isPassed ? '✓ (Already Passed - Locked)' : isReferred ? '⚠ (Previous: Referred - Re-entry Allowed)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Examination Roll No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.roll_no}
                      onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                      placeholder="e.g. 4171"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Warning if user selects an already passed stage */}
                {isSelectedStagePassed && !editingResult && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-300 text-xs text-red-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-black">Entry Blocked: Candidate Already Passed this Professional Stage</strong>
                      <p className="mt-0.5">
                        Candidate has already passed <strong>{formData.exam_type}</strong>. Institutional rules strictly forbid recording duplicate passed exams. Please select another stage (e.g. 2nd, 3rd, or Final Prof).
                      </p>
                    </div>
                  </div>
                )}

                {/* Notice if this is a retake after previous Referral/Fail */}
                {!editingResult && pastExams.some(e => e.exam_type === formData.exam_type && (e.result_status === 'Referred' || e.result_status === 'Failed')) && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-black">Re-examination / Supplementary Attempt Record</strong>
                      <p className="mt-0.5">
                        This candidate was previously Referred/Failed in <strong>{formData.exam_type}</strong>. Saving this result will record the new attempt while keeping the previous attempt safely intact in the history and marksheet.
                      </p>
                    </div>
                  </div>
                )}

                {/* Session Month, Year, and Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Month</label>
                    <select
                      value={formData.exam_month}
                      onChange={(e) => setFormData({ ...formData, exam_month: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="January">January</option>
                      <option value="February">February</option>
                      <option value="March">March</option>
                      <option value="April">April</option>
                      <option value="May">May</option>
                      <option value="June">June</option>
                      <option value="July">July</option>
                      <option value="August">August</option>
                      <option value="September">September</option>
                      <option value="October">October</option>
                      <option value="November">November</option>
                      <option value="December">December</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Year</label>
                    <input
                      type="text"
                      value={formData.exam_year}
                      onChange={(e) => setFormData({ ...formData, exam_year: e.target.value })}
                      placeholder="e.g. 2024"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Result Status</label>
                    <select
                      value={formData.result_status}
                      onChange={(e) => setFormData({ ...formData, result_status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Passed">Passed (উত্তীর্ণ)</option>
                      <option value="Referred">Referred (রেফার্ড)</option>
                      <option value="Failed">Failed (অনুত্তীর্ণ)</option>
                    </select>
                  </div>
                </div>

                {/* If Referred or Failed: Specify Referred Subjects */}
                {formData.result_status !== 'Passed' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-800 mb-1">
                      Referred / Failed Subjects <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.failed_subjects}
                      onChange={(e) => setFormData({ ...formData, failed_subjects: e.target.value })}
                      placeholder="e.g. Anatomy, Physiology (Comma separated)"
                      className="w-full px-3 py-2 border border-amber-300 rounded-xl text-sm bg-amber-50/50 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-700 block mt-0.5">
                      Enter the exact subjects the candidate failed or was referred in for institutional reporting.
                    </span>
                  </div>
                )}

                {/* Subject Marks Breakdown */}
                <div className="pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Curriculum Subjects & Marks ({formData.exam_type})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={addMarkRow}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Extra Subject</span>
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {formData.marks.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={m.subject_name}
                          onChange={(e) => handleMarkChange(idx, 'subject_name', e.target.value)}
                          required
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <div className="w-24">
                          <input
                            type="number"
                            placeholder="Full"
                            value={m.full_marks}
                            onChange={(e) => handleMarkChange(idx, 'full_marks', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Obtained"
                            value={m.obtained_marks}
                            onChange={(e) => handleMarkChange(idx, 'obtained_marks', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMarkRow(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Remove subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Grand Total Bar */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Calculated Grand Total:</span>
                    <span className="font-mono text-base font-black text-emerald-800">
                      {formData.grand_total !== '' ? formData.grand_total : '0'} Marks
                    </span>
                  </div>
                </div>

                {/* Remarks & Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Institutional Remarks</label>
                    <input
                      type="text"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="e.g. Regular Candidate / Supplementary Batch"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="total_hidden"
                      checked={formData.total_hidden}
                      onChange={(e) => setFormData({ ...formData, total_hidden: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="total_hidden" className="text-xs text-slate-700 cursor-pointer">
                      Confidential / Hide grand total on public lookup
                    </label>
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading || isSelectedStagePassed}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                  >
                    {modalLoading ? 'Saving...' : editingResult ? 'Update Result' : 'Save Examination Record'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SERIAL-WISE COMPLETE MARKSHEET & TRANSCRIPT MODAL (PRINTABLE)              */}
      {/* ========================================================================= */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:static print:p-0 print:bg-white print:block overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-8 shadow-2xl border border-slate-200 my-auto print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:my-0 max-h-[92vh] overflow-y-auto print:overflow-visible">
            
            {/* Modal Screen Top Bar (Hidden on Print) */}
            <div className="no-print flex items-center justify-between pb-5 border-b border-slate-200 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#121c52] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {historyStudent.student_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{historyStudent.student_name}</h3>
                    <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                      Reg: {historyStudent.reg_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Session: <strong className="text-slate-800">{historyStudent.session_name || 'N/A'}</strong> &middot; Popular Medical College
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Full Marksheet</span>
                </button>
                <button
                  onClick={() => setHistoryStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Container */}
            <div id="printable-student-summary" className="mt-4 sm:mt-6 space-y-6">
              
              {/* College Header for Print */}
              <div className="border-b-2 border-[#121c52] pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center p-1 bg-white border border-slate-200 rounded-xl">
                    <img 
                      src="./logo.png" 
                      alt="Popular Medical College" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = '/student_potal/logo.png';
                      }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h1 className="text-xl sm:text-2xl font-black text-[#1e2d7d] tracking-tight uppercase">
                      Popular Medical College
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      House # 8, Road # 2, Dhanmondi R/A, Dhaka-1205, Bangladesh
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Affiliated with University of Dhaka &middot; Recognized by BM&DC
                    </p>
                    <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 text-[11px] font-black uppercase tracking-wider">
                      Official MBBS Professional Examination Marksheet & Academic Record
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Particulars */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Student Full Name</span>
                    <span className="font-extrabold text-slate-900 text-sm">{historyStudent.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Registration Number</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{historyStudent.reg_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Academic Session</span>
                    <span className="font-bold text-slate-800 text-sm">{historyStudent.session_name || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Contact Mobile</span>
                    <span className="font-mono text-slate-700 font-semibold">{historyStudent.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Father's Name</span>
                    <span className="text-slate-700 font-semibold">{historyStudent.father_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Mother's Name</span>
                    <span className="text-slate-700 font-semibold">{historyStudent.mother_name || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Serial-Wise Comprehensive Examination History Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Chronological / Serial Examination Attempts & Pass-Fail Records</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    Total Attempts Recorded: {historyStudent.exam_results?.length || 0}
                  </span>
                </div>

                {historyStudent.exam_results && historyStudent.exam_results.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121c52] text-white font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3.5 py-3 text-center">Attempt</th>
                          <th className="px-4 py-3">Examination Stage</th>
                          <th className="px-4 py-3">Session / Date</th>
                          <th className="px-4 py-3">Roll No</th>
                          <th className="px-4 py-3 text-center">Marks Obtained</th>
                          <th className="px-4 py-3 text-center">Result Status</th>
                          <th className="px-4 py-3">Referred / Failed Subjects</th>
                          <th className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {historyStudent.exam_results.map((er, idx) => (
                          <tr key={er.id || idx} className="hover:bg-slate-50">
                            <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-500">
                              #{idx + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {er.exam_type}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {er.exam_month} {er.exam_year}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">
                              {er.roll_no || '—'}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                              {er.total_hidden ? (
                                <span className="text-slate-400 font-sans italic">Confidential</span>
                              ) : (
                                er.grand_total ?? '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                er.result_status === 'Passed'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : er.result_status === 'Referred'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}>
                                {er.result_status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {er.failed_subjects ? (
                                <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  {er.failed_subjects}
                                </span>
                              ) : er.result_status === 'Referred' ? (
                                <span className="text-amber-700 font-semibold italic">Referred</span>
                              ) : (
                                <span className="text-slate-400">None (Cleared)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 italic">
                              {er.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    No examination records found.
                  </div>
                )}
              </div>

              {/* Subject-Wise Marks Breakdown Matrix for all attempts */}
              {historyStudent.exam_results && historyStudent.exam_results.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Subject-Wise Marks Breakdown per Attempt</span>
                  </h4>

                  <div className="space-y-4">
                    {historyStudent.exam_results.map((er, idx) => (
                      <div key={er.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-slate-200 gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-500 mr-2">
                              [Attempt #{idx + 1}]
                            </span>
                            <span className="font-extrabold text-sm text-[#1e2d7d]">
                              {er.exam_type} ({er.exam_month} {er.exam_year})
                            </span>
                            <span className="ml-2 font-mono text-xs text-slate-600">
                              Roll No: <strong>{er.roll_no || 'N/A'}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              Grand Total: <strong className="font-mono text-slate-900">{er.total_hidden ? 'Confidential' : er.grand_total ?? 'N/A'}</strong>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              er.result_status === 'Passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {er.result_status}
                            </span>
                          </div>
                        </div>

                        {/* Subject Marks Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                              <tr>
                                <th className="px-3 py-2">Subject Name</th>
                                <th className="px-3 py-2 text-center">Full Marks</th>
                                <th className="px-3 py-2 text-center">Obtained Marks</th>
                                <th className="px-3 py-2 text-center">Percentage</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {er.marks && er.marks.length > 0 ? (
                                er.marks.map((m) => {
                                  const pct = m.full_marks && m.obtained_marks !== null
                                    ? ((m.obtained_marks / m.full_marks) * 100).toFixed(1)
                                    : null;
                                  const isPass = m.obtained_marks !== null && (pct === null || Number(pct) >= 60);

                                  return (
                                    <tr key={m.id} className="hover:bg-slate-50/50">
                                      <td className="px-3 py-2 font-semibold text-slate-800">{m.subject_name}</td>
                                      <td className="px-3 py-2 text-center font-mono text-slate-600">{m.full_marks ?? '—'}</td>
                                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-900">
                                        {m.obtained_marks !== null ? m.obtained_marks : '—'}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono text-slate-600">
                                        {pct ? `${pct}%` : '—'}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          m.obtained_marks === null 
                                            ? 'text-slate-400' 
                                            : isPass 
                                            ? 'bg-emerald-50 text-emerald-700' 
                                            : 'bg-red-50 text-red-700'
                                        }`}>
                                          {m.obtained_marks === null ? '—' : isPass ? 'Pass' : 'Referred'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="5" className="text-center py-2 text-slate-400">
                                    No subject marks detailed for this examination.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Signatures Block */}
              <div className="pt-16 mt-8 border-t-2 border-slate-300">
                <div className="grid grid-cols-2 gap-8 text-xs text-slate-800">
                  {/* Left: Printed By */}
                  <div>
                    <div className="w-56 border-t-2 border-slate-800 pt-2">
                      <div className="font-black text-sm uppercase text-slate-900">
                        Printed By
                      </div>
                      <div className="text-slate-600 font-semibold mt-0.5">
                        Officer: {user?.display_name || user?.username || 'Administrative Officer'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Date & Time: {printTimestamp}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                        Examination Records Section
                      </div>
                    </div>
                  </div>

                  {/* Right: Authority */}
                  <div className="flex justify-end">
                    <div className="w-56 border-t-2 border-slate-800 pt-2 text-right">
                      <div className="font-black text-sm uppercase text-[#1e2d7d]">
                        Authority
                      </div>
                      <div className="text-slate-700 font-semibold mt-0.5">
                        Principal & Academic Head
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Popular Medical College, Dhaka
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                        Official Seal & Signature
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions on Screen View */}
            <div className="no-print mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Popular Medical College Student Information System &middot; Official Examination Records
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Full Marksheet</span>
                </button>
                <button
                  onClick={() => setHistoryStudent(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
