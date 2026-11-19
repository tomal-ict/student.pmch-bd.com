import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, XCircle, Award } from 'lucide-react';
import api from '../../services/api';

export default function ReportsManager() {
  const [examType, setExamType] = useState('');
  const [examYear, setExamYear] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/summary', {
        params: { exam_type: examType, exam_year: examYear },
      });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [examType, examYear]);

  const handleDownloadCsv = () => {
    const baseUrl = api.defaults.baseURL || '/student_potal/backend/public/api';
    const token = localStorage.getItem('token');
    const url = `${baseUrl}/reports/download-csv?exam_type=${encodeURIComponent(examType)}&exam_year=${encodeURIComponent(examYear)}`;
    
    // Download via window.open or fetch
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'exam_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { summary, results } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Reports & Tabulation</h2>
          <p className="text-sm text-slate-500 mt-0.5">Filter official records, analyze pass/fail metrics, and export CSV sheets.</p>
        </div>
        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Tabulation</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Exam Type</label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none"
          >
            <option value="">All Examination Tiers</option>
            <option value="1st Professional">1st Professional</option>
            <option value="2nd Professional">2nd Professional</option>
            <option value="3rd Professional">3rd Professional</option>
            <option value="Final Professional">Final Professional</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Exam Year</label>
          <input
            type="text"
            value={examYear}
            onChange={(e) => setExamYear(e.target.value)}
            placeholder="e.g. 2022 (leave blank for all)"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500">Total Examined</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">{summary.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-emerald-600">Passed Candidates</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-2 font-mono">{summary.passed}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-red-600">Referred / Failed</span>
            <p className="text-2xl font-extrabold text-red-600 mt-2 font-mono">{summary.failed}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase text-indigo-600">Pass Percentage</span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-2 font-mono">{summary.pass_rate}%</p>
          </div>
        </div>
      )}

      {/* Results Tabulation Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Tabulation Preview</h3>
          <span className="text-xs text-slate-500">{results?.length || 0} candidate row(s)</span>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold sticky top-0">
              <tr>
                <th className="p-3">Reg No</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Exam Type</th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Month / Year</th>
                <th className="p-3 text-center">Grand Total</th>
                <th className="p-3 text-center">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results && results.length > 0 ? (
                results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-blue-700">{r.student?.reg_no}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.student?.student_name}</td>
                    <td className="p-3 text-slate-700">{r.exam_type}</td>
                    <td className="p-3 font-mono text-slate-600">{r.roll_no || '—'}</td>
                    <td className="p-3 text-slate-600">{r.exam_month} {r.exam_year}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {r.total_hidden ? 'Hidden' : r.grand_total ?? '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        r.result_status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {r.result_status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    No matching records to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
