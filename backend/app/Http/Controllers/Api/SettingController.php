<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\Activity;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SettingController extends Controller
{
    public static function getDefaultCurriculum(): array
    {
        return [
            [
                'stage' => '1st Professional',
                'total_marks' => 1300,
                'subjects' => [
                    ['name' => 'Anatomy', 'full' => 500],
                    ['name' => 'Physiology', 'full' => 400],
                    ['name' => 'Biochemistry', 'full' => 400],
                ]
            ],
            [
                'stage' => '2nd Professional',
                'total_marks' => 600,
                'subjects' => [
                    ['name' => 'Community Medicine', 'full' => 300],
                    ['name' => 'Forensic Medicine', 'full' => 300],
                ]
            ],
            [
                'stage' => '3rd Professional',
                'total_marks' => 600,
                'subjects' => [
                    ['name' => 'Pharmacology & Therapeutics', 'full' => 300],
                    ['name' => 'Pathology & Microbiology', 'full' => 300],
                ]
            ],
            [
                'stage' => 'Final Professional',
                'total_marks' => 1500,
                'subjects' => [
                    ['name' => 'Medicine', 'full' => 500],
                    ['name' => 'Surgery', 'full' => 500],
                    ['name' => 'Obstetrics & Gynaecology', 'full' => 500],
                ]
            ],
        ];
    }

    public function index(): JsonResponse
    {
        $settings = Setting::all()->pluck('setting_value', 'setting_key');
        $sessions = AcademicSession::orderBy('session_name', 'desc')->get();
        $activities = Activity::orderBy('activity_name', 'asc')->get();
        
        $curriculumJson = Setting::get('prof_curriculum');
        $curriculum = $curriculumJson ? json_decode($curriculumJson, true) : static::getDefaultCurriculum();

        return response()->json([
            'success' => true,
            'settings' => $settings,
            'sessions' => $sessions,
            'activities' => $activities,
            'prof_curriculum' => $curriculum,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if ($request->has('site_header')) {
            Setting::set('site_header', trim($request->input('site_header')));
        }
        if ($request->has('landing_subtitle')) {
            Setting::set('landing_subtitle', trim($request->input('landing_subtitle')));
        }
        if ($request->has('student_registration_enabled')) {
            Setting::set('student_registration_enabled', $request->input('student_registration_enabled') ? '1' : '0');
        }
        if ($request->has('student_lookup_enabled')) {
            Setting::set('student_lookup_enabled', $request->input('student_lookup_enabled') ? '1' : '0');
        }

        if ($request->hasFile('site_logo') && $request->file('site_logo')->isValid()) {
            $path = $request->file('site_logo')->store('branding', 'public');
            Setting::set('site_logo_path', $path);
        }

        if ($request->has('sms_enabled')) {
            Setting::set('sms_enabled', $request->input('sms_enabled') ? '1' : '0');
        }
        if ($request->has('sms_gateway_url')) {
            Setting::set('sms_gateway_url', trim($request->input('sms_gateway_url')));
        }
        if ($request->has('sms_api_key')) {
            Setting::set('sms_api_key', trim($request->input('sms_api_key')));
        }
        if ($request->has('sms_secret_key')) {
            Setting::set('sms_secret_key', trim($request->input('sms_secret_key')));
        }
        if ($request->has('sms_caller_id')) {
            Setting::set('sms_caller_id', trim($request->input('sms_caller_id')));
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'settings' => Setting::all()->pluck('setting_value', 'setting_key')
        ]);
    }

    public function testSms(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid destination phone number.',
                'errors' => $validator->errors()
            ], 422);
        }

        $phone = trim($request->input('phone'));
        $testMessage = "Welcome to Popular Medical College. Test SMS from REVE SMS Gateway at " . date('d-m-Y H:i:s');

        $result = \App\Services\SmsService::sendSms($phone, $testMessage);

        return response()->json([
            'success' => $result['success'] ?? false,
            'message' => ($result['success'] ?? false) 
                ? 'Test SMS sent successfully!' 
                : 'Failed to send test SMS. Check gateway credentials or response.',
            'details' => $result
        ]);
    }

    public function addSession(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_name' => 'required|string|max:120|unique:academic_sessions,session_name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $session = AcademicSession::create([
            'session_name' => trim($request->input('session_name')),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Session added successfully',
            'data' => $session,
        ], 201);
    }

    public function deleteSession(int $id): JsonResponse
    {
        $session = AcademicSession::find($id);
        if ($session) {
            $session->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Session deleted successfully',
        ]);
    }

    public function addActivity(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'activity_name' => 'required|string|max:120|unique:activities,activity_name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $activity = Activity::create([
            'activity_name' => trim($request->input('activity_name')),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Activity added successfully',
            'data' => $activity,
        ], 201);
    }

    public function deleteActivity(int $id): JsonResponse
    {
        $activity = Activity::find($id);
        if ($activity) {
            $activity->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Activity deleted successfully',
        ]);
    }

    public function getCurriculum(): JsonResponse
    {
        $curriculumJson = Setting::get('prof_curriculum');
        $curriculum = $curriculumJson ? json_decode($curriculumJson, true) : static::getDefaultCurriculum();

        return response()->json([
            'success' => true,
            'curriculum' => $curriculum
        ]);
    }

    public function saveCurriculum(Request $request): JsonResponse
    {
        $curriculum = $request->input('curriculum');
        if (!is_array($curriculum)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid curriculum payload provided.'
            ], 422);
        }

        Setting::set('prof_curriculum', json_encode($curriculum));

        return response()->json([
            'success' => true,
            'message' => 'Examination curriculum and subjects saved successfully',
            'curriculum' => $curriculum
        ]);
    }
}
