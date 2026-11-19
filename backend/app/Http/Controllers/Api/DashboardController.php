<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionApplication;
use App\Models\ExamResult;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getStats(): JsonResponse
    {
        $totalStudents = Student::count();
        $totalResults = ExamResult::count();
        $totalAdmissions = AdmissionApplication::count();
        $pendingAdmissions = AdmissionApplication::where('status', 'Pending')->count();
        $approvedAdmissions = AdmissionApplication::where('status', 'Approved')->count();

        // Pass rate calculation
        $passedCount = ExamResult::where('result_status', 'Passed')->count();
        $passRate = $totalResults > 0 ? round(($passedCount / $totalResults) * 100, 1) : 0;

        // Exam type distribution
        $examStats = ExamResult::select('exam_type', DB::raw('count(*) as count'))
            ->groupBy('exam_type')
            ->get();

        // Recent admissions
        $recentAdmissions = AdmissionApplication::select('id', 'serial_no', 'candidate_name', 'session_name', 'mobile', 'status', 'created_at')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        // Recent results
        $recentResults = ExamResult::with('student:id,reg_no,student_name')
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'stats' => [
                'total_students' => $totalStudents,
                'total_results' => $totalResults,
                'total_admissions' => $totalAdmissions,
                'pending_admissions' => $pendingAdmissions,
                'approved_admissions' => $approvedAdmissions,
                'pass_rate' => $passRate,
            ],
            'exam_stats' => $examStats,
            'recent_admissions' => $recentAdmissions,
            'recent_results' => $recentResults,
        ]);
    }
}
