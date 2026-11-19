<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionApplication;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AdmissionApplication::with('approver:id,username,display_name');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('session_name')) {
            $query->where('session_name', $request->input('session_name'));
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('candidate_name', 'like', $search)
                  ->orWhere('serial_no', 'like', $search)
                  ->orWhere('mobile', 'like', $search)
                  ->orWhere('reg_no', 'like', $search)
                  ->orWhere('admission_roll_no', 'like', $search);
            });
        }

        if ($request->boolean('all') || $request->input('per_page') == -1) {
            $admissions = $query->orderBy('serial_no', 'asc')->get();
            return response()->json([
                'success' => true,
                'data' => $admissions,
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $admissions = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $admissions,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $admission = AdmissionApplication::with('approver:id,username,display_name')->find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'Admission application not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $admission,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $admission = AdmissionApplication::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'Admission application not found',
            ], 404);
        }

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
            'email' => 'nullable|string|max:150',
            'session_name' => 'nullable|string|max:100',
            'group_name' => 'nullable|string|max:100',
            'college_code' => 'nullable|string|max:50',
            'admission_roll_no' => 'nullable|string|max:50',
            'merit_position' => 'nullable|string|max:50',
            'merit_score' => 'nullable|string|max:50',
            'reg_no' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:Pending,Approved,Rejected',
            'rejection_note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->only([
            'candidate_name', 'candidate_name_bn', 'sex',
            'father_name', 'father_name_bn', 'father_occupation',
            'mother_name', 'mother_name_bn', 'mother_occupation',
            'guardian_name', 'guardian_occupation',
            'date_of_birth', 'religion', 'identification_mark',
            'nationality', 'home_district',
            'communication_address', 'permanent_address',
            'mobile', 'phone', 'email',
            'session_name', 'group_name', 'college_code',
            'admission_roll_no', 'merit_position', 'merit_score',
            'reg_no', 'status', 'rejection_note'
        ]);

        // Process json fields if passed
        if ($request->has('academic_json')) {
            $data['academic_json'] = is_array($request->input('academic_json')) 
                ? $request->input('academic_json') 
                : json_decode($request->input('academic_json'), true);
        }

        if ($request->has('activities_json')) {
            $data['activities_json'] = is_array($request->input('activities_json')) 
                ? $request->input('activities_json') 
                : json_decode($request->input('activities_json'), true);
        }

        // Handle optional photo replacement if uploaded via multipart
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('admissions/photos', 'public');
            $data['photo_path'] = $path;
        }

        $admission->update($data);

        // If registration number is present and status is Approved, keep students table in sync
        if (!empty($admission->reg_no) && $admission->status === 'Approved') {
            $student = Student::where('reg_no', $admission->reg_no)->first();
            if ($student) {
                $student->update([
                    'student_name' => $admission->candidate_name,
                    'session_name' => $admission->session_name ?: $student->session_name,
                    'phone' => $admission->mobile ?: $admission->phone,
                    'father_name' => $admission->father_name,
                    'mother_name' => $admission->mother_name,
                    'address' => $admission->permanent_address ?: $admission->communication_address,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Admission application details updated successfully.',
            'data' => $admission->fresh(['approver']),
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $admission = AdmissionApplication::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'Admission application not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50',
            'session_name' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $regNo = trim($request->input('reg_no'));
        $sessionName = $request->input('session_name') ?: $admission->session_name;

        return DB::transaction(function () use ($admission, $regNo, $sessionName, $request) {
            $admission->update([
                'reg_no' => $regNo,
                'session_name' => $sessionName,
                'status' => 'Approved',
                'rejection_note' => null,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

            // Sync with students table
            $student = Student::where('reg_no', $regNo)->first();
            if ($student) {
                $student->update([
                    'student_name' => $admission->candidate_name,
                    'session_name' => $sessionName,
                    'phone' => $admission->mobile ?: $admission->phone,
                    'father_name' => $admission->father_name,
                    'mother_name' => $admission->mother_name,
                    'address' => $admission->permanent_address ?: $admission->communication_address,
                ]);
            } else {
                Student::create([
                    'reg_no' => $regNo,
                    'student_name' => $admission->candidate_name,
                    'session_name' => $sessionName,
                    'phone' => $admission->mobile ?: $admission->phone,
                    'father_name' => $admission->father_name,
                    'mother_name' => $admission->mother_name,
                    'address' => $admission->permanent_address ?: $admission->communication_address,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Application approved successfully and student record updated.',
                'data' => $admission->fresh(['approver']),
            ]);
        });
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $admission = AdmissionApplication::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'Admission application not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'rejection_note' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Rejection note is required.',
                'errors' => $validator->errors()
            ], 422);
        }

        $admission->update([
            'status' => 'Rejected',
            'rejection_note' => trim($request->input('rejection_note')),
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Application marked as rejected.',
            'data' => $admission->fresh(['approver']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $admission = AdmissionApplication::find($id);

        if (!$admission) {
            return response()->json([
                'success' => false,
                'message' => 'Admission application not found',
            ], 404);
        }

        $admission->delete();

        return response()->json([
            'success' => true,
            'message' => 'Admission record deleted successfully',
        ]);
    }

    /**
     * List all admission applications that have uploaded photos,
     * filterable by session and Admission ID / candidate search.
     */
    public function listPhotos(Request $request): JsonResponse
    {
        $query = AdmissionApplication::query()
            ->select([
                'id',
                'serial_no',
                'reg_no',
                'candidate_name',
                'session_name',
                'group_name',
                'mobile',
                'photo_path',
                'status',
                'created_at',
            ])
            ->whereNotNull('photo_path')
            ->where('photo_path', '!=', '');

        if ($request->filled('session_name')) {
            $query->where('session_name', $request->input('session_name'));
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('serial_no', 'like', $search)
                  ->orWhere('candidate_name', 'like', $search)
                  ->orWhere('reg_no', 'like', $search)
                  ->orWhere('mobile', 'like', $search);
            });
        }

        $items = $query->orderBy('serial_no', 'asc')->get()->map(function ($item) {
            $fullPath = storage_path('app/public/' . ltrim($item->photo_path, '/'));
            $exists = file_exists($fullPath) && is_file($fullPath);
            $ext = $exists ? (pathinfo($fullPath, PATHINFO_EXTENSION) ?: 'jpg') : 'jpg';
            $item->file_exists = $exists;
            $item->file_size = $exists ? filesize($fullPath) : 0;
            $item->extension = strtolower($ext);
            $item->download_filename = ($item->serial_no ?: ('student_' . $item->id)) . '.' . $item->extension;
            return $item;
        })->filter(fn ($i) => $i->file_exists)->values();

        return response()->json([
            'success' => true,
            'data' => $items,
            'total' => $items->count(),
        ]);
    }

    /**
     * Download a single student's photo renamed to their Admission ID (e.g. PMC202601.jpg).
     */
    public function downloadSinglePhoto(int $id)
    {
        $admission = AdmissionApplication::find($id);

        if (!$admission || empty($admission->photo_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Student photo not found.',
            ], 404);
        }

        $fullPath = storage_path('app/public/' . ltrim($admission->photo_path, '/'));
        if (!file_exists($fullPath) || !is_file($fullPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Photo file is missing from server storage.',
            ], 404);
        }

        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION) ?: 'jpg');
        $cleanSerial = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($admission->serial_no ?: ('student_' . $admission->id)));
        $fileName = $cleanSerial . '.' . $ext;

        return response()->download($fullPath, $fileName);
    }

    /**
     * Bulk download all student photos for a selected session (or filter) as a ZIP archive,
     * with each photo file named strictly as its Admission ID (e.g. PMC202601.jpg, PMC202602.jpg).
     */
    public function downloadPhotosZip(Request $request)
    {
        if (!class_exists(\ZipArchive::class)) {
            return response()->json([
                'success' => false,
                'message' => 'PHP ZipArchive extension is not enabled on this server.',
            ], 500);
        }

        $query = AdmissionApplication::query()
            ->select(['id', 'serial_no', 'session_name', 'photo_path'])
            ->whereNotNull('photo_path')
            ->where('photo_path', '!=', '');

        if ($request->filled('session_name')) {
            $query->where('session_name', $request->input('session_name'));
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('serial_no', 'like', $search)
                  ->orWhere('candidate_name', 'like', $search)
                  ->orWhere('reg_no', 'like', $search)
                  ->orWhere('mobile', 'like', $search);
            });
        }

        $records = $query->orderBy('serial_no', 'asc')->get();

        $tmpDir = storage_path('app/temp');
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0755, true);
        }

        $sessionLabel = $request->filled('session_name')
            ? preg_replace('/[^A-Za-z0-9_-]/', '_', $request->input('session_name'))
            : 'All_Sessions';
        $zipFileName = 'PMC_Student_Photos_' . $sessionLabel . '.zip';
        $zipPath = $tmpDir . DIRECTORY_SEPARATOR . 'photos_' . uniqid() . '.zip';

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ZIP archive on server.',
            ], 500);
        }

        $addedCount = 0;
        $usedNames = [];

        foreach ($records as $adm) {
            $fullPath = storage_path('app/public/' . ltrim($adm->photo_path, '/'));
            if (!file_exists($fullPath) || !is_file($fullPath)) {
                continue;
            }

            $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION) ?: 'jpg');
            $baseSerial = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($adm->serial_no ?: ('student_' . $adm->id)));
            $entryName = $baseSerial . '.' . $ext;

            // Ensure unique filename inside zip if two records somehow share serial_no
            if (isset($usedNames[$entryName])) {
                $usedNames[$entryName]++;
                $entryName = $baseSerial . '_' . $usedNames[$entryName] . '.' . $ext;
            } else {
                $usedNames[$entryName] = 1;
            }

            if ($zip->addFile($fullPath, $entryName)) {
                $addedCount++;
            }
        }

        $zip->close();

        if ($addedCount === 0 || !file_exists($zipPath)) {
            @unlink($zipPath);
            return response()->json([
                'success' => false,
                'message' => 'No downloadable student photos found for the selected session.',
            ], 404);
        }

        return response()->download($zipPath, $zipFileName)->deleteFileAfterSend(true);
    }
}
