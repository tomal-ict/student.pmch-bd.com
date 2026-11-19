<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamResult;
use App\Models\ResultMark;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function getSummary(Request $request): JsonResponse
    {
        $examType = $request->input('exam_type');
        $examYear = $request->input('exam_year');

        $query = ExamResult::with(['student', 'marks']);

        if ($examType) {
            $query->where('exam_type', $examType);
        }
        if ($examYear) {
            $query->where('exam_year', $examYear);
        }

        $results = $query->get();

        $total = $results->count();
        $passed = $results->where('result_status', 'Passed')->count();
        $failed = $results->where('result_status', 'Failed')->count();
        $other = $total - ($passed + $failed);

        return response()->json([
            'success' => true,
            'summary' => [
                'total' => $total,
                'passed' => $passed,
                'failed' => $failed,
                'other' => $other,
                'pass_rate' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
            ],
            'results' => $results,
        ]);
    }

    public function downloadCsv(Request $request): StreamedResponse
    {
        $examType = $request->input('exam_type');
        $examYear = $request->input('exam_year');

        $query = ExamResult::with(['student', 'marks']);
        if ($examType) {
            $query->where('exam_type', $examType);
        }
        if ($examYear) {
            $query->where('exam_year', $examYear);
        }

        $results = $query->get();
        $filename = 'exam_report_' . ($examType ?: 'all') . '_' . date('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($results) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Reg No', 'Student Name', 'Session', 'Exam Type', 'Roll No', 'Month/Year', 'Grand Total', 'Status', 'Failed Subjects']);

            foreach ($results as $r) {
                fputcsv($handle, [
                    $r->student->reg_no ?? '',
                    $r->student->student_name ?? '',
                    $r->student->session_name ?? '',
                    $r->exam_type,
                    $r->roll_no,
                    trim(($r->exam_month ?? '') . ' ' . ($r->exam_year ?? '')),
                    $r->total_hidden ? 'Hidden' : $r->grand_total,
                    $r->result_status,
                    $r->failed_subjects,
                ]);
            }
            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
