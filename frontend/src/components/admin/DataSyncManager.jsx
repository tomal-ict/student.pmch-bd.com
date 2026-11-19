import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDriveDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Table2,
  FolderArchive,
  Clock,
  Layers,
  GitMerge,
} from 'lucide-react';
import api from '../../services/api';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function DataSyncManager() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [syncReport, setSyncReport] = useState(null);
  const [downloadingSql, setDownloadingSql] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/data-sync/status');
      if (res.data?.success) {
        setStatus(res.data);
      }
    } catch (err) {
      setError('Failed to load database sync status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    setError(null);
    setMessage(null);
    setSyncReport(null);

    try {
      const res = await api.post('/settings/data-sync/backup');
      if (res.data?.success) {
        setMessage(
          `ব্যাকআপ সম্পন্ন! ${res.data.meta?.table_count || 0}টি টেবিল (${res.data.meta?.total_rows || 0}টি রেকর্ড) সোর্স কোডের backup/ ফোল্ডারে সংরক্ষিত হয়েছে।`
        );
        await fetchStatus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ডাটাবেজ ব্যাকআপ করতে সমস্যা হয়েছে।');
    } finally {
      setBackingUp(false);
    }
  };

  const handleSynchronize = async () => {
    if (
      !window.confirm(
        'আপনি কি সোর্স কোডের backup/ ফোল্ডার থেকে বর্তমান ডাটাবেজে সিঙ্ক্রোনাইজ ও মার্জ করতে চান?\n\nএটি মিসিং টেবিল, মিসিং কলাম এবং মিসিং ডাটা বর্তমান ডাটাবেজে নিরাপদভাবে মার্জ করবে (বিদ্যমান কোনো ডাটা মুছে যাবে না)।'
      )
    ) {
      return;
    }

    setSyncing(true);
    setError(null);
    setMessage(null);
    setSyncReport(null);

    try {
      const res = await api.post('/settings/data-sync/synchronize');
      if (res.data?.success) {
        setMessage(res.data.message);
        setSyncReport(res.data.report);
        await fetchStatus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ডাটাবেজ সিঙ্ক্রোনাইজ করতে সমস্যা হয়েছে।');
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadSql = async (fileName) => {
    setDownloadingSql(fileName);
    try {
      const res = await api.get(`/settings/data-sync/download/${encodeURIComponent(fileName)}`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      alert('SQL ফাইলটি ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setDownloadingSql(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="p-12 text-center">
        <span className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-xs text-slate-500 mt-3 font-medium">Loading Database Sync Status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Header & Action Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#1e2d7d] shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Data Backup &amp; Smart Synchronize (ডাটা সিঙ্ক্রোনাইজ)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                বর্তমান ডাটাবেজটি সোর্স কোডের <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700">backup/</code> ফোল্ডারে ব্যাকআপ রাখুন। পরবর্তীতে নতুন কোনো সার্ভারে (VPS / cPanel / aaPanel) কোড আপলোড করে <strong>Synchronize</strong> বাটনে ক্লিক করলে মিসিং টেবিল, কলাম এবং নতুন ডাটা স্বয়ংক্রিয়ভাবে মার্জ হয়ে যাবে।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleBackup}
              disabled={backingUp || syncing}
              className="px-5 py-3 rounded-2xl bg-[#1e2d7d] hover:bg-[#16225e] active:scale-95 text-white font-extrabold text-xs shadow-md shadow-indigo-900/20 flex items-center gap-2 cursor-pointer disabled:opacity-60 transition-all"
            >
              {backingUp ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <HardDriveDownload className="w-4 h-4 text-emerald-400" />
              )}
              <span>{backingUp ? 'Backing Up...' : 'Backup Database (ব্যাকআপ)'}</span>
            </button>

            <button
              type="button"
              onClick={handleSynchronize}
              disabled={syncing || backingUp || !status?.backup_exists}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              title={!status?.backup_exists ? 'প্রথমে ব্যাকআপ তৈরি করুন' : 'Sync & Merge missing tables, columns & rows'}
            >
              {syncing ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <GitMerge className="w-4 h-4" />
              )}
              <span>{syncing ? 'Synchronizing...' : 'Synchronize (সিঙ্ক্রোনাইজ)'}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{message}</span>
          </div>
        )}

        {/* Comparison Grid: Live DB vs Backup Snapshot */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Live Database Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Current Live Database
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {status?.live_db?.database_name || 'MySQL'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Tables</span>
                <span className="text-xl font-extrabold font-mono text-slate-900">
                  {status?.live_db?.table_count || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Records</span>
                <span className="text-xl font-extrabold font-mono text-emerald-700">
                  {status?.live_db?.total_rows || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Backup Snapshot Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1e2d7d] flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4 text-indigo-600" />
                Source Code Backup (`backup/`)
              </span>
              {status?.backup_exists ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  Ready to Sync
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  No Backup Yet
                </span>
              )}
            </div>

            {status?.backup_exists && status?.sync_meta ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Backup Tables</span>
                  <span className="text-lg font-extrabold font-mono text-slate-900">
                    {status.sync_meta.table_count || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Backup Rows</span>
                  <span className="text-lg font-extrabold font-mono text-indigo-700">
                    {status.sync_meta.total_rows || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Last Updated</span>
                  <span className="text-[11px] font-mono font-bold text-slate-700 block mt-0.5 leading-tight">
                    {status.sync_meta.generated_at}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white border border-dashed border-indigo-200 text-center text-xs text-slate-500">
                এখনো কোনো ব্যাকআপ ফাইল তৈরি করা হয়নি। উপরে <strong>"Backup Database"</strong> বাটনে ক্লিক করুন।
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Result Report */}
      {syncReport && (
        <div className="bg-white rounded-3xl border border-emerald-300 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Synchronization &amp; Merge Report
            </h4>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                New Rows Inserted: {syncReport.total_rows_inserted}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                Existing Skipped: {syncReport.total_rows_skipped}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Missing Tables Created:</span>
              {syncReport.tables_created?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {syncReport.tables_created.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                      + {t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">None (all tables already existed)</span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Missing Columns Added:</span>
              {syncReport.columns_added?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {syncReport.columns_added.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold">
                      + {c}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">None (all columns already matched)</span>
              )}
            </div>
          </div>

          {/* Per-table breakdown */}
          {syncReport.tables_synced && Object.keys(syncReport.tables_synced).length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Table Name</th>
                    <th className="px-4 py-2.5 text-center">Rows in Backup</th>
                    <th className="px-4 py-2.5 text-center text-emerald-700">New Rows Merged</th>
                    <th className="px-4 py-2.5 text-center text-slate-500">Already Existed (Skipped)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(syncReport.tables_synced).map(([tbl, stats]) => (
                    <tr key={tbl} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-mono font-bold text-slate-800">{tbl}</td>
                      <td className="px-4 py-2 text-center font-mono">{stats.total_in_backup}</td>
                      <td className="px-4 py-2 text-center font-mono font-bold text-emerald-700">
                        +{stats.inserted}
                      </td>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{stats.skipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SQL Backup Files Archive */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-indigo-600" />
            Saved SQL Backups in <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">backup/</code>
          </h4>
          <button
            type="button"
            onClick={fetchStatus}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {status?.sql_files?.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {status.sql_files.map((file) => (
              <div
                key={file.name}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-mono font-bold text-[10px]">
                    SQL
                  </div>
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-800 block">{file.name}</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {file.modified_at} &middot; {formatBytes(file.size)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSql(file.name)}
                  disabled={downloadingSql === file.name}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingSql === file.name ? 'Downloading...' : 'Download .SQL'}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            কোনো .SQL ব্যাকআপ ফাইল এখনো সংরক্ষিত নেই।
          </div>
        )}
      </div>
    </div>
  );
}
