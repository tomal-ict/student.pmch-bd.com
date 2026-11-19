<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\Activity;
use App\Models\AdmissionApplication;
use App\Models\ExamResult;
use App\Models\Setting;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PublicController extends Controller
{
    public function getSettings(): JsonResponse
    {
        $settings = Setting::all()->pluck('setting_value', 'setting_key');
        
        $sessions = AcademicSession::orderBy('session_name', 'desc')->pluck('session_name');
        if ($sessions->isEmpty()) {
            $defaultSessions = [
                '2026-2027', '2025-2026', '2024-2025', '2023-2024',
                '2022-2023', '2021-2022', '2020-2021', '2019-2020',
                '2018-2019', '2017-2018', '2016-2017', '2015-2016',
                '2014-2015', '2013-2014', '2012-2013', '2011-2012',
                '2010-2011'
            ];
            try {
                foreach ($defaultSessions as $sessName) {
                    AcademicSession::firstOrCreate(['session_name' => $sessName]);
                }
                $sessions = AcademicSession::orderBy('session_name', 'desc')->pluck('session_name');
            } catch (\Throwable $e) {
                $sessions = collect($defaultSessions);
            }
        }

        $activities = Activity::orderBy('activity_name', 'asc')->pluck('activity_name');
        if ($activities->isEmpty()) {
            $defaultActivities = [
                'Dance', 'Debate', 'Drama', 'Extempore Speech',
                'Games & Sports', 'Music', 'Recitation', 'Writing'
            ];
            try {
                foreach ($defaultActivities as $actName) {
                    Activity::firstOrCreate(['activity_name' => $actName]);
                }
                $activities = Activity::orderBy('activity_name', 'asc')->pluck('activity_name');
            } catch (\Throwable $e) {
                $activities = collect($defaultActivities);
            }
        }

        $curriculumJson = Setting::get('prof_curriculum');
        $curriculum = $curriculumJson ? json_decode($curriculumJson, true) : SettingController::getDefaultCurriculum();

        return response()->json([
            'success' => true,
            'settings' => [
                'site_header' => $settings['site_header'] ?? 'Popular Medical College',
                'landing_subtitle' => $settings['landing_subtitle'] ?? 'Academic & Examination Result Portal - Estd. 2010',
                'student_registration_enabled' => (bool) ($settings['student_registration_enabled'] ?? '1'),
                'student_lookup_enabled' => (bool) ($settings['student_lookup_enabled'] ?? '1'),
                'site_logo_path' => $settings['site_logo_path'] ?? null,
            ],
            'sessions' => $sessions,
            'activities' => $activities,
            'prof_curriculum' => $curriculum,
        ]);
    }

    public function requestResultOtp(Request $request): JsonResponse
    {
        $lookupEnabled = Setting::get('student_lookup_enabled', '1');
        if ($lookupEnabled !== '1') {
            return response()->json([
                'success' => false,
                'message' => 'Online result lookup is currently disabled by administrator.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50',
            'session_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Registration Number, Academic Session, and Registered Phone Number are required.',
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $sessionName = trim($request->input('session_name'));
        $rawPhone = trim($request->input('phone'));
        $cleanInputPhone = preg_replace('/[^\d]/', '', $rawPhone);

        $student = Student::where('reg_no', $regNo)->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => "No student record found with Registration No: {$regNo}"
            ], 404);
        }

        // Validate Session Name
        if (!empty($student->session_name) && strcasecmp(trim($student->session_name), $sessionName) !== 0) {
            return response()->json([
                'success' => false,
                'message' => 'The selected Academic Session does not match this Registration Number.'
            ], 422);
        }

        // Validate Phone Number
        $cleanDbPhone = preg_replace('/[^\d]/', '', $student->phone ?? '');
        $phoneMatches = ($cleanDbPhone === $cleanInputPhone) ||
            (!empty($cleanDbPhone) && !empty($cleanInputPhone) && (
                substr($cleanDbPhone, -10) === substr($cleanInputPhone, -10)
            ));

        if (!empty($student->phone) && !$phoneMatches) {
            return response()->json([
                'success' => false,
                'message' => 'The phone number provided does not match our records. Please verify or use "Forgot your phone number?" for a hint.'
            ], 422);
        }

        // Generate 6-digit OTP
        $otp = (string) mt_rand(100000, 999999);

        // Invalidate prior active OTPs for this student
        \App\Models\VerificationOtp::where('reg_no', $student->reg_no)
            ->where('is_verified', false)
            ->delete();

        // Create new OTP record valid for 5 minutes
        \App\Models\VerificationOtp::create([
            'reg_no' => $student->reg_no,
            'session_name' => $student->session_name,
            'phone' => $student->phone,
            'otp_code' => $otp,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'is_verified' => false,
        ]);

        // Send SMS via REVE SMS Gateway
        $message = "Welcome to Popular Medical College. Your OTP: {$otp}";
        $smsResult = \App\Services\SmsService::sendSms($student->phone, $message);

        // Mask phone for user display (e.g. 017*****095)
        $cleanPhone = preg_replace('/[^\d+]/', '', $student->phone);
        $len = strlen($cleanPhone);
        if ($len > 6) {
            $maskedPhone = substr($cleanPhone, 0, 3) . str_repeat('*', max(3, $len - 6)) . substr($cleanPhone, -3);
        } else {
            $maskedPhone = substr($cleanPhone, 0, 2) . '***' . substr($cleanPhone, -2);
        }

        return response()->json([
            'success' => true,
            'message' => "Welcome to Popular Medical College. An OTP has been sent to {$maskedPhone}.",
            'masked_phone' => $maskedPhone,
            'reg_no' => $student->reg_no,
            'session_name' => $student->session_name,
            'sms_status' => $smsResult['success'] ?? false,
        ]);
    }

    public function verifyResultOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50',
            'session_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'otp_code' => 'required|string|min:4|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide the OTP code sent to your mobile number.',
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $inputOtp = trim($request->input('otp_code'));

        $student = Student::where('reg_no', $regNo)->first();
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => "No student found with Registration Number: {$regNo}"
            ], 404);
        }

        $otpRecord = \App\Models\VerificationOtp::where('reg_no', $regNo)
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'OTP has expired or is invalid. Please click Resend OTP to receive a new code.'
            ], 422);
        }

        if ($otpRecord->attempts >= 5) {
            $otpRecord->delete();
            return response()->json([
                'success' => false,
                'message' => 'Too many failed attempts. Please request a new OTP.'
            ], 422);
        }

        if ($otpRecord->otp_code !== $inputOtp) {
            $otpRecord->increment('attempts');
            return response()->json([
                'success' => false,
                'message' => 'Incorrect OTP code. Please enter the valid OTP sent to your phone.'
            ], 422);
        }

        // OTP Verified successfully
        $otpRecord->update(['is_verified' => true]);

        $results = ExamResult::with('marks')
            ->where('student_id', $student->id)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Verification successful',
            'student' => $student,
            'results' => $results,
        ]);
    }

    public function lookupResult(Request $request): JsonResponse
    {
        // If OTP is provided, verify OTP and return result
        if ($request->filled('otp_code')) {
            return $this->verifyResultOtp($request);
        }

        // Otherwise request/send OTP
        return $this->requestResultOtp($request);
    }

    public function getPhoneHint(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50',
            'session_name' => 'required|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide both Registration Number and Academic Session.',
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $sessionName = trim($request->input('session_name'));

        $student = Student::where('reg_no', $regNo)->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => "No registered student found with Registration Number: {$regNo}"
            ], 404);
        }

        if (!empty($student->session_name) && strcasecmp(trim($student->session_name), $sessionName) !== 0) {
            return response()->json([
                'success' => false,
                'message' => 'Academic session does not match this Registration Number. Please verify your session.'
            ], 422);
        }

        if (empty($student->phone)) {
            return response()->json([
                'success' => false,
                'message' => 'No contact phone number is recorded for this student in our database. Please contact college authority.'
            ], 404);
        }

        // Mask phone number: show first 3 digits and last 3 digits, mask middle with *
        $cleanPhone = preg_replace('/[^\d]/', '', $student->phone);
        if (str_starts_with($cleanPhone, '8801')) {
            $cleanPhone = substr($cleanPhone, 2);
        }
        $len = strlen($cleanPhone);
        if ($len > 6) {
            $prefix = substr($cleanPhone, 0, 3);
            $suffix = substr($cleanPhone, -3);
            $middle = str_repeat('*', max(3, $len - 6));
            $maskedPhone = $prefix . $middle . $suffix;
        } else {
            $maskedPhone = substr($cleanPhone, 0, 2) . '***' . substr($cleanPhone, -2);
        }

        return response()->json([
            'success' => true,
            'message' => 'Phone hint retrieved successfully',
            'student_name' => $student->student_name,
            'masked_phone' => $maskedPhone,
            'reg_no' => $student->reg_no,
            'session_name' => $student->session_name,
        ]);
    }

    public function requestRegisterOtp(Request $request): JsonResponse
    {
        $registrationEnabled = Setting::get('student_registration_enabled', '1');
        if ($registrationEnabled !== '1') {
            return response()->json([
                'success' => false,
                'message' => 'Online student registration is currently closed.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50|unique:students,reg_no',
            'student_name' => 'required|string|max:255',
            'session_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'father_name' => 'required|string|max:255',
            'mother_name' => 'required|string|max:255',
            'address' => 'required|string',
        ], [
            'reg_no.unique' => 'এই রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে সিস্টেমে নিবন্ধিত রয়েছে। (This Registration Number is already enrolled.)',
            'reg_no.required' => 'রেজিস্ট্রেশন নম্বর আবশ্যক।',
            'student_name.required' => 'শিক্ষার্থীর নাম আবশ্যক।',
            'session_name.required' => 'সেশন আবশ্যক।',
            'phone.required' => 'মোবাইল নম্বর আবশ্যক।',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        $phone = trim($request->input('phone'));
        $cleanPhone = preg_replace('/[^\d]/', '', $phone);
        if (strlen($cleanPhone) < 10) {
            return response()->json([
                'success' => false,
                'message' => 'অনুগ্রহ করে সঠিক মোবাইল নম্বর প্রদান করুন।'
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));

        // Generate 6-digit OTP code
        $otp = (string) mt_rand(100000, 999999);

        // Invalidate prior unverified OTPs for this reg_no
        \App\Models\VerificationOtp::where('reg_no', $regNo)
            ->where('is_verified', false)
            ->delete();

        // Create new OTP record valid for 5 minutes
        \App\Models\VerificationOtp::create([
            'reg_no' => $regNo,
            'session_name' => $request->input('session_name'),
            'phone' => $phone,
            'otp_code' => $otp,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'is_verified' => false,
        ]);

        // Send SMS via REVE SMS Gateway
        $message = "Welcome to Popular Medical College. Your Registration OTP: {$otp}";
        $smsResult = \App\Services\SmsService::sendSms($phone, $message);

        // Mask phone for display
        $len = strlen($cleanPhone);
        if ($len > 6) {
            $maskedPhone = substr($cleanPhone, 0, 3) . str_repeat('*', max(3, $len - 6)) . substr($cleanPhone, -3);
        } else {
            $maskedPhone = substr($cleanPhone, 0, 2) . '***' . substr($cleanPhone, -2);
        }

        return response()->json([
            'success' => true,
            'message' => "আপনার মোবাইল নম্বর {$maskedPhone}-এ ভেরিফিকেশন ওটিপি পাঠানো হয়েছে।",
            'masked_phone' => $maskedPhone,
            'reg_no' => $regNo,
            'sms_status' => $smsResult['success'] ?? false,
        ]);
    }

    public function registerStudent(Request $request): JsonResponse
    {
        $registrationEnabled = Setting::get('student_registration_enabled', '1');
        if ($registrationEnabled !== '1') {
            return response()->json([
                'success' => false,
                'message' => 'Online student registration is currently closed.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50|unique:students,reg_no',
            'student_name' => 'required|string|max:255',
            'session_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'father_name' => 'required|string|max:255',
            'mother_name' => 'required|string|max:255',
            'address' => 'required|string',
            'otp_code' => 'required|string|min:4|max:10',
        ], [
            'reg_no.unique' => 'এই রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে সিস্টেমে নিবন্ধিত রয়েছে।',
            'otp_code.required' => 'মোবাইলে পাঠানো ওটিপি কোডটি প্রদান করা আবশ্যক।',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $inputOtp = trim($request->input('otp_code'));

        $otpRecord = \App\Models\VerificationOtp::where('reg_no', $regNo)
            ->where('expires_at', '>=', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'ওটিপি কোডের মেয়াদ উত্তীর্ণ হয়ে গেছে বা সঠিক নয়। অনুগ্রহ করে পুনরায় ওটিপি পাঠান।'
            ], 422);
        }

        if ($otpRecord->attempts >= 5) {
            $otpRecord->delete();
            return response()->json([
                'success' => false,
                'message' => 'অনেকবার ভুল ওটিপি চেষ্টা করা হয়েছে। নতুন ওটিপি চেয়ে নিন।'
            ], 429);
        }

        if ($otpRecord->otp_code !== $inputOtp) {
            $otpRecord->increment('attempts');
            $remaining = 5 - $otpRecord->attempts;
            return response()->json([
                'success' => false,
                'message' => "ভুল ওটিপি কোড! সঠিক কোড দিন। (আর {$remaining} বার চেষ্টা করতে পারবেন)"
            ], 422);
        }

        // Clean up OTP record
        $otpRecord->delete();

        $student = Student::create([
            'reg_no' => $regNo,
            'student_name' => trim($request->input('student_name')),
            'session_name' => $request->input('session_name'),
            'phone' => $request->input('phone'),
            'father_name' => $request->input('father_name'),
            'mother_name' => $request->input('mother_name'),
            'address' => $request->input('address'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'অভিনন্দন! স্টুডেন্ট রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে।',
            'student' => $student
        ], 201);
    }

    public function requestAdmissionOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'candidate_name' => 'required|string|max:255',
            'mobile' => 'required|string|max:30',
            'session_name' => 'nullable|string|max:100',
        ], [
            'candidate_name.required' => 'শিক্ষার্থীর পূর্ণ নাম আবশ্যক।',
            'mobile.required' => 'মোবাইল নম্বর আবশ্যক।',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        $mobile = trim($request->input('mobile'));
        $cleanPhone = preg_replace('/[^\d]/', '', $mobile);
        if (str_starts_with($cleanPhone, '8801')) {
            $cleanPhone = substr($cleanPhone, 2);
        }

        if (strlen($cleanPhone) < 10) {
            return response()->json([
                'success' => false,
                'message' => 'অনুগ্রহ করে সঠিক মোবাইল নম্বর প্রদান করুন।'
            ], 422);
        }

        $otpKey = 'ADM_' . substr($cleanPhone, -15);
        $otp = (string) mt_rand(100000, 999999);

        // Invalidate prior unverified OTPs for this mobile
        \App\Models\VerificationOtp::where('reg_no', $otpKey)
            ->where('is_verified', false)
            ->delete();

        \App\Models\VerificationOtp::create([
            'reg_no' => $otpKey,
            'session_name' => $request->input('session_name') ?: '',
            'phone' => $mobile,
            'otp_code' => $otp,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'is_verified' => false,
        ]);

        $candidateName = trim($request->input('candidate_name'));
        $message = "Welcome to Popular Medical College.\nName : {$candidateName}\nAdmission OTP : {$otp}";
        $smsResult = \App\Services\SmsService::sendSms($mobile, $message);

        // Mask phone for display
        $len = strlen($cleanPhone);
        if ($len > 6) {
            $maskedPhone = substr($cleanPhone, 0, 3) . str_repeat('*', max(3, $len - 6)) . substr($cleanPhone, -3);
        } else {
            $maskedPhone = substr($cleanPhone, 0, 2) . '***' . substr($cleanPhone, -2);
        }

        return response()->json([
            'success' => true,
            'message' => "আপনার মোবাইল নম্বর {$maskedPhone}-এ ভেরিফিকেশন ওটিপি পাঠানো হয়েছে।",
            'masked_phone' => $maskedPhone,
            'sms_status' => $smsResult['success'] ?? false,
        ]);
    }

    public function submitAdmission(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'candidate_name' => 'required|string|max:255',
            'candidate_name_bn' => 'nullable|string|max:255',
            'sex' => 'nullable|string|max:30',
            'father_name' => 'nullable|string|max:255',
            'father_name_bn' => 'nullable|string|max:255',
            'father_occupation' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'mother_name_bn' => 'nullable|string|max:255',
            'mother_occupation' => 'nullable|string|max:255',
            'guardian_name' => 'nullable|string|max:255',
            'guardian_occupation' => 'nullable|string|max:255',
            'date_of_birth' => 'nullable|string|max:50',
            'religion' => 'nullable|string|max:100',
            'identification_mark' => 'nullable|string|max:255',
            'nationality' => 'nullable|string|max:100',
            'home_district' => 'nullable|string|max:120',
            'communication_address' => 'nullable|string',
            'permanent_address' => 'nullable|string',
            'mobile' => 'required|string|max:30',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:150',
            'session_name' => 'nullable|string|max:100',
            'group_name' => 'nullable|string|max:100',
            'college_code' => 'nullable|string|max:50',
            'admission_roll_no' => 'nullable|string|max:50',
            'merit_position' => 'nullable|string|max:50',
            'merit_score' => 'nullable|string|max:50',
            'photo' => 'nullable|file|max:20480', // Up to 20MB supported (compressed automatically)
            'otp_code' => 'required|string|min:4|max:10',
        ], [
            'otp_code.required' => 'অ্যাডমিশন সম্পন্ন করতে মোবাইল নম্বরে পাঠানো ওটিপি কোডটি প্রদান করা আবশ্যক।',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify Admission OTP before saving application
        $mobile = trim($request->input('mobile'));
        $cleanPhone = preg_replace('/[^\d]/', '', $mobile);
        if (str_starts_with($cleanPhone, '8801')) {
            $cleanPhone = substr($cleanPhone, 2);
        }
        $otpKey = 'ADM_' . substr($cleanPhone, -15);
        $inputOtp = trim($request->input('otp_code'));

        $otpRecord = \App\Models\VerificationOtp::where('reg_no', $otpKey)
            ->where('expires_at', '>=', now())
            ->latest()
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'ওটিপি কোডের মেয়াদ উত্তীর্ণ হয়ে গেছে বা পাওয়া যায়নি। অনুগ্রহ করে পুনরায় ওটিপি পাঠান।'
            ], 422);
        }

        if ($otpRecord->attempts >= 5) {
            $otpRecord->delete();
            return response()->json([
                'success' => false,
                'message' => 'অনেকবার ভুল ওটিপি চেষ্টা করা হয়েছে। নতুন ওটিপি চেয়ে নিন।'
            ], 429);
        }

        if ($otpRecord->otp_code !== $inputOtp) {
            $otpRecord->increment('attempts');
            $remaining = 5 - $otpRecord->attempts;
            return response()->json([
                'success' => false,
                'message' => "ভুল ওটিপি কোড! সঠিক কোড দিন। (আর {$remaining} বার চেষ্টা করতে পারবেন)"
            ], 422);
        }

        // Clean up OTP record upon successful verification
        $otpRecord->delete();

        $photoPath = null;
        if ($request->hasFile('photo') && $request->file('photo')->isValid()) {
            $photoFile = $request->file('photo');
            $photoPath = $photoFile->store('admissions/photos', 'public');

            // Safety fallback: If photo size > 2MB and GD is enabled, compress to JPEG <= 2MB
            $fullPhotoPath = storage_path('app/public/' . $photoPath);
            if (file_exists($fullPhotoPath) && filesize($fullPhotoPath) > 2 * 1024 * 1024 && extension_loaded('gd')) {
                try {
                    $imgInfo = @getimagesize($fullPhotoPath);
                    if ($imgInfo) {
                        $srcImg = null;
                        switch ($imgInfo[2]) {
                            case IMAGETYPE_JPEG: $srcImg = @imagecreatefromjpeg($fullPhotoPath); break;
                            case IMAGETYPE_PNG:  $srcImg = @imagecreatefrompng($fullPhotoPath); break;
                            case IMAGETYPE_WEBP: if (function_exists('imagecreatefromwebp')) $srcImg = @imagecreatefromwebp($fullPhotoPath); break;
                        }
                        if ($srcImg) {
                            $w = imagesx($srcImg);
                            $h = imagesy($srcImg);
                            $maxDim = 1200;
                            if ($w > $maxDim || $h > $maxDim) {
                                $ratio = min($maxDim / $w, $maxDim / $h);
                                $nw = (int)round($w * $ratio);
                                $nh = (int)round($h * $ratio);
                                $dstImg = imagecreatetruecolor($nw, $nh);
                                $white = imagecolorallocate($dstImg, 255, 255, 255);
                                imagefill($dstImg, 0, 0, $white);
                                imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $nw, $nh, $w, $h);
                                imagedestroy($srcImg);
                                $srcImg = $dstImg;
                            }
                            $newPath = preg_replace('/\.[^.]+$/', '.jpg', $photoPath);
                            $newFullPath = storage_path('app/public/' . $newPath);
                            @imagejpeg($srcImg, $newFullPath, 82);
                            imagedestroy($srcImg);
                            if ($newFullPath !== $fullPhotoPath && file_exists($newFullPath)) {
                                @unlink($fullPhotoPath);
                            }
                            $photoPath = $newPath;
                        }
                    }
                } catch (\Throwable $e) {
                    // keep original stored file on fallback
                }
            }
        }

        // Process all document and certificate attachments
        $attachmentDefinitions = [
            'ssc_marksheet' => ['label' => 'SSC / O-Level Marksheet / Academic Transcript', 'category' => 'academic'],
            'ssc_certificate' => ['label' => 'SSC / O-Level Certificate / Testimonial', 'category' => 'academic'],
            'hsc_marksheet' => ['label' => 'HSC / A-Level Marksheet / Academic Transcript', 'category' => 'academic'],
            'hsc_certificate' => ['label' => 'HSC / A-Level Certificate / Testimonial', 'category' => 'academic'],
            'admission_test_doc' => ['label' => 'DGHS Medical Admission Test Admit Card / Score Card', 'category' => 'academic'],
            'student_nid_birth' => ['label' => 'Student National ID / Digital Birth Certificate', 'category' => 'identity'],
            'guardian_nid' => ['label' => 'Parent / Guardian National ID Card', 'category' => 'identity'],
            'citizenship_certificate' => ['label' => 'Citizenship / Character Certificate', 'category' => 'identity'],
            'candidate_signature' => ['label' => 'Candidate Signature', 'category' => 'signature'],
            'guardian_signature' => ['label' => 'Parent / Guardian Signature', 'category' => 'signature'],
            'quota_certificate' => ['label' => 'Quota / Special Category Certificate', 'category' => 'special'],
            'other_document' => ['label' => 'Other Relevant Document', 'category' => 'other'],
        ];

        $attachments = [];
        foreach ($request->allFiles() as $field => $file) {
            if ($field === 'photo') continue;
            if (is_array($file)) continue;
            if ($file->isValid()) {
                $path = $file->store('admissions/attachments', 'public');
                $def = $attachmentDefinitions[$field] ?? [
                    'label' => ucwords(str_replace(['_', '-'], ' ', $field)),
                    'category' => 'document'
                ];

                $attachments[$field] = [
                    'key' => $field,
                    'label' => $def['label'],
                    'category' => $def['category'],
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'relative_url' => 'storage/' . $path,
                    'file_size' => $file->getSize(),
                    'extension' => strtolower($file->getClientOriginalExtension()),
                    'uploaded_at' => now()->toIso8601String(),
                ];
            }
        }

        // Generate Serial No: PMC + [Session Year] + [Sequential (01, 02, 03...)]
        $sessionInput = trim((string)$request->input('session_name', ''));
        $year = '';
        if (preg_match('/(20\d{2})/', $sessionInput, $m)) {
            $year = $m[1];
        } elseif (preg_match('/(\d{4})/', $sessionInput, $m)) {
            $year = $m[1];
        } else {
            $year = date('Y');
        }

        $prefix = 'PMC' . $year;
        $prefixLen = strlen($prefix);

        // Calculate max sequential number for this session prefix
        $existingSerials = AdmissionApplication::where('serial_no', 'LIKE', $prefix . '%')
            ->pluck('serial_no');

        $maxNumber = 0;
        foreach ($existingSerials as $s) {
            $numPart = substr($s, $prefixLen);
            if (is_numeric($numPart)) {
                $val = (int)$numPart;
                if ($val > $maxNumber) {
                    $maxNumber = $val;
                }
            }
        }

        $nextNum = $maxNumber + 1;
        $serialNo = $prefix . sprintf('%02d', $nextNum);

        $admission = AdmissionApplication::create([
            'serial_no' => $serialNo,
            'candidate_name' => trim($request->input('candidate_name')),
            'candidate_name_bn' => $request->input('candidate_name_bn'),
            'sex' => $request->input('sex'),
            'father_name' => $request->input('father_name'),
            'father_name_bn' => $request->input('father_name_bn'),
            'father_occupation' => $request->input('father_occupation'),
            'mother_name' => $request->input('mother_name'),
            'mother_name_bn' => $request->input('mother_name_bn'),
            'mother_occupation' => $request->input('mother_occupation'),
            'guardian_name' => $request->input('guardian_name'),
            'guardian_occupation' => $request->input('guardian_occupation'),
            'date_of_birth' => $request->input('date_of_birth'),
            'religion' => $request->input('religion'),
            'identification_mark' => $request->input('identification_mark'),
            'nationality' => $request->input('nationality') ?: 'Bangladeshi',
            'home_district' => $request->input('home_district'),
            'communication_address' => $request->input('communication_address'),
            'permanent_address' => $request->input('permanent_address'),
            'mobile' => $request->input('mobile'),
            'phone' => $request->input('phone'),
            'email' => $request->input('email'),
            'session_name' => $request->input('session_name'),
            'group_name' => $request->input('group_name'),
            'college_code' => $request->input('college_code'),
            'admission_roll_no' => $request->input('admission_roll_no'),
            'merit_position' => $request->input('merit_position'),
            'merit_score' => $request->input('merit_score'),
            'academic_json' => is_string($request->input('academic_json')) ? json_decode($request->input('academic_json'), true) : $request->input('academic_json'),
            'activities_json' => is_string($request->input('activities_json')) ? json_decode($request->input('activities_json'), true) : $request->input('activities_json'),
            'declaration_json' => is_string($request->input('declaration_json')) ? json_decode($request->input('declaration_json'), true) : $request->input('declaration_json'),
            'undertaking_json' => is_string($request->input('undertaking_json')) ? json_decode($request->input('undertaking_json'), true) : $request->input('undertaking_json'),
            'photo_path' => $photoPath,
            'attachments_json' => $attachments,
            'status' => 'Pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admission application submitted successfully.',
            'serial_no' => $serialNo,
            'admission' => $admission
        ], 201);
    }
}
