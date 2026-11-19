import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
  FolderOpen,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { getStorageUrl } from '../../services/api';

// Official serial display order for uploaded documents
const DOCUMENT_SERIAL_ORDER = [
  'ssc_marksheet',
  'ssc_certificate',
  'hsc_marksheet',
  'hsc_certificate',
  'admission_test_doc',
  'student_nid_birth',
  'guardian_nid',
  'citizenship_certificate',
  'candidate_signature',
  'guardian_signature',
  'quota_certificate',
  'other_document',
];

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function AdmissionDocumentsModal({ admission, onClose }) {
  if (!admission) return null;

  useEffect(() => {
    document.body.classList.add('admission-docs-print-open');
    return () => {
      document.body.classList.remove('admission-docs-print-open');
    };
  }, []);

  // Build ordered list of uploaded documents
  const orderedDocs = useMemo(() => {
    let raw = admission.attachments_json;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw || '{}');
      } catch {
        raw = {};
      }
    }

    const entries = [];

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      Object.entries(raw).forEach(([key, val]) => {
        if (val && (val.file_path || val.relative_url)) {
          entries.push({
            key,
            label: val.label || key.replace(/_/g, ' ').toUpperCase(),
            category: val.category || 'document',
            fileName: val.file_name || 'document',
            filePath: val.file_path || val.relative_url,
            fileSize: val.file_size || 0,
            extension: String(val.extension || val.file_name?.split('.').pop() || '').toLowerCase(),
            url: getStorageUrl(val.file_path || val.relative_url),
          });
        }
      });
    } else if (Array.isArray(raw)) {
      raw.forEach((val, idx) => {
        if (val && (val.file_path || val.relative_url)) {
          entries.push({
            key: val.key || `doc_${idx}`,
            label: val.label || `Document ${idx + 1}`,
            category: val.category || 'document',
            fileName: val.file_name || 'document',
            filePath: val.file_path || val.relative_url,
            fileSize: val.file_size || 0,
            extension: String(val.extension || val.file_name?.split('.').pop() || '').toLowerCase(),
            url: getStorageUrl(val.file_path || val.relative_url),
          });
        }
      });
    }

    // Sort by official DOCUMENT_SERIAL_ORDER first, then custom docs alphabetically
    entries.sort((a, b) => {
      const idxA = DOCUMENT_SERIAL_ORDER.indexOf(a.key);
      const idxB = DOCUMENT_SERIAL_ORDER.indexOf(b.key);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.key.localeCompare(b.key);
    });

    // Determine image vs PDF
    return entries.map((doc, idx) => {
      const isPdf = doc.extension === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(doc.extension) || !isPdf;
      return {
        ...doc,
        serialIndex: idx + 1,
        isPdf,
        isImage,
      };
    });
  }, [admission]);

  // Track which documents are selected for printing (default: all printable image documents selected)
  const [selectedKeys, setSelectedKeys] = useState(() => {
    return orderedDocs.filter((d) => d.isImage).map((d) => d.key);
  });
  const [printing, setPrinting] = useState(false);

  // Sync selection if admission changes
  useEffect(() => {
    setSelectedKeys(orderedDocs.filter((d) => d.isImage).map((d) => d.key));
  }, [orderedDocs]);

  const printableDocs = useMemo(
    () => orderedDocs.filter((d) => d.isImage && selectedKeys.includes(d.key)),
    [orderedDocs, selectedKeys]
  );

  const pdfDocs = useMemo(() => orderedDocs.filter((d) => d.isPdf), [orderedDocs]);

  const toggleDoc = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllImages = () => {
    setSelectedKeys(orderedDocs.filter((d) => d.isImage).map((d) => d.key));
  };

  const deselectAll = () => {
    setSelectedKeys([]);
  };

  const handlePrintAllDocs = async () => {
    if (printableDocs.length === 0) {
      alert('প্রিন্ট করার জন্য অন্তত একটি ইমেজ ডকুমেন্ট সিলেক্ট করুন।');
      return;
    }

    setPrinting(true);
    try {
      const printArea = document.getElementById('admission-docs-print-area');
      if (printArea) {
        const imgs = Array.from(printArea.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise((res) => {
              img.onload = res;
              img.onerror = res;
              setTimeout(res, 3000);
            });
          })
        );
      }
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      id="admission-docs-print-modal"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col overflow-hidden print:static print:bg-white print:backdrop-blur-none print:overflow-visible print:block"
    >
      {/* ==================== TOP HEADER BAR (NO PRINT) ==================== */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#1e2d7d]">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Uploaded Documents ({orderedDocs.length})
              </h3>
              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                {admission.serial_no}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{admission.candidate_name}</strong> &middot; Session:{' '}
              <strong>{admission.session_name || 'N/A'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {orderedDocs.some((d) => d.isImage) && (
            <div className="flex items-center gap-1.5 mr-2 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={selectAllImages}
                className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrintAllDocs}
            disabled={printing || printableDocs.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            {printing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>
              {printing
                ? 'Preparing Images...'
                : `Print All Documents (${printableDocs.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ==================== SCREEN SERIAL VIEWER (NO PRINT) ==================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 no-print">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Info Note if PDFs exist */}
          {pdfDocs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">PDF ডকুমেন্ট নোট:</span> এই আবেদনে{' '}
                <strong>{pdfDocs.length}</strong> টি PDF ফাইল রয়েছে। সকল ইমেজ (JPG/PNG) ডকুমেন্ট একসাথে{' '}
                <strong>"Print All Documents"</strong> বাটনে ক্লিক করে A4 সাইজে প্রিন্ট করা যাবে, এবং PDF ফাইলগুলো আলাদাভাবে প্রতিটি কার্ডের{' '}
                <strong>"Open / Print PDF"</strong> বাটন থেকে প্রিন্ট বা ডাউনলোড করা যাবে।
              </div>
            </div>
          )}

          {orderedDocs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">কোনো ডকুমেন্ট পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-500 mt-1">
                এই শিক্ষার্থী অনলাইন আবেদনের সাথে কোনো সংযুক্তি (Attachment) আপলোড করেননি।
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orderedDocs.map((doc) => {
                const isSelected = selectedKeys.includes(doc.key);
                return (
                  <div
                    key={doc.key}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs ${
                      isSelected && doc.isImage
                        ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Serial Number Pill */}
                        <span className="w-8 h-8 rounded-lg bg-[#1e2d7d] text-white font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
                          {doc.serialIndex < 10 ? `0${doc.serialIndex}` : doc.serialIndex}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {doc.label}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                              {doc.extension || 'FILE'}
                            </span>
                            {doc.fileSize > 0 && <span>{formatBytes(doc.fileSize)}</span>}
                            <span className="truncate max-w-[240px] font-mono text-[10px] text-slate-400">
                              {doc.fileName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.isImage && (
                          <button
                            type="button"
                            onClick={() => toggleDoc(doc.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{isSelected ? 'Included in Print' : 'Include in Print'}</span>
                          </button>
                        )}

                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{doc.isPdf ? 'Open / Print PDF' : 'Full View'}</span>
                        </a>

                        <a
                          href={doc.url}
                          download={doc.fileName}
                          className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-200 bg-white transition-colors"
                          title="Download File"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Preview Body */}
                    <div className="p-4 bg-slate-50/40 flex items-center justify-center">
                      {doc.isPdf ? (
                        <div className="w-full">
                          <iframe
                            src={doc.url}
                            title={doc.label}
                            className="w-full h-[520px] rounded-xl border border-slate-200 bg-white"
                          />
                        </div>
                      ) : (
                        <div className="w-full flex justify-center bg-white p-2 rounded-xl border border-slate-200">
                          <img
                            src={doc.url}
                            alt={doc.label}
                            loading="eager"
                            className="max-h-[650px] w-auto max-w-full object-contain rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== DEDICATED PRINT LAYOUT (A4 PAGES) ==================== */}
      <div id="admission-docs-print-area" className="hidden print:block bg-white">
        {printableDocs.map((doc, idx) => {
          const isLast = idx === printableDocs.length - 1;
          return (
            <div
              key={doc.key}
              className={`doc-print-page bg-white text-black ${isLast ? 'is-last-doc' : ''}`}
            >
              {/* Crisp Institutional Document Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2 shrink-0">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-wide font-serif">
                    Popular Medical College &mdash; Uploaded Document Enclosure
                  </div>
                  <div className="text-[10px] font-sans font-bold text-slate-800 mt-0.5">
                    Document #{doc.serialIndex < 10 ? `0${doc.serialIndex}` : doc.serialIndex}: {doc.label}
                  </div>
                </div>
                <div className="text-right font-sans text-[9.5px] leading-snug">
                  <div>
                    Sl. No: <strong className="font-mono text-[11px]">{admission.serial_no}</strong>
                  </div>
                  <div>
                    Candidate: <strong className="uppercase">{admission.candidate_name}</strong>
                  </div>
                  <div>Session: {admission.session_name || '—'}</div>
                </div>
              </div>

              {/* Centered Full-Page Scaled Image */}
              <div className="flex-1 flex items-center justify-center overflow-hidden border border-slate-300 p-1 bg-white">
                <img
                  src={doc.url}
                  alt={doc.label}
                  loading="eager"
                  decoding="sync"
                  className="max-w-full max-h-full object-contain block mx-auto"
                  style={{
                    maxHeight: '262mm',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
