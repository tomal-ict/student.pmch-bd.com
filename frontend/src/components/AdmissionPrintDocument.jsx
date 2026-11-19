import React, { useRef, useEffect } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { getStorageUrl } from '../services/api';

/**
 * Single A4 Admission Print Sheet
 * Matches the official Popular Medical College MBBS Admission Application Form.
 */
export function AdmissionPrintSheet({ admission, isLast = true }) {
  if (!admission) return null;

  // Extract academic history (SSC, HSC, Other)
  const academic = Array.isArray(admission.academic_json)
    ? admission.academic_json
    : typeof admission.academic_json === 'string'
    ? JSON.parse(admission.academic_json || '[]')
    : [];

  const ssc = academic.find(
    (a) =>
      typeof a?.exam === 'string' && (
        a.exam.toLowerCase().includes('s.s.c') ||
        a.exam.toLowerCase().includes('ssc') ||
        a.exam.toLowerCase().includes('o-level')
      )
  ) || academic[0] || {};

  const hsc = academic.find(
    (a) =>
      typeof a?.exam === 'string' && (
        a.exam.toLowerCase().includes('h.s.c') ||
        a.exam.toLowerCase().includes('hsc') ||
        a.exam.toLowerCase().includes('a-level')
      )
  ) || academic[1] || {};

  const other = academic.find(
    (a) =>
      a !== ssc &&
      a !== hsc &&
      a &&
      (
        String(a.exam || '').trim() !== '' ||
        String(a.year || '').trim() !== '' ||
        String(a.board || a.school || '').trim() !== '' ||
        String(a.gpa || '').trim() !== '' ||
        String(a.gpa_without_4th || '').trim() !== ''
      )
  ) || null;

  const hasOther = Boolean(other);

  // Calculate Grand Total GPA as the sum of all "GPA without 4th Subject"
  const parseGpa = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const sscGpaWithout4th = parseGpa(ssc.gpa_without_4th !== undefined && ssc.gpa_without_4th !== '' ? ssc.gpa_without_4th : ssc.gpa);
  const hscGpaWithout4th = parseGpa(hsc.gpa_without_4th !== undefined && hsc.gpa_without_4th !== '' ? hsc.gpa_without_4th : hsc.gpa);
  const otherGpaWithout4th = hasOther
    ? parseGpa(other.gpa_without_4th !== undefined && other.gpa_without_4th !== '' ? other.gpa_without_4th : other.gpa)
    : 0;

  const grandTotalGpaSum = sscGpaWithout4th + hscGpaWithout4th + otherGpaWithout4th;
  const grandTotalGpaDisplay = grandTotalGpaSum > 0 ? grandTotalGpaSum.toFixed(2) : '—';

  // Extract extracurricular activities
  const activities = Array.isArray(admission.activities_json)
    ? admission.activities_json
    : typeof admission.activities_json === 'string'
    ? JSON.parse(admission.activities_json || '[]')
    : [];

  // Group check helper
  const selectedGroup = String(admission.group_name || 'General').toLowerCase();

  // Prefer immediate in-memory base64 photo_preview (instant, zero network latency) or served API media URL
  const storagePhotoUrl =
    typeof admission.photo_path === 'string' && admission.photo_path
      ? admission.photo_path.startsWith('blob:') || admission.photo_path.startsWith('data:')
        ? admission.photo_path
        : getStorageUrl(admission.photo_path)
      : null;

  const photoSrc = admission.photo_preview || storagePhotoUrl;

  const formattedDate = admission.created_at
    ? new Date(admission.created_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  return (
    <div
      id="admission-official-print-sheet"
      className={`admission-print-sheet bg-white text-black w-full max-w-[215.9mm] min-h-[355.6mm] p-[9mm] sm:p-[11mm] shadow-2xl rounded-sm text-[12px] leading-snug font-serif mx-auto flex flex-col justify-between print:m-0 print:p-[9mm_11mm] print:shadow-none print:border-none print:outline-none print:w-[215.9mm] print:max-w-[215.9mm] print:min-h-[355.6mm] print:h-[355.6mm] print:rounded-none ${
        isLast ? 'is-last-sheet' : ''
      }`}
      style={{
        boxSizing: 'border-box',
        color: '#000',
        backgroundColor: '#fff',
      }}
    >
      {/* ==================== 1. TOP HEADER ROW ==================== */}
      <div className="flex items-start justify-between gap-4 pb-2 border-b-2 border-black">
        {/* Left: Seal / Logo */}
        <div className="w-[84px] shrink-0 text-center">
          <img
            src="./logo.png"
            alt="Popular Medical College"
            loading="eager"
            decoding="sync"
            className="w-20 h-20 object-contain mx-auto"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/student_potal/logo.png';
            }}
          />
          <div className="text-[8.5px] font-sans font-bold uppercase tracking-tight text-slate-800 leading-tight mt-1">
            Dhanmondi, Dhaka
          </div>
        </div>

        {/* Center: Title & Banner */}
        <div className="flex-1 text-center px-2">
          <h1 className="text-[21px] font-bold font-serif uppercase tracking-wide text-black leading-none">
            POPULAR MEDICAL COLLEGE
          </h1>

          {/* Dark Banner Box */}
          <div
            className="mt-1.5 bg-black text-white py-1.5 px-4 rounded-xs font-sans text-center border border-black"
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div className="text-[13px] font-extrabold uppercase tracking-wider text-white">
              APPLICATION FORM FOR MBBS ADMISSION
            </div>
            <div className="text-[11.5px] font-bold tracking-normal text-white mt-0.5">
              Session: {admission.session_name || '2026-2027'}
            </div>
          </div>

          {/* Authority Disclaimer Note */}
          <div className="mt-1.5 border border-black/80 rounded-xs py-1 px-2 text-[9px] font-sans text-slate-900 leading-snug">
            Popular Medical College authority reserves the right to implement the rules &amp; regulation / policy stated in the prospectus and similar rules introduced time to time in future to run the college smoothly.
          </div>
        </div>

        {/* Right: Sl No. & Photo Box */}
        <div className="w-[98px] shrink-0 flex flex-col items-end">
          <div className="text-[11px] font-sans font-bold flex items-baseline gap-1 mb-1.5">
            <span>Sl. No.</span>
            <span className="font-mono font-bold border-b border-black text-[12px] px-1 min-w-[52px] text-center inline-block">
              {admission.serial_no || '—'}
            </span>
          </div>

          {/* Passport Photo Box */}
          <div className="w-[96px] h-[116px] border-2 border-dashed border-black/80 rounded-xs flex items-center justify-center overflow-hidden bg-white">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt="Candidate"
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover block"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                onError={(e) => {
                  if (storagePhotoUrl && e.target.src !== storagePhotoUrl) {
                    e.target.src = storagePhotoUrl;
                  }
                }}
              />
            ) : (
              <span className="text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider">
                PHOTO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 2. GROUP ROW ==================== */}
      <div className="border border-black rounded-xs overflow-hidden">
        <div
          className="bg-slate-200 border-b border-black text-center font-sans font-black text-[10.5px] uppercase tracking-wider py-1"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          GROUP
        </div>
        <div className="grid grid-cols-4 divide-x divide-black text-center font-sans text-[10.5px] py-1.5 bg-white">
          <div className="flex items-center justify-center gap-2 px-1">
            <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[11px] font-black leading-none">
              {selectedGroup.includes('general') ? '✓' : ''}
            </span>
            <span className="font-bold">General</span>
          </div>
          <div className="flex items-center justify-center gap-2 px-1">
            <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[11px] font-black leading-none">
              {selectedGroup.includes('freedom') ? '✓' : ''}
            </span>
            <span className="font-bold">Freedom Fighter</span>
          </div>
          <div className="flex items-center justify-center gap-2 px-1">
            <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[11px] font-black leading-none">
              {selectedGroup.includes('foreign') ? '✓' : ''}
            </span>
            <span className="font-bold">Foreign</span>
          </div>
          <div className="flex items-center justify-center gap-2 px-1">
            <span className="w-4 h-4 border border-black inline-flex items-center justify-center text-[11px] font-black leading-none">
              {selectedGroup.includes('poor') || selectedGroup.includes('meritorious') ? '✓' : ''}
            </span>
            <span className="font-bold">Poor &amp; Meritorious</span>
          </div>
        </div>
      </div>

      {/* ==================== 3. ADMISSION TEST 4 BOXES ==================== */}
      <div className="grid grid-cols-4 gap-3 font-sans">
        <div>
          <div className="text-[9.5px] font-bold text-slate-800 uppercase tracking-tight mb-1 text-center truncate">
            Government Order
          </div>
          <div className="border border-black h-7 rounded-xs flex items-center justify-center font-mono font-bold text-[11px] px-1 text-center truncate">
            {admission.college_code || 'PMC'}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] font-bold text-slate-800 uppercase tracking-tight mb-1 text-center truncate">
            Admission test Roll. No.
          </div>
          <div className="border border-black h-7 rounded-xs flex items-center justify-center font-mono font-bold text-[12px]">
            {admission.admission_roll_no || '—'}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] font-bold text-slate-800 uppercase tracking-tight mb-1 text-center truncate">
            Admission test national Merit position
          </div>
          <div className="border border-black h-7 rounded-xs flex items-center justify-center font-mono font-bold text-[12px]">
            {admission.merit_position || '—'}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] font-bold text-slate-800 uppercase tracking-tight mb-1 text-center truncate">
            Admission test national Merit Score
          </div>
          <div className="border border-black h-7 rounded-xs flex items-center justify-center font-mono font-bold text-[12px]">
            {admission.merit_score || '—'}
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="text-center font-sans font-bold text-[10.5px] uppercase tracking-wider text-slate-800">
        (USE CAPITAL LETTER)
      </div>

      {/* ==================== 4. NUMBERED PARTICULARS ==================== */}
      <div className="space-y-2 font-serif text-[12px] leading-snug">
        {/* 1. Candidate Name */}
        <div className="flex items-baseline">
          <span className="font-bold whitespace-nowrap">1.&nbsp; Name of the candidate:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black uppercase font-bold px-1.5 text-[12.5px] truncate">
            {admission.candidate_name || ''}
          </span>
        </div>
        <div className="flex items-baseline pl-5 text-[11px]">
          <span className="font-bold whitespace-nowrap">বাংলা/Bangla:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 font-medium font-sans truncate">
            {admission.candidate_name_bn || ''}
          </span>
          <span className="font-bold whitespace-nowrap ml-4">Sex:</span>
          <span className="w-28 ml-1.5 border-b border-dotted border-black px-1.5 font-bold text-center">
            {admission.sex || '—'}
          </span>
        </div>

        {/* 2. Father's Name */}
        <div className="flex items-baseline">
          <span className="font-bold whitespace-nowrap">2.&nbsp; Father's name:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black uppercase font-semibold px-1.5 truncate">
            {admission.father_name || ''}
          </span>
        </div>
        <div className="flex items-baseline pl-5 text-[11px]">
          <span className="font-bold whitespace-nowrap">বাংলা/Bangla:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 font-medium font-sans truncate">
            {admission.father_name_bn || ''}
          </span>
          <span className="font-bold whitespace-nowrap ml-4">Occupation:</span>
          <span className="w-44 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.father_occupation || '—'}
          </span>
        </div>

        {/* 3. Mother's Name */}
        <div className="flex items-baseline">
          <span className="font-bold whitespace-nowrap">3.&nbsp; Mother's name:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black uppercase font-semibold px-1.5 truncate">
            {admission.mother_name || ''}
          </span>
        </div>
        <div className="flex items-baseline pl-5 text-[11px]">
          <span className="font-bold whitespace-nowrap">বাংলা/Bangla:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 font-medium font-sans truncate">
            {admission.mother_name_bn || ''}
          </span>
          <span className="font-bold whitespace-nowrap ml-4">Occupation:</span>
          <span className="w-44 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.mother_occupation || '—'}
          </span>
        </div>

        {/* 4. Local Guardian */}
        <div className="flex items-baseline">
          <span className="font-bold whitespace-nowrap">4.&nbsp; Local guardian's name:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black uppercase font-semibold px-1.5 truncate">
            {admission.guardian_name || '—'}
          </span>
          <span className="font-bold whitespace-nowrap ml-4">Occupation:</span>
          <span className="w-44 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.guardian_occupation || '—'}
          </span>
        </div>

        {/* 5. Date of Birth, Religion, Identification */}
        <div className="flex items-baseline text-[11.5px]">
          <span className="font-bold whitespace-nowrap">5.&nbsp; Date of Birth:</span>
          <span className="w-32 ml-1.5 border-b border-dotted border-black px-1.5 font-mono text-center">
            {admission.date_of_birth || '—'}
          </span>
          <span className="font-bold whitespace-nowrap ml-3">Religion:</span>
          <span className="w-28 ml-1.5 border-b border-dotted border-black px-1.5 text-center">
            {admission.religion || '—'}
          </span>
          <span className="font-bold whitespace-nowrap ml-3">Identification Mark:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.identification_mark || 'None'}
          </span>
        </div>

        {/* 6. Nationality, Home District */}
        <div className="flex items-baseline text-[11.5px]">
          <span className="font-bold whitespace-nowrap">6.&nbsp; Nationality:</span>
          <span className="w-40 ml-1.5 border-b border-dotted border-black px-1.5 text-center">
            {admission.nationality || 'Bangladeshi'}
          </span>
          <span className="font-bold whitespace-nowrap ml-4">Home District:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.home_district || '—'}
          </span>
        </div>

        {/* 7. Address of communication */}
        <div className="flex items-baseline">
          <span className="font-bold whitespace-nowrap">7.&nbsp; Address of communication:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.communication_address || '—'}
          </span>
        </div>
        <div className="flex items-baseline pl-5 text-[10.5px]">
          <span className="font-bold whitespace-nowrap">Phone:</span>
          <span className="w-32 ml-1.5 border-b border-dotted border-black px-1.5 font-mono">
            {admission.phone || '—'}
          </span>
          <span className="font-bold whitespace-nowrap ml-3">Mobile:</span>
          <span className="w-36 ml-1.5 border-b border-dotted border-black px-1.5 font-mono font-bold">
            {admission.mobile || '—'}
          </span>
          <span className="font-bold whitespace-nowrap ml-3">Email:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 font-mono text-[10px] truncate">
            {admission.email || '—'}
          </span>
        </div>

        {/* 8. Permanent address */}
        <div className="flex items-baseline">
          <span className="font-bold whitespace-nowrap">8.&nbsp; Permanent address:</span>
          <span className="flex-1 ml-1.5 border-b border-dotted border-black px-1.5 truncate">
            {admission.permanent_address || admission.communication_address || '—'}
          </span>
        </div>
      </div>

      {/* ==================== 5. ACADEMIC ACHIEVEMENTS TABLE ==================== */}
      <div>
        <div className="font-bold text-[11.5px] mb-1">9.&nbsp; Academic achievements:-</div>
        <table className="w-full border-collapse border border-black text-[10.5px] font-sans">
          <thead>
            <tr
              className="bg-slate-100/80"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <th className="border border-black p-1.5 text-left w-40">Exam</th>
              <th className="border border-black p-1.5 text-center w-16">Year</th>
              <th className="border border-black p-1.5 text-center w-36">Board/School</th>
              <th className="border border-black p-1.5 text-center w-20">Total GPA</th>
              <th className="border border-black p-1.5 text-center w-32">GPA without 4th Subject</th>
              <th className="border border-black p-1.5 text-center w-24">Grand Total GPA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 font-semibold">S.S.C/ O-Level/Equivalent</td>
              <td className="border border-black p-1.5 text-center font-mono">{ssc.year || '—'}</td>
              <td className="border border-black p-1.5 text-center truncate">{ssc.board || ssc.school || '—'}</td>
              <td className="border border-black p-1.5 text-center font-mono font-bold">{ssc.gpa || '—'}</td>
              <td className="border border-black p-1.5 text-center font-mono">{ssc.gpa_without_4th || ssc.gpa || '—'}</td>
              <td
                className="border border-black p-1.5 text-center font-mono font-bold text-[13px]"
                rowSpan={hasOther ? 3 : 2}
              >
                {grandTotalGpaDisplay}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-semibold">H.S.C/ A-Level/Equivalent</td>
              <td className="border border-black p-1.5 text-center font-mono">{hsc.year || '—'}</td>
              <td className="border border-black p-1.5 text-center truncate">{hsc.board || hsc.school || '—'}</td>
              <td className="border border-black p-1.5 text-center font-mono font-bold">{hsc.gpa || '—'}</td>
              <td className="border border-black p-1.5 text-center font-mono">{hsc.gpa_without_4th || hsc.gpa || '—'}</td>
            </tr>
            {hasOther && (
              <tr>
                <td className="border border-black p-1.5 font-semibold">{other.exam || 'Other'}</td>
                <td className="border border-black p-1.5 text-center font-mono">{other.year || '—'}</td>
                <td className="border border-black p-1.5 text-center truncate">{other.board || other.school || '—'}</td>
                <td className="border border-black p-1.5 text-center font-mono">{other.gpa || '—'}</td>
                <td className="border border-black p-1.5 text-center font-mono">{other.gpa_without_4th || other.gpa || '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== 6. EXTRA ACADEMIC ACHIEVEMENTS ==================== */}
      <div className="font-sans text-[10px]">
        <div className="font-bold text-[11px] mb-1 font-serif">
          10.&nbsp; Extra academic achievements:
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-4">
          {[
            'Debate',
            'Games & Sports',
            'Drama',
            'Music',
            'Dance',
            'Extempore speech',
            'Recitation',
            'Writing',
          ].map((item) => {
            const checked = activities.some(
              (a) =>
                typeof a === 'string' &&
                a.toLowerCase().replace(/[^a-z]/g, '') ===
                item.toLowerCase().replace(/[^a-z]/g, '')
            );
            return (
              <div key={item} className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] font-bold leading-none">
                  {checked ? '✓' : ''}
                </span>
                <span>{item}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== 7. DECLARATION BOX ==================== */}
      <div>
        <div className="border border-black rounded-xs p-2.5 font-sans text-[9.5px] leading-snug">
          <div className="font-bold uppercase tracking-wider text-[10px] mb-1">
            DECLARATION:
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I have chosen Medical Science as profession by myself and not being influenced by parents/guardian/anybody else.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I will remain honour bound to abide by the rules and regulations of the college and will never take part in any activities prejudicial to college discipline or subversive to the state, failing which my studentship will be liable to be terminated.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I shall also remain honour bound to the code of conduct of the college failing which I will be liable to be punished.</span>
            </div>
          </div>
        </div>

        {/* Candidate Signature Row */}
        <div className="flex items-end justify-between pt-6 pb-1 text-[10.5px] font-serif">
          <div>
            <span className="font-bold">Date:</span>
            <span className="border-b border-dotted border-black inline-block min-w-[140px] px-1.5 text-center font-mono">
              {formattedDate}
            </span>
          </div>
          <div className="text-center">
            <div className="w-56 border-t border-black pt-1 font-bold uppercase tracking-tight">
              Signature of the Candidate
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 8. UNDERTAKING BOX ==================== */}
      <div>
        <div className="border border-black rounded-xs p-2.5 font-sans text-[9.5px] leading-snug">
          <div className="font-bold uppercase tracking-wider text-[10px] mb-1">
            UNDERTAKING:
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>My son / daughter / ward has chosen Medical Science as profession by himself/herself and not being influenced by me/my relatives/anybody else</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I do hereby endorse the declaration made by my son / daughter / ward</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I shall remain responsible for the good conduct of my son / daughter / ward</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I shall remain honour bound to accept any punishment imposed on my son / daughter / ward due to breach of college discipline.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-3.5 h-3.5 border border-black shrink-0 inline-flex items-center justify-center text-[9px] font-bold mt-0.5">✓</span>
              <span>I do hereby commit to maintain regular communication (at least once in a month) with the concerned teachers &amp; the college administration to keep myself updated regarding my son / daughter / ward's academic/ moral &amp; social performance.</span>
            </div>
          </div>
        </div>

        {/* Guardian Signature Row */}
        <div className="flex items-end justify-between pt-6 pb-1 text-[10.5px] font-serif">
          <div>
            <span className="font-bold">Date:</span>
            <span className="border-b border-dotted border-black inline-block min-w-[140px] px-1.5 text-center font-mono">
              {formattedDate}
            </span>
          </div>
          <div className="text-center">
            <div className="w-56 border-t border-black pt-1 font-bold uppercase tracking-tight">
              Signature of the Guardian
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 9. DOCUMENTS TO BE ENCLOSED ==================== */}
      <div className="pt-2 border-t border-black/60 text-[9px] font-sans leading-snug">
        <div className="font-bold text-[9.5px] uppercase tracking-tight mb-1">
          Documents to be enclosed
        </div>
        <ol className="list-decimal list-inside space-y-0.5 pl-1 text-slate-900">
          <li>Photo copies of student's online application (student copy), downloaded admit card &amp; admission test result copy.</li>
          <li>Photo copies of SSC/ equivalent &amp; HSC/ equivalent Academic Transcript, Testimonial &amp; Certificates</li>
          <li>Recent 5 copies of passport size colour photograph.</li>
          <li>Attested photo copies of 'O' level &amp; 'A'level mark sheet /certificate / testimonial issued by DGHS (in applicable cases)</li>
          <li>Freedom fighter certificate of the parent issued by competent authority between the years 1997-2001.</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Main Modal Wrapper supporting Single or Bulk Admission Printing
 */
export default function AdmissionPrintDocument({ admission, admissions, sessionName, onClose }) {
  const items = admissions && admissions.length > 0
    ? admissions
    : (admission ? [admission] : []);

  if (items.length === 0) return null;

  useEffect(() => {
    document.body.classList.add('admission-print-open');
    return () => {
      document.body.classList.remove('admission-print-open');
    };
  }, []);

  const handlePrint = async () => {
    const modal = document.getElementById('admission-official-print-modal');
    if (modal) {
      const imgs = Array.from(modal.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
            setTimeout(res, 2500);
          });
        })
      );
    }
    window.print();
  };

  return (
    <div
      id="admission-official-print-modal"
      className="admission-print-overlay fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto print:fixed print:inset-0 print:m-0 print:p-0 print:bg-white print:backdrop-blur-none print:shadow-none print:border-none print:overflow-visible print:z-[9999999] print:block"
    >
      {/* Force Legal Portrait Page Size specifically when Admission Form Print Modal is active */}
      <style>{`
        @media print {
          @page {
            size: legal portrait;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar (Hidden on print) */}
      <div className="fixed top-4 right-4 z-60 flex items-center gap-2 no-print bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-white text-xs font-semibold pr-2 border-r border-white/20 hidden sm:block">
          {items.length > 1 ? (
            <span>
              Bulk Print: <span className="text-emerald-400 font-bold">{items.length}</span> Applications {sessionName ? `(${sessionName})` : ''}
            </span>
          ) : (
            <span>Application: <span className="text-emerald-400 font-bold">{items[0]?.serial_no}</span></span>
          )}
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>{items.length > 1 ? `Print All (${items.length} Copies)` : 'Print / Save as PDF'}</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-lg cursor-pointer transition-all"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Sheets Container (Scrollable in screen, each on Legal Portrait in print) */}
      <div className="space-y-8 print:space-y-0 w-full max-w-[215.9mm] mx-auto my-auto print:my-0">
        {items.map((adm, index) => (
          <AdmissionPrintSheet
            key={adm.id || adm.serial_no || index}
            admission={adm}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
