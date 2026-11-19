import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Printer,
  AlertCircle,
  X,
  UserCheck,
  Trash2,
  Paperclip,
  ExternalLink,
  FileText,
  FileCheck,
  Pencil,
  Save,
  Check,
  FolderOpen
} from 'lucide-react';
import api, { getStorageUrl } from '../../services/api';
import { DEFAULT_SESSIONS } from '../../utils/constants';
import AdmissionPrintDocument from '../AdmissionPrintDocument';
import AdmissionDocumentsModal from './AdmissionDocumentsModal';

export default function AdmissionsManager() {
  const [admissions, setAdmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [sessionOptions, setSessionOptions] = useState(DEFAULT_SESSIONS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Detail Modal
  const [activeAdmission, setActiveAdmission] = useState(null);

  // Print & Document Modals
  const [printAdmissionItem, setPrintAdmissionItem] = useState(null);
  const [docsModalItem, setDocsModalItem] = useState(null);
  const [bulkPrintItems, setBulkPrintItems] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Edit Modal
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editStudentCategory, setEditStudentCategory] = useState('Local Student');
  const [editMigrationOption, setEditMigrationOption] = useState('1st Migration');
  const [editEligibleListNo, setEditEligibleListNo] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(null);

  // Approve Modal
  const [approveItem, setApproveItem] = useState(null);
  const [assignRegNo, setAssignRegNo] = useState('');
  const [assignSession, setAssignSession] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  // Reject Modal
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Load unique sessions
  useEffect(() => {
    api
      .get('/public/data')
      .then((res) => {
        if (res.data?.sessions && Array.isArray(res.data.sessions)) {
          const merged = Array.from(new Set([...res.data.sessions, ...DEFAULT_SESSIONS]));
          setSessionOptions(merged);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admissions', {
        params: {
          status: statusFilter,
          session_name: sessionFilter,
          search,
          page,
          per_page: 15,
        },
      });
      if (res.data.success) {
        setAdmissions(res.data.data.data);
        setTotalPages(res.data.data.last_page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [page, statusFilter, sessionFilter, search]);

  // Bulk Print Handler for Selected Session
  const handleBulkPrint = async () => {
    setBulkLoading(true);
    try {
      const res = await api.get('/admissions', {
        params: {
          session_name: sessionFilter || undefined,
          status: statusFilter || undefined,
          all: 1,
        },
      });

      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : (Array.isArray(res.data?.data?.data) ? res.data.data.data : []);

      if (list.length === 0) {
        alert(
          sessionFilter
            ? `নির্বাচিত সেশন "${sessionFilter}"-এ প্রিন্ট করার মতো কোনো অ্যাডমিশন আবেদন পাওয়া যায়নি।`
            : 'প্রিন্ট করার মতো কোনো অ্যাডমিশন আবেদন পাওয়া যায়নি।'
        );
        return;
      }

      setBulkPrintItems(list);
    } catch (err) {
      console.error(err);
      alert('Failed to load admission applications for bulk printing.');
    } finally {
      setBulkLoading(false);
    }
  };

  const openApprove = (adm) => {
    setApproveItem(adm);
    setAssignRegNo(adm.reg_no || adm.serial_no || '');
    setAssignSession(adm.session_name || '');
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    setApproveLoading(true);
    try {
      await api.post(`/admissions/${approveItem.id}/approve`, {
        reg_no: assignRegNo,
        session_name: assignSession,
      });
      setApproveItem(null);
      fetchAdmissions();
      if (activeAdmission?.id === approveItem.id) {
        setActiveAdmission(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    setRejectLoading(true);
    try {
      await api.post(`/admissions/${rejectItem.id}/reject`, {
        rejection_note: rejectionNote,
      });
      setRejectItem(null);
      setRejectionNote('');
      fetchAdmissions();
      if (activeAdmission?.id === rejectItem.id) {
        setActiveAdmission(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this admission application?')) return;
    try {
      await api.delete(`/admissions/${id}`);
      fetchAdmissions();
      if (activeAdmission?.id === id) setActiveAdmission(null);
    } catch (e) {
      alert('Delete failed');
    }
  };

  // Open Edit Modal with full data populated
  const openEditModal = (adm) => {
    setEditItem(adm);
    setEditError(null);
    setEditSuccess(null);

    const parsedAcademic = Array.isArray(adm.academic_json)
      ? adm.academic_json
      : typeof adm.academic_json === 'string'
      ? JSON.parse(adm.academic_json || '[]')
      : [];

    const defaultAcademic = [
      { exam: 'S.S.C / Equivalent', board: 'Dhaka', roll: '', reg: '', year: '2020', gpa: '' },
      { exam: 'H.S.C / Equivalent', board: 'Dhaka', roll: '', reg: '', year: '2022', gpa: '' },
    ];

    const rawCode = String(adm.college_code || '').trim();
    const isForeigner = /^eligible\s*list/i.test(rawCode) || String(adm.group_name || '').toLowerCase() === 'foreign';

    if (isForeigner && /^eligible\s*list/i.test(rawCode)) {
      setEditStudentCategory('Foreigner Student');
      const extracted = rawCode.replace(/^eligible\s*list\s*:?-?\s*/i, '').trim();
      setEditEligibleListNo(extracted);
      setEditMigrationOption('1st Migration');
    } else if (isForeigner) {
      setEditStudentCategory('Foreigner Student');
      setEditEligibleListNo('');
      setEditMigrationOption('1st Migration');
    } else {
      setEditStudentCategory('Local Student');
      const migrationList = ['1st Migration', '2nd Migration', '3rd Migration', '4th Migration'];
      const matchedMig = migrationList.find((m) => m.toLowerCase() === rawCode.toLowerCase());
      setEditMigrationOption(matchedMig || '1st Migration');
      setEditEligibleListNo('');
    }

    setEditForm({
      candidate_name: adm.candidate_name || '',
      candidate_name_bn: adm.candidate_name_bn || '',
      sex: adm.sex || 'Male',
      session_name: adm.session_name || '',
      group_name: adm.group_name || 'General',
      college_code: rawCode || '1st Migration',
      admission_roll_no: adm.admission_roll_no || '',
      merit_position: adm.merit_position || '',
      merit_score: adm.merit_score || '',
      reg_no: adm.reg_no || '',
      father_name: adm.father_name || '',
      father_name_bn: adm.father_name_bn || '',
      father_occupation: adm.father_occupation || '',
      mother_name: adm.mother_name || '',
      mother_name_bn: adm.mother_name_bn || '',
      mother_occupation: adm.mother_occupation || '',
      guardian_name: adm.guardian_name || '',
      guardian_occupation: adm.guardian_occupation || '',
      date_of_birth: adm.date_of_birth || '',
      religion: adm.religion || 'Islam',
      identification_mark: adm.identification_mark || '',
      nationality: adm.nationality || 'Bangladeshi',
      home_district: adm.home_district || '',
      communication_address: adm.communication_address || '',
      permanent_address: adm.permanent_address || '',
      mobile: adm.mobile || '',
      phone: adm.phone || '',
      email: adm.email || '',
      status: adm.status || 'Pending',
      rejection_note: adm.rejection_note || '',
      academic_json: parsedAcademic.length > 0 ? parsedAcademic : defaultAcademic,
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAcademicChange = (index, field, value) => {
    setEditForm((prev) => {
      const copy = [...(prev.academic_json || [])];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, academic_json: copy };
    });
  };

  const calculateEditGrandTotalGpa = () => {
    const list = Array.isArray(editForm.academic_json) ? editForm.academic_json : [];
    const total = list.reduce((sum, item) => {
      const val = parseFloat(item.gpa_without_4th !== undefined && item.gpa_without_4th !== '' ? item.gpa_without_4th : item.gpa);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    return total > 0 ? total.toFixed(2) : '0.00';
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const res = await api.put(`/admissions/${editItem.id}`, editForm);
      if (res.data.success) {
        setEditSuccess('Admission details updated successfully!');
        fetchAdmissions();
        if (activeAdmission?.id === editItem.id) {
          setActiveAdmission(res.data.data);
        }
        setTimeout(() => {
          setEditItem(null);
          setEditSuccess(null);
        }, 800);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const first = Object.values(err.response.data.errors)[0]?.[0];
        setEditError(first || 'Validation failed');
      } else {
        setEditError(err.response?.data?.message || 'Failed to update application');
      }
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Admission Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, edit, print, approve, and manage incoming online MBBS student admission submissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Filter by Session */}
            <select
              value={sessionFilter}
              onChange={(e) => {
                setSessionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Sessions (সকল সেশন)</option>
              {sessionOptions.map((s) => (
                <option key={s} value={s}>
                  Session: {s}
                </option>
              ))}
            </select>

            {/* Filter by status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Bulk Print Button */}
            <button
              onClick={handleBulkPrint}
              disabled={bulkLoading}
              className="px-3.5 py-2 bg-[#1e2d7d] hover:bg-[#16225e] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all shrink-0"
              title={
                sessionFilter
                  ? `Print all applications for Session: ${sessionFilter}`
                  : 'Print all admission applications'
              }
            >
              {bulkLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{bulkLoading ? 'Loading...' : 'Print All (একসঙ্গে প্রিন্ট)'}</span>
              {sessionFilter && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                  {sessionFilter}
                </span>
              )}
            </button>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search applicant / serial..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Serial / Reg</th>
                <th className="px-5 py-3.5">Applicant Details</th>
                <th className="px-5 py-3.5">Session / Group</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                  </td>
                </tr>
              ) : admissions.length > 0 ? (
                admissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] block w-fit">
                        {adm.serial_no}
                      </span>
                      {adm.reg_no && (
                        <span className="text-[10px] text-emerald-700 font-mono font-bold mt-1 block">
                          Reg: {adm.reg_no}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{adm.candidate_name}</div>
                      {adm.candidate_name_bn && (
                        <div className="text-[11px] text-slate-500">{adm.candidate_name_bn}</div>
                      )}
                      <div className="text-[11px] text-slate-400">Father: {adm.father_name || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {adm.session_name || '—'} {adm.group_name ? `(${adm.group_name})` : ''}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{adm.mobile || adm.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        adm.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : adm.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {adm.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                      {/* View Action */}
                      <button
                        onClick={() => setActiveAdmission(adm)}
                        title="Review Application"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit Action */}
                      <button
                        onClick={() => openEditModal(adm)}
                        title="Edit Application Particulars"
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Print Action (A4 Format) */}
                      <button
                        onClick={() => setPrintAdmissionItem(adm)}
                        title="Print Official MBBS Admission Form"
                        className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Documents Viewer & Bulk Print Action */}
                      <button
                        onClick={() => setDocsModalItem(adm)}
                        title="View & Print Uploaded Documents (ডকুমেন্টসমূহ)"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>

                      {/* Approve / Reject Actions */}
                      {adm.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => openApprove(adm)}
                            title="Approve & Assign Reg"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setRejectItem(adm);
                              setRejectionNote('');
                            }}
                            title="Reject Application"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Delete Action */}
                      <button
                        onClick={() => handleDelete(adm.id)}
                        title="Delete Application"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">
                    No admission applications found matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== ACTIVE ADMISSION DETAIL MODAL ==================== */}
      {activeAdmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                {activeAdmission.photo_path ? (
                  <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-emerald-500/30 shrink-0 shadow-sm bg-slate-100">
                    <img
                      src={getStorageUrl(activeAdmission.photo_path)}
                      alt={activeAdmission.candidate_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">No Photo</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      {activeAdmission.serial_no}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {activeAdmission.session_name || 'Session N/A'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{activeAdmission.candidate_name}</h3>
                  {activeAdmission.candidate_name_bn && (
                    <span className="text-xs text-slate-500 block">{activeAdmission.candidate_name_bn}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEditModal(activeAdmission)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setPrintAdmissionItem(activeAdmission)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Form
                </button>
                <button
                  onClick={() => setDocsModalItem(activeAdmission)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Documents
                </button>
                <button onClick={() => setActiveAdmission(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Details Content */}
            <div className="mt-6 space-y-6 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-medium">Status</span>
                  <span className="font-bold text-slate-900">{activeAdmission.status}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-medium">Gender / DOB</span>
                  <span className="font-semibold text-slate-800">{activeAdmission.sex || '—'} &middot; {activeAdmission.date_of_birth || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-medium">Mobile / Phone</span>
                  <span className="font-mono font-semibold text-slate-800">{activeAdmission.mobile || activeAdmission.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-medium">Group Category</span>
                  <span className="font-semibold text-slate-800">{activeAdmission.group_name || 'General'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-medium">Admission Roll / Merit</span>
                  <span className="font-mono font-semibold text-slate-800">
                    Roll: {activeAdmission.admission_roll_no || '—'} | Pos: {activeAdmission.merit_position || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-medium">Merit Score / Code</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {activeAdmission.merit_score || '—'} ({activeAdmission.college_code || 'PMC'})
                  </span>
                </div>
              </div>

              {/* Parents & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Parents &amp; Guardian</h4>
                  <div>
                    <span className="text-xs text-slate-500 block">Father:</span>
                    <span className="font-semibold">{activeAdmission.father_name || '—'} ({activeAdmission.father_occupation || 'N/A'})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Mother:</span>
                    <span className="font-semibold">{activeAdmission.mother_name || '—'} ({activeAdmission.mother_occupation || 'N/A'})</span>
                  </div>
                  {activeAdmission.guardian_name && (
                    <div>
                      <span className="text-xs text-slate-500 block">Local Guardian:</span>
                      <span className="font-semibold">{activeAdmission.guardian_name} ({activeAdmission.guardian_occupation || 'N/A'})</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Address Information</h4>
                  <div>
                    <span className="text-xs text-slate-500 block">Communication Address:</span>
                    <span className="font-semibold text-xs leading-relaxed">{activeAdmission.communication_address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Permanent Address:</span>
                    <span className="font-semibold text-xs leading-relaxed">{activeAdmission.permanent_address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Home District:</span>
                    <span className="font-semibold text-xs">{activeAdmission.home_district || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Attachments */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  Uploaded Documents &amp; Certificates
                </h4>

                {activeAdmission.attachments_json && Object.keys(activeAdmission.attachments_json).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(activeAdmission.attachments_json).map(([key, att]) => {
                      const fileUrl = getStorageUrl(att.path);
                      return (
                        <div key={key} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors">
                          <div className="flex items-center gap-2.5 truncate">
                            <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-xs text-slate-800 block truncate">{att.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">.{att.extension}</span>
                            </div>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors shrink-0 shadow-2xs"
                            title="Open Document in New Tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No additional document attachments were uploaded with this submission.
                  </div>
                )}
              </div>

              {activeAdmission.status === 'Rejected' && activeAdmission.rejection_note && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <span className="font-bold block">Rejection Reason:</span>
                  <p className="mt-0.5">{activeAdmission.rejection_note}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 no-print">
                <button
                  onClick={() => openEditModal(activeAdmission)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                >
                  Edit Application
                </button>
                {activeAdmission.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => {
                        setRejectItem(activeAdmission);
                        setRejectionNote('');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => openApprove(activeAdmission)}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve Application
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT ADMISSION MODAL ==================== */}
      {editItem && editForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Edit Admission Application
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Serial: {editItem.serial_no} &middot; Candidate: {editItem.candidate_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-6 text-xs">
              {/* 1. Academic & Admission Test Details */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <h4 className="font-bold text-[#1e2d7d] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                  1. Admission Test &amp; Category
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Academic Session *</label>
                    <select
                      value={editForm.session_name}
                      onChange={(e) => handleEditChange('session_name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                    >
                      {DEFAULT_SESSIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Quota / Group *</label>
                    <select
                      value={editForm.group_name}
                      onChange={(e) => handleEditChange('group_name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                    >
                      <option value="General">General</option>
                      <option value="Freedom Fighter">Freedom Fighter</option>
                      <option value="Foreign">Foreign</option>
                      <option value="Poor & Meritorious">Poor &amp; Meritorious</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Assigned Reg No</label>
                    <input
                      type="text"
                      value={editForm.reg_no}
                      onChange={(e) => handleEditChange('reg_no', e.target.value)}
                      placeholder="e.g. 10099"
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>

                {/* Student Type: Local Student (Migrations) vs Foreigner Student (Eligible List) */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1e2d7d]">
                      Student Type (Local / Foreigner)
                    </label>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                      {['Local Student', 'Foreigner Student'].map((type) => {
                        const active = editStudentCategory === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setEditStudentCategory(type);
                              if (type === 'Local Student') {
                                handleEditChange('college_code', editMigrationOption || '1st Migration');
                              } else {
                                const cleanEl = editEligibleListNo.trim();
                                handleEditChange('college_code', cleanEl ? `Eligible List: ${cleanEl}` : 'Eligible List');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {editStudentCategory === 'Local Student' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        Select Migration Stage
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['1st Migration', '2nd Migration', '3rd Migration', '4th Migration'].map((opt) => {
                          const selected = editMigrationOption === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setEditMigrationOption(opt);
                                handleEditChange('college_code', opt);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                                selected
                                  ? 'bg-[#1e2d7d] text-white border-[#1e2d7d] shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <span className="px-3 py-1.5 rounded-xl bg-[#1e2d7d] text-white text-xs font-bold whitespace-nowrap w-fit">
                        Eligible List
                      </span>
                      <input
                        type="text"
                        value={editEligibleListNo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditEligibleListNo(val);
                          const cleanEl = val.trim();
                          handleEditChange('college_code', cleanEl ? `Eligible List: ${cleanEl}` : 'Eligible List');
                        }}
                        placeholder="Enter Eligible List Number (e.g. 125)"
                        className="flex-1 px-3 py-1.5 border rounded-xl bg-white font-mono font-bold text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Admission Test Roll No</label>
                    <input
                      type="text"
                      value={editForm.admission_roll_no}
                      onChange={(e) => handleEditChange('admission_roll_no', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">National Merit Position</label>
                    <input
                      type="text"
                      value={editForm.merit_position}
                      onChange={(e) => handleEditChange('merit_position', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">National Merit Score</label>
                    <input
                      type="text"
                      value={editForm.merit_score}
                      onChange={(e) => handleEditChange('merit_score', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Candidate Particulars */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <h4 className="font-bold text-[#1e2d7d] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                  2. Candidate Particulars
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Candidate Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.candidate_name}
                      onChange={(e) => handleEditChange('candidate_name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Candidate Name (বাংলা)</label>
                    <input
                      type="text"
                      value={editForm.candidate_name_bn}
                      onChange={(e) => handleEditChange('candidate_name_bn', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Gender / Sex</label>
                    <select
                      value={editForm.sex}
                      onChange={(e) => handleEditChange('sex', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editForm.date_of_birth}
                      onChange={(e) => handleEditChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Religion</label>
                    <select
                      value={editForm.religion}
                      onChange={(e) => handleEditChange('religion', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Hinduism">Hinduism</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Christianity">Christianity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Identification Mark</label>
                    <input
                      type="text"
                      value={editForm.identification_mark}
                      onChange={(e) => handleEditChange('identification_mark', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Home District</label>
                    <input
                      type="text"
                      value={editForm.home_district}
                      onChange={(e) => handleEditChange('home_district', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Parents & Guardian */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <h4 className="font-bold text-[#1e2d7d] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                  3. Parents &amp; Guardian Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={editForm.father_name}
                      onChange={(e) => handleEditChange('father_name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Father's Name (বাংলা)</label>
                    <input
                      type="text"
                      value={editForm.father_name_bn}
                      onChange={(e) => handleEditChange('father_name_bn', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Father's Occupation</label>
                    <input
                      type="text"
                      value={editForm.father_occupation}
                      onChange={(e) => handleEditChange('father_occupation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mother's Name</label>
                    <input
                      type="text"
                      value={editForm.mother_name}
                      onChange={(e) => handleEditChange('mother_name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mother's Name (বাংলা)</label>
                    <input
                      type="text"
                      value={editForm.mother_name_bn}
                      onChange={(e) => handleEditChange('mother_name_bn', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mother's Occupation</label>
                    <input
                      type="text"
                      value={editForm.mother_occupation}
                      onChange={(e) => handleEditChange('mother_occupation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Local Guardian's Name</label>
                    <input
                      type="text"
                      value={editForm.guardian_name}
                      onChange={(e) => handleEditChange('guardian_name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Guardian's Occupation</label>
                    <input
                      type="text"
                      value={editForm.guardian_occupation}
                      onChange={(e) => handleEditChange('guardian_occupation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Contact & Address */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <h4 className="font-bold text-[#1e2d7d] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                  4. Contact &amp; Addresses
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={editForm.mobile}
                      onChange={(e) => handleEditChange('mobile', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phone / Telephone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Communication Address</label>
                    <textarea
                      rows={2}
                      value={editForm.communication_address}
                      onChange={(e) => handleEditChange('communication_address', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Permanent Address</label>
                    <textarea
                      rows={2}
                      value={editForm.permanent_address}
                      onChange={(e) => handleEditChange('permanent_address', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Academic Qualifications & GPA */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-[#1e2d7d] uppercase tracking-wider text-[11px]">
                      5. Academic Qualifications &amp; GPA (শিক্ষাগত যোগ্যতা)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Total GPA এবং GPA without 4th Subject আপডেট করুন। Grand Total GPA স্বয়ংক্রিয়ভাবে হিসাব হবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm((prev) => ({
                        ...prev,
                        academic_json: [
                          ...(prev.academic_json || []),
                          { exam: '', board: '', roll: '', reg: '', year: '', gpa: '', gpa_without_4th: '' },
                        ],
                      }));
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold border border-indigo-200 cursor-pointer"
                  >
                    + Add Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-200/70 text-slate-700 font-bold">
                        <th className="p-2 rounded-l-lg">Exam Name</th>
                        <th className="p-2">Board / University</th>
                        <th className="p-2">Roll No</th>
                        <th className="p-2">Reg No</th>
                        <th className="p-2 w-20">Year</th>
                        <th className="p-2 w-24">Total GPA</th>
                        <th className="p-2 w-28 text-emerald-800">GPA w/o 4th</th>
                        <th className="p-2 w-10 rounded-r-lg text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(editForm.academic_json || []).map((row, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.exam || ''}
                              onChange={(e) => handleAcademicChange(idx, 'exam', e.target.value)}
                              placeholder="e.g. S.S.C"
                              className="w-full px-2 py-1 border rounded text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.board || ''}
                              onChange={(e) => handleAcademicChange(idx, 'board', e.target.value)}
                              placeholder="e.g. Dhaka"
                              className="w-full px-2 py-1 border rounded text-xs"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.roll || ''}
                              onChange={(e) => handleAcademicChange(idx, 'roll', e.target.value)}
                              placeholder="Roll"
                              className="w-full px-2 py-1 border rounded text-xs font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.reg || ''}
                              onChange={(e) => handleAcademicChange(idx, 'reg', e.target.value)}
                              placeholder="Reg"
                              className="w-full px-2 py-1 border rounded text-xs font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.year || ''}
                              onChange={(e) => handleAcademicChange(idx, 'year', e.target.value)}
                              placeholder="Year"
                              className="w-full px-2 py-1 border rounded text-xs font-mono"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.gpa || ''}
                              onChange={(e) => handleAcademicChange(idx, 'gpa', e.target.value)}
                              placeholder="5.00"
                              className="w-full px-2 py-1 border rounded text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.gpa_without_4th !== undefined ? row.gpa_without_4th : ''}
                              onChange={(e) => handleAcademicChange(idx, 'gpa_without_4th', e.target.value)}
                              placeholder="5.00"
                              className="w-full px-2 py-1 border border-emerald-300 bg-emerald-50/40 rounded text-xs font-mono font-bold text-emerald-800"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            {(editForm.academic_json || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditForm((prev) => ({
                                    ...prev,
                                    academic_json: prev.academic_json.filter((_, i) => i !== idx),
                                  }));
                                }}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total GPA Live Box */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-900">
                    <span className="font-bold">Grand Total GPA (without 4th Subject এর যোগফল):</span>
                    <span className="text-[11px] text-emerald-700 block">
                      তালিকার সকল পরীক্ষার "GPA without 4th Subject" সরাসরি যোগ হয়ে প্রিন্ট ফর্মে প্রদর্শিত হবে।
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-black text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-xs">
                      {calculateEditGrandTotalGpa()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Status & Rejection Note */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                <h4 className="font-bold text-[#1e2d7d] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                  6. Application Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => handleEditChange('status', e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-white font-bold"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  {editForm.status === 'Rejected' && (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        value={editForm.rejection_note}
                        onChange={(e) => handleEditChange('rejection_note', e.target.value)}
                        placeholder="Reason for declining..."
                        className="w-full px-3 py-2 border rounded-xl bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {editLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes / তথ্য সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Approve Application</h3>
            <p className="text-xs text-slate-500 mb-4">
              Approving will enroll <strong>{approveItem.candidate_name}</strong> into the student register.
            </p>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Assign Student Registration No *
                </label>
                <input
                  type="text"
                  required
                  value={assignRegNo}
                  onChange={(e) => setAssignRegNo(e.target.value)}
                  placeholder="e.g. 10099"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Academic Session
                </label>
                <input
                  type="text"
                  value={assignSession}
                  onChange={(e) => setAssignSession(e.target.value)}
                  placeholder="e.g. 2021-2022"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApproveItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {approveLoading ? 'Processing...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Application</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify the reason for declining <strong>{rejectItem.candidate_name}</strong>'s application.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Rejection Reason / Note *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. Discrepancy in minimum prerequisite GPA marks..."
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                >
                  {rejectLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== OFFICIAL A4 PRINTABLE DOCUMENT MODAL (SINGLE) ==================== */}
      {printAdmissionItem && (
        <AdmissionPrintDocument
          admission={printAdmissionItem}
          onClose={() => setPrintAdmissionItem(null)}
        />
      )}

      {/* ==================== OFFICIAL A4 PRINTABLE DOCUMENT MODAL (BULK SESSION) ==================== */}
      {bulkPrintItems && (
        <AdmissionPrintDocument
          admissions={bulkPrintItems}
          sessionName={sessionFilter}
          onClose={() => setBulkPrintItems(null)}
        />
      )}

      {/* ==================== UPLOADED DOCUMENTS SERIAL VIEWER & BULK PRINT MODAL ==================== */}
      {docsModalItem && (
        <AdmissionDocumentsModal
          admission={docsModalItem}
          onClose={() => setDocsModalItem(null)}
        />
      )}
    </div>
  );
}
