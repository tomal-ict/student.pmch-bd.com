<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamResult;
use App\Models\ResultMark;
use App\Models\Student;
use App\Models\VerificationOtp;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StudentPortalController extends Controller
{
    /**
     * Request OTP for Student Login via REVE SMS Gateway
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50',
            'phone' => 'required|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'অনুগ্রহ করে রেজিস্ট্রেশন নম্বর ও ফোন নম্বর প্রদান করুন।',
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $inputPhone = trim($request->input('phone'));

        // Lookup Student
        $student = Student::where('reg_no', $regNo)->first();
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => "রেজিস্ট্রেশন নম্বর '{$regNo}' যুক্ত কোনো শিক্ষার্থী পাওয়া যায়নি।"
            ], 404);
        }

        // Compare Phone: Normalize numbers by stripping non-digit characters
        $cleanInputPhone = preg_replace('/[^\d]/', '', $inputPhone);
        $cleanStudentPhone = preg_replace('/[^\d]/', '', (string)$student->phone);

        $suffixInput = substr($cleanInputPhone, -10);
        $suffixStudent = substr($cleanStudentPhone, -10);

        if ($suffixInput !== $suffixStudent && $cleanInputPhone !== $cleanStudentPhone) {
            return response()->json([
                'success' => false,
                'message' => 'প্রদত্ত মোবাইল নম্বরটি এই রেজিস্ট্রেশনের সাথে মেলেনি। অনুগ্রহ করে নিবন্ধিত নম্বরটি প্রদান করুন।'
            ], 422);
        }

        // Generate 6-digit OTP code
        $otp = (string) mt_rand(100000, 999999);

        // Invalidate prior active OTPs for this student
        VerificationOtp::where('reg_no', $student->reg_no)
            ->where('is_verified', false)
            ->delete();

        // Create new OTP record valid for 5 minutes
        VerificationOtp::create([
            'reg_no' => $student->reg_no,
            'session_name' => $student->session_name ?? '',
            'phone' => $student->phone,
            'otp_code' => $otp,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'is_verified' => false,
        ]);

        // Send SMS via REVE SMS Gateway
        $message = "Welcome to Popular Medical College. Your Student Portal Login OTP: {$otp}";
        $smsResult = SmsService::sendSms($student->phone, $message);

        // Mask phone for student UI display (e.g. 017*****095)
        $cleanPhone = preg_replace('/[^\d+]/', '', $student->phone);
        $maskedPhone = $cleanPhone;
        if (strlen($cleanPhone) >= 7) {
            $maskedPhone = substr($cleanPhone, 0, 3) . str_repeat('*', strlen($cleanPhone) - 6) . substr($cleanPhone, -3);
        }

        return response()->json([
            'success' => true,
            'message' => 'আপনার নিবন্ধিত মোবাইল নম্বরে ওটিপি পাঠানো হয়েছে।',
            'phone_masked' => $maskedPhone,
            'sms_sent' => $smsResult['success'] ?? false,
            'expires_in_seconds' => 300,
        ]);
    }

    /**
     * Verify OTP & Issue Student Authentication Token
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50',
            'phone' => 'required|string|max:30',
            'otp_code' => 'required|string|min:4|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'অনুগ্রহ করে ওটিপি কোডটি প্রদান করুন।',
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $otpCode = trim($request->input('otp_code'));

        $student = Student::with(['examResults.marks'])->where('reg_no', $regNo)->first();
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'শিক্ষার্থীর তথ্য পাওয়া যায়নি।'
            ], 404);
        }

        $otpRecord = VerificationOtp::where('reg_no', $regNo)
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'ওটিপি কোডের মেয়াদ শেষ হয়েছে অথবা কোডটি সঠিক নয়। পুনরায় ওটিপি পাঠান।'
            ], 422);
        }

        if ($otpRecord->attempts >= 5) {
            $otpRecord->delete();
            return response()->json([
                'success' => false,
                'message' => 'সর্বোচ্চ সংখ্যক ভুল চেষ্টার কারণে ওটিপি বাতিল করা হয়েছে। নতুন ওটিপি গ্রহণ করুন।'
            ], 422);
        }

        if ($otpRecord->otp_code !== $otpCode) {
            $otpRecord->increment('attempts');
            $remaining = 5 - $otpRecord->attempts;
            return response()->json([
                'success' => false,
                'message' => "ভুল ওটিপি কোড। আপনার আর {$remaining} বার চেষ্টা করার সুযোগ রয়েছে।"
            ], 422);
        }

        // OTP Verified successfully!
        $otpRecord->update(['is_verified' => true]);

        // Issue Sanctum token for Student Portal
        $token = $student->createToken('student-portal', ['student:access'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'লগইন সফল হয়েছে। স্টুডেন্ট পোর্টালে স্বাগতম!',
            'token' => $token,
            'student' => $student,
        ]);
    }

    /**
     * Get Logged-in Student Profile & Result History
     */
    public function getProfile(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated student.'
            ], 401);
        }

        $student->load(['examResults' => function ($q) {
            $q->orderBy('id', 'desc');
        }, 'examResults.marks']);

        return response()->json([
            'success' => true,
            'student' => $student,
        ]);
    }

    /**
     * Student Self-Record Result Entry
     */
    public function recordResult(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated student.'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'exam_type' => 'required|string|max:50',
            'exam_month' => 'nullable|string|max:20',
            'exam_year' => 'nullable|string|max:10',
            'roll_no' => 'nullable|string|max:50',
            'grand_total' => 'nullable|numeric',
            'result_status' => 'nullable|string|max:50',
            'failed_subjects' => 'nullable|string',
            'remarks' => 'nullable|string',
            'marks' => 'nullable|array',
            'marks.*.subject_name' => 'required|string|max:255',
            'marks.*.full_marks' => 'required|numeric',
            'marks.*.obtained_marks' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $examType = trim($request->input('exam_type'));
        $examMonth = trim($request->input('exam_month') ?: 'May');
        $examYear = trim($request->input('exam_year') ?: date('Y'));
        $rollNo = trim($request->input('roll_no') ?: '');

        // 1. Check if candidate has already PASSED this professional exam stage
        $alreadyPassed = ExamResult::where('student_id', $student->id)
            ->where('exam_type', $examType)
            ->where('result_status', 'Passed')
            ->exists();

        if ($alreadyPassed) {
            return response()->json([
                'success' => false,
                'message' => "আপনি ইতিমধ্যে {$examType} পরীক্ষায় উত্তীর্ণ (Passed) হয়েছেন। এই প্রফে আর কোনো নতুন রেজাল্ট এন্ট্রি করা যাবে না।"
            ], 422);
        }

        // 2. Check exact duplicate attempt
        $duplicate = ExamResult::where('student_id', $student->id)
            ->where('exam_type', $examType)
            ->where('exam_month', $examMonth)
            ->where('exam_year', $examYear)
            ->where('roll_no', $rollNo)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => "{$examType} ({$examMonth} {$examYear}) রোলে একটি রেজাল্ট ইতিমধ্যে রেকর্ড করা রয়েছে।"
            ], 422);
        }

        return DB::transaction(function () use ($request, $student, $examType, $examMonth, $examYear, $rollNo) {
            $marksData = $request->input('marks', []);
            $calculatedTotal = 0;
            $hasMarks = false;

            foreach ($marksData as $mark) {
                if (isset($mark['obtained_marks']) && $mark['obtained_marks'] !== '') {
                    $calculatedTotal += (float) $mark['obtained_marks'];
                    $hasMarks = true;
                }
            }

            $grandTotal = $request->filled('grand_total')
                ? (float) $request->input('grand_total')
                : ($hasMarks ? $calculatedTotal : null);

            $result = ExamResult::create([
                'student_id' => $student->id,
                'exam_type' => $examType,
                'exam_month' => $examMonth,
                'exam_year' => $examYear,
                'exam_date_value' => $examYear . '-' . str_pad($examMonth === 'May' ? '05' : '11', 2, '0', STR_PAD_LEFT),
                'roll_no' => $rollNo,
                'grand_total' => $grandTotal,
                'total_hidden' => false,
                'result_status' => $request->input('result_status', 'Passed'),
                'failed_subjects' => $request->input('failed_subjects'),
                'remarks' => $request->input('remarks'),
            ]);

            foreach ($marksData as $mark) {
                ResultMark::create([
                    'exam_result_id' => $result->id,
                    'subject_name' => trim($mark['subject_name']),
                    'full_marks' => (float) $mark['full_marks'],
                    'obtained_marks' => isset($mark['obtained_marks']) && $mark['obtained_marks'] !== '' ? (float) $mark['obtained_marks'] : null,
                ]);
            }

            $student->load(['examResults' => function ($q) {
                $q->orderBy('id', 'desc');
            }, 'examResults.marks']);

            return response()->json([
                'success' => true,
                'message' => 'আপনার পরীক্ষার ফলাফল সফলভাবে এন্ট্রি হয়েছে!',
                'data' => $result->load('marks'),
                'student' => $student,
            ], 201);
        });
    }

    /**
     * Student Logout
     */
    public function logout(Request $request): JsonResponse
    {
        if ($request->user() && $request->user()->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'সফলভাবে লগআউট সম্পন্ন হয়েছে।'
        ]);
    }
}
