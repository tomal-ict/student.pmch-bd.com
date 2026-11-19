import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Printer, 
  Award, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  AlertTriangle,
  GraduationCap,
  Layers,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PROF_STAGES = [
  '1st Professional',
  '2nd Professional',
  '3rd Professional',
  'Final Professional'
];

export default function StudentsManager() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    reg_no: '',
    student_name: '',
    session_name: '',
    phone: '',
    father_name: '',
    mother_name: '',
    address: '',
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);

  // View Student Academic History Modal
  const [viewingStudent, setViewingStudent] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    api.get('/settings/public')
      .then((res) => {
        if (res.data.success && res.data.sessions) {
          setSessionsList(res.data.sessions);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: { search, page, per_page: 15 },
      });
      if (res.data.success) {
        setStudents(res.data.data.data);
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
    fetchStudents();
  }, [page, search]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      reg_no: '',
      student_name: '',
      session_name: '',
      phone: '',
      father_name: '',
      mother_name: '',
      address: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      reg_no: student.reg_no,
      student_name: student.student_name,
      session_name: student.session_name || '',
      phone: student.phone || '',
      father_name: student.father_name || '',
      mother_name: student.mother_name || '',
      address: student.address || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      if (err.response?.data?.errors) {
        setModalError(Object.values(err.response.data.errors)[0]?.[0]);
      } else {
        setModalError(err.response?.data?.message || 'Failed to save student record');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"? All associated examination marks will also be permanently removed.`)) {
      return;
    }

    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete operation failed');
    }
  };

  const viewDetails = async (id) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/students/${id}`);
      if (res.data.success) {
        setViewingStudent(res.data.data);
      }
    } catch (e) {
      alert('Unable to load student examination history');
    } finally {
      setViewLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper stats for viewingStudent
  const examResults = viewingStudent?.exam_results || [];
  const totalExams = examResults.length;
  const passedExams = examResults.filter(r => r.result_status === 'Passed').length;
  const referredExams = examResults.filter(r => r.result_status === 'Referred').length;
  const failedExams = examResults.filter(r => r.result_status === 'Failed').length;

  // Formatted Current Timestamp for Print
  const printTimestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-6">
      {/* Directory Header (Screen Only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Records & Examination History</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Popular Medical College
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Total {totalCount} registered students. Each student has a unique profile with consolidated 4-Prof history.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll New Student</span>
        </button>
      </div>

      {/* Filter / Search Bar (Screen Only) */}
      <div className="no-print p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by Registration No, Student Name, Phone, Father's Name..."
          className="w-full bg-transparent text-sm focus:outline-none placeholder-slate-400"
        />
        {search && (
          <button 
            onClick={() => setSearch('')} 
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table (Screen Only) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#121c52] text-white uppercase text-[11px] tracking-wider font-bold">
              <tr>
                <th className="px-5 py-4">Reg No</th>
                <th className="px-5 py-4">Student Name</th>
                <th className="px-5 py-4">Session</th>
                <th className="px-5 py-4">Phone Number</th>
                <th className="px-5 py-4 text-center">Exam History</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <span className="inline-block w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                    <p className="text-xs font-medium text-slate-400 mt-2">Loading student records...</p>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((st) => (
                  <tr 
                    key={st.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-emerald-800">
                      <span className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                        {st.reg_no}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {st.student_name}
                      </div>
                      {st.father_name && (
                        <div className="text-[11px] text-slate-400">
                          S/O or D/O {st.father_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-600 font-medium text-xs">
                        {st.session_name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {st.phone || '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        (st.exam_results_count || 0) > 0 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{st.exam_results_count || 0} Exam Record(s)</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => viewDetails(st.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs border border-emerald-200 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="View Complete Academic History & Print Summary"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Academic Summary</span>
                      </button>
                      <button
                        onClick={() => openEditModal(st)}
                        title="Edit Student Profile"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(st.id, st.student_name)}
                        title="Delete Student"
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <p className="font-semibold">No matching student records found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try searching by student name, registration number, or phone.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>Showing Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> (Total {totalCount} students)</span>
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

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {editingStudent ? 'Edit Student Details' : 'Enroll New Student'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Registration No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reg_no}
                    onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. 10095"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Session</label>
                  <select
                    value={formData.session_name}
                    onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Session...</option>
                    {sessionsList.map((s, idx) => (
                      <option key={s} value={s}>
                        {s} {idx === 0 ? '★ (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Student Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Full name as per official matriculation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Mother's Name</label>
                <input
                  type="text"
                  value={formData.mother_name}
                  onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Permanent Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Village/Road, Thana/Upazila, District"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer shadow-sm transition-colors"
                >
                  {modalLoading ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPLETE STUDENT ACADEMIC HISTORY & PRINTABLE SHORT SUMMARY MODAL          */}
      {/* ========================================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:static print:p-0 print:bg-white print:block overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-8 shadow-2xl border border-slate-200 my-auto print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:my-0 max-h-[92vh] overflow-y-auto print:overflow-visible">
            
            {/* Modal Screen Top Bar (Hidden on Print) */}
            <div className="no-print flex items-center justify-between pb-5 border-b border-slate-200 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#121c52] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {viewingStudent.student_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{viewingStudent.student_name}</h3>
                    <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                      Reg: {viewingStudent.reg_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Session: <strong className="text-slate-800">{viewingStudent.session_name || 'N/A'}</strong> &middot; Popular Medical College
                  </p>
                </div>
              </div>

              {/* Top Buttons: Print Summary & Close */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Short Summary</span>
                </button>
                <button
                  onClick={() => setViewingStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* OFFICIAL PRINTABLE DOCUMENT CONTENT                                */}
            {/* Visible on Screen AND Beautifully Formatted for Print A4 Paper      */}
            {/* =================================================================== */}
            <div id="printable-student-summary" className="mt-4 sm:mt-6 space-y-6">
              
              {/* Official College Header (Prominent on Print & Clean on Screen) */}
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
                      Student Academic & Professional Examination Performance Summary
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Particulars Information Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Student Full Name</span>
                    <span className="font-extrabold text-slate-900 text-sm">{viewingStudent.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Registration Number</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{viewingStudent.reg_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Academic Session</span>
                    <span className="font-bold text-slate-800 text-sm">{viewingStudent.session_name || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Contact Mobile</span>
                    <span className="font-mono text-slate-700 font-semibold">{viewingStudent.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Father's Name</span>
                    <span className="text-slate-700 font-semibold">{viewingStudent.father_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Mother's Name</span>
                    <span className="text-slate-700 font-semibold">{viewingStudent.mother_name || '—'}</span>
                  </div>
                  {viewingStudent.address && (
                    <div className="sm:col-span-3">
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Permanent Address</span>
                      <span className="text-slate-700">{viewingStudent.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Academic Performance KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Attempts</span>
                  <span className="text-2xl font-black text-slate-800">{totalExams}</span>
                  <span className="text-[10px] text-slate-500 block">Prof Exam(s)</span>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-2xs text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Passed</span>
                  <span className="text-2xl font-black text-emerald-700">{passedExams}</span>
                  <span className="text-[10px] text-emerald-600 block">Exam(s) Cleared</span>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-2xs text-center ${
                  referredExams > 0 ? 'border-amber-300 bg-amber-50/80' : 'border-slate-200 bg-white'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    referredExams > 0 ? 'text-amber-800' : 'text-slate-400'
                  }`}>
                    Referred Count
                  </span>
                  <span className={`text-2xl font-black ${referredExams > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                    {referredExams}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Stage(s) Referred</span>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-2xs text-center ${
                  failedExams > 0 ? 'border-red-300 bg-red-50/80' : 'border-slate-200 bg-white'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    failedExams > 0 ? 'text-red-800' : 'text-slate-400'
                  }`}>
                    Failed Count
                  </span>
                  <span className={`text-2xl font-black ${failedExams > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                    {failedExams}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Stage(s) Failed</span>
                </div>
              </div>

              {/* 4 Professional Examination Stages Matrix */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>MBBS 4-Professional Examinations Progression</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Curriculum prescribed by University of Dhaka & BM&DC
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {PROF_STAGES.map((profName, idx) => {
                    // Match exam results for this prof stage
                    const stageAttempts = examResults.filter(
                      r => r.exam_type?.toLowerCase().includes(profName.toLowerCase()) ||
                           (profName === '1st Professional' && r.exam_type?.includes('1st')) ||
                           (profName === '2nd Professional' && r.exam_type?.includes('2nd')) ||
                           (profName === '3rd Professional' && r.exam_type?.includes('3rd')) ||
                           (profName === 'Final Professional' && r.exam_type?.includes('Final'))
                    );

                    const hasPassed = stageAttempts.some(r => r.result_status === 'Passed');
                    const hasReferred = stageAttempts.some(r => r.result_status === 'Referred');
                    const hasFailed = stageAttempts.some(r => r.result_status === 'Failed');
                    const isAppeared = stageAttempts.length > 0;

                    let statusBadgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
                    let statusLabel = 'Not Appeared';

                    if (hasPassed) {
                      statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      statusLabel = 'Passed';
                    } else if (hasReferred) {
                      statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                      statusLabel = 'Referred';
                    } else if (hasFailed) {
                      statusBadgeClass = 'bg-red-100 text-red-800 border-red-300';
                      statusLabel = 'Failed';
                    } else if (isAppeared) {
                      statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                      statusLabel = 'Record Available';
                    }

                    return (
                      <div 
                        key={profName}
                        className={`p-3 rounded-xl border transition-all ${
                          hasPassed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-400">Step {idx + 1}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusBadgeClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {profName}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isAppeared ? `${stageAttempts.length} attempt(s) recorded` : 'Awaiting candidate'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Consolidated 4-Professional Examination Summary Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Recorded Examination Results & Pass/Fail History</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    Total Records: {examResults.length}
                  </span>
                </div>

                {examResults.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121c52] text-white font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Examination</th>
                          <th className="px-4 py-3">Session / Date</th>
                          <th className="px-4 py-3">Roll No</th>
                          <th className="px-4 py-3 text-center">Marks Obtained</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3">Referred / Failed Subjects</th>
                          <th className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {examResults.map((er, i) => (
                          <tr key={er.id || i} className="hover:bg-slate-50">
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
                                <span className="text-amber-700 font-semibold italic">Referred in examination</span>
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
                    No examination records found for this student.
                  </div>
                )}
              </div>

              {/* Detailed Subject Marks Breakdown for Each Examination */}
              {examResults.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Subject-Wise Marks Breakdown Matrix</span>
                  </h4>

                  <div className="space-y-4">
                    {examResults.map((er) => (
                      <div key={er.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-slate-200 gap-2">
                          <div>
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

                        {/* Subject Marks Grid */}
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

              {/* =============================================================== */}
              {/* MANDATORY SIGNATURES BLOCK (As explicitly requested by USER):   */}
              {/* "নিচে অথরিটি অ্যান্ড প্রিন্টিং বাই এই লেখা দুটো থাকবে সিগনেচার করার জন্য।" */}
              {/* =============================================================== */}
              <div className="pt-16 mt-8 border-t-2 border-slate-300">
                <div className="grid grid-cols-2 gap-8 text-xs text-slate-800">
                  {/* Left Signature: Printed By */}
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
                        Examination & Records Section
                      </div>
                    </div>
                  </div>

                  {/* Right Signature: Authority */}
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

            {/* Bottom Actions on Screen View (Hidden on Print) */}
            <div className="no-print mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Popular Medical College Student Information System &middot; Confidential Academic Record
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Short Summary</span>
                </button>
                <button
                  onClick={() => setViewingStudent(null)}
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
