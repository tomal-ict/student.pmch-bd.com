import React, { useEffect, useState } from 'react';
import { Users, Award, FileText, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import api from '../../services/api';

export default function AdminDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-2">Loading administrative analytics...</p>
      </div>
    );
  }

  const { stats, exam_stats, recent_admissions, recent_results } = data || {};

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Administrative Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">High-level institutional performance and recent activity log.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => onNavigate('students')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrolled Students</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{stats?.total_students || 0}</span>
          </div>
          <p className="text-xs text-blue-600 font-medium mt-2">Manage Student Records &rarr;</p>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => onNavigate('results')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Exam Results</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{stats?.total_results || 0}</span>
          </div>
          <p className="text-xs text-indigo-600 font-medium mt-2">View & Edit Marks &rarr;</p>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => onNavigate('admissions')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Admissions</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 font-mono">{stats?.pending_admissions || 0}</span>
            <span className="text-xs text-slate-400 font-mono">/ {stats?.total_admissions || 0} Total</span>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-2">Review Applications &rarr;</p>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Institutional Pass Rate</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">{stats?.pass_rate || 0}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Aggregated across all professional sessions</p>
        </div>
      </div>

      {/* Two Column Layout: Exam Distributions & Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exam Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            Examination Breakdown
          </h3>
          <div className="space-y-3">
            {exam_stats && exam_stats.length > 0 ? (
              exam_stats.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm font-semibold text-slate-800">{item.exam_type}</span>
                  <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {item.count} Record(s)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No examination records yet.</p>
            )}
          </div>
        </div>

        {/* Recent Admissions */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Recent Admission Inquiries
            </h3>
            <button
              onClick={() => onNavigate('admissions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recent_admissions && recent_admissions.length > 0 ? (
              recent_admissions.map((adm) => (
                <div key={adm.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{adm.candidate_name}</span>
                    <span className="text-xs font-mono text-slate-500">{adm.serial_no} &middot; {adm.mobile}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    adm.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : adm.status === 'Rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {adm.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No recent admission applications.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
