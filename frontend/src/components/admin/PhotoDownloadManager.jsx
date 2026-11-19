import React, { useState, useEffect } from 'react';
import {
  ImageDown,
  Search,
  Download,
  FolderArchive,
  User,
  Calendar,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import api, { getStorageUrl } from '../../services/api';
import { DEFAULT_SESSIONS } from '../../utils/constants';

const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function PhotoDownloadManager() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');
  const [sessionOptions, setSessionOptions] = useState(DEFAULT_SESSIONS);
  const [search, setSearch] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Load dynamic session list
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

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admissions/photos/list', {
        params: {
          session_name: sessionFilter || undefined,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) {
        setPhotos(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load admission photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [sessionFilter, search]);

  // Download single photo named as Admission ID (e.g. PMC202601.jpg)
  const handleDownloadSingle = async (item) => {
    setDownloadingId(item.id);
    try {
      const res = await api.get(`/admissions/${item.id}/download-photo`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', item.download_filename || `${item.serial_no}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('ছবি ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setDownloadingId(null);
    }
  };

  // Bulk download all filtered/session photos as ZIP (every photo named as Admission ID)
  const handleDownloadAllZip = async () => {
    if (photos.length === 0) {
      alert('ডাউনলোড করার মতো কোনো ছবি পাওয়া যায়নি।');
      return;
    }

    setZipLoading(true);
    try {
      const res = await api.get('/admissions/photos/download-zip', {
        params: {
          session_name: sessionFilter || undefined,
          search: search.trim() || undefined,
        },
        responseType: 'blob',
      });

      const sessionSlug = sessionFilter ? sessionFilter.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Sessions';
      const zipName = `PMC_Student_Photos_${sessionSlug}.zip`;

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', zipName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('একত্রে ZIP ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <ImageDown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Student Photo Download (ফটো ডাউনলোড)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                অ্যাডমিশনের সময় আপলোড করা সব শিক্ষার্থীর ছবি এখানে সংরক্ষিত আছে। সেশন বা অ্যাডমিশন আইডি দিয়ে খুঁজে একত্রে (ZIP) অথবা আলাদা আলাদা ডাউনলোড করুন।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Session Filter */}
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Sessions (সকল সেশন)</option>
              {sessionOptions.map((s) => (
                <option key={s} value={s}>
                  Session: {s}
                </option>
              ))}
            </select>

            {/* Search by Admission ID / Name */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Admission ID (e.g. PMC202601)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={fetchPhotos}
              disabled={loading}
              title="Refresh Photos"
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Bulk Download All ZIP Button */}
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={zipLoading || photos.length === 0}
              className="px-4 py-2 bg-[#1e2d7d] hover:bg-[#16225e] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-900/15 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all shrink-0"
            >
              {zipLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <FolderArchive className="w-4 h-4 text-emerald-400" />
              )}
              <span>
                {zipLoading
                  ? 'Creating ZIP...'
                  : `Download All (${photos.length})`}
              </span>
              {sessionFilter && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                  {sessionFilter}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Naming Info Banner */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-emerald-600" />
            <span>
              একসঙ্গে বা সিঙ্গেল ডাউনলোড করলে প্রতিটি ছবির ফাইলের নাম স্বয়ংক্রিয়ভাবে শিক্ষার্থীর{' '}
              <strong className="text-slate-800 font-mono">Admission ID</strong> অনুযায়ী হবে (যেমন:{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">PMC202601.jpg</code>)।
            </span>
          </div>
          <div className="font-mono font-bold text-slate-700">
            Total Photos: <span className="text-emerald-700">{photos.length}</span>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <span className="inline-block w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading student photos...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <ImageDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">কোনো শিক্ষার্থীর ছবি পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1">
            নির্বাচিত সেশন বা সার্চ আইডি অনুযায়ী কোনো আপলোড করা ছবি নেই।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {photos.map((item) => {
            const imgUrl = getStorageUrl(item.photo_path);
            const isDownloading = downloadingId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col group"
              >
                {/* Photo Thumbnail */}
                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={item.candidate_name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Admission ID Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-xs text-white font-mono font-extrabold text-[11px] shadow-sm">
                      {item.serial_no}
                    </span>
                  </div>
                  {/* File Extension & Size */}
                  <div className="absolute bottom-2 right-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/90 text-slate-800 font-mono font-bold text-[10px] shadow-2xs uppercase">
                      {item.extension || 'jpg'} &middot; {formatFileSize(item.file_size)}
                    </span>
                  </div>
                </div>

                {/* Details & Download Action */}
                <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                  <div>
                    <h4
                      className="text-xs font-bold text-slate-900 truncate"
                      title={item.candidate_name}
                    >
                      {item.candidate_name}
                    </h4>
                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        {item.session_name || 'N/A'}
                      </span>
                      <span className="font-mono text-indigo-700 font-semibold truncate max-w-[90px]">
                        {item.download_filename}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(item)}
                    disabled={isDownloading}
                    className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
