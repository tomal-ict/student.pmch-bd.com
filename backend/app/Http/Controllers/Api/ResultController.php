<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamResult;
use App\Models\ResultMark;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ResultController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ExamResult::with(['student:id,reg_no,student_name,session_name', 'marks']);

        if ($request->filled('exam_type')) {
            $query->where('exam_type', $request->input('exam_type'));
        }

        if ($request->filled('exam_year')) {
            $query->where('exam_year', $request->input('exam_year'));
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->input('student_id'));
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('roll_no', 'like', $search)
                  ->orWhereHas('student', function ($sq) use ($search) {
                      $sq->where('reg_no', 'like', $search)
                         ->orWhere('student_name', 'like', $search);
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 15);
        $results = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'exam_type' => 'required|string|max:50',
            'exam_month' => 'nullable|string|max:20',
            'exam_year' => 'nullable|string|max:10',
            'exam_date_value' => 'nullable|string|max:7',
            'roll_no' => 'nullable|string|max:50',
            'grand_total' => 'nullable|numeric',
            'total_hidden' => 'boolean',
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

        // 1. Check if candidate has already PASSED this professional exam stage
        $alreadyPassed = ExamResult::where('student_id', $request->input('student_id'))
            ->where('exam_type', $request->input('exam_type'))
            ->where('result_status', 'Passed')
            ->exists();

        if ($alreadyPassed) {
            return response()->json([
                'success' => false,
                'message' => 'Candidate has already PASSED the ' . $request->input('exam_type') . ' examination. Further result entry for this stage is not permitted.'
            ], 422);
        }

        // 2. Check exact duplicate attempt (same student, exam stage, session month, year, roll_no)
        $duplicate = ExamResult::where('student_id', $request->input('student_id'))
            ->where('exam_type', $request->input('exam_type'))
            ->where('exam_month', $request->input('exam_month'))
            ->where('exam_year', $request->input('exam_year'))
            ->where('roll_no', $request->input('roll_no'))
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'A result with this student, exam type, month (' . $request->input('exam_month') . '), year (' . $request->input('exam_year') . '), and roll number already exists.'
            ], 422);
        }

        return DB::transaction(function () use ($request) {
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
                'student_id' => $request->input('student_id'),
                'exam_type' => $request->input('exam_type'),
                'exam_month' => $request->input('exam_month'),
                'exam_year' => $request->input('exam_year'),
                'exam_date_value' => $request->input('exam_date_value'),
                'roll_no' => $request->input('roll_no'),
                'grand_total' => $grandTotal,
                'total_hidden' => (bool) $request->input('total_hidden', false),
                'result_status' => $request->input('result_status', 'Passed'),
                'failed_subjects' => $request->input('failed_subjects'),
                'remarks' => $request->input('remarks'),
            ]);

            foreach ($marksData as $mark) {
                ResultMark::create([
                    'exam_result_id' => $result->id,
                    'subject_name' => trim($mark['subject_name']),
                    'full_marks' => (float) ($mark['full_marks'] ?? 100),
                    'obtained_marks' => isset($mark['obtained_marks']) && $mark['obtained_marks'] !== '' ? (float) $mark['obtained_marks'] : null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Result created successfully',
                'data' => $result->load('marks', 'student'),
            ], 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        $result = ExamResult::with(['student', 'marks'])->find($id);

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Result not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $result = ExamResult::find($id);

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Result not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'exam_type' => 'required|string|max:50',
            'exam_month' => 'nullable|string|max:20',
            'exam_year' => 'nullable|string|max:10',
            'exam_date_value' => 'nullable|string|max:7',
            'roll_no' => 'nullable|string|max:50',
            'grand_total' => 'nullable|numeric',
            'total_hidden' => 'boolean',
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

        if ($request->input('result_status') === 'Passed') {
            $anotherPassed = ExamResult::where('student_id', $result->student_id)
                ->where('exam_type', $request->input('exam_type'))
                ->where('id', '!=', $id)
                ->where('result_status', 'Passed')
                ->exists();

            if ($anotherPassed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Candidate already has another record marked as PASSED for ' . $request->input('exam_type') . '.'
                ], 422);
            }
        }

        return DB::transaction(function () use ($request, $result) {
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
                : ($hasMarks ? $calculatedTotal : $result->grand_total);

            $result->update([
                'exam_type' => $request->input('exam_type'),
                'exam_month' => $request->input('exam_month'),
                'exam_year' => $request->input('exam_year'),
                'exam_date_value' => $request->input('exam_date_value'),
                'roll_no' => $request->input('roll_no'),
                'grand_total' => $grandTotal,
                'total_hidden' => (bool) $request->input('total_hidden', false),
                'result_status' => $request->input('result_status', 'Passed'),
                'failed_subjects' => $request->input('failed_subjects'),
                'remarks' => $request->input('remarks'),
            ]);

            // Replace marks
            ResultMark::where('exam_result_id', $result->id)->delete();
            foreach ($marksData as $mark) {
                ResultMark::create([
                    'exam_result_id' => $result->id,
                    'subject_name' => trim($mark['subject_name']),
                    'full_marks' => (float) ($mark['full_marks'] ?? 100),
                    'obtained_marks' => isset($mark['obtained_marks']) && $mark['obtained_marks'] !== '' ? (float) $mark['obtained_marks'] : null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Result updated successfully',
                'data' => $result->fresh(['marks', 'student']),
            ]);
        });
    }

    public function destroy(int $id): JsonResponse
    {
        $result = ExamResult::find($id);

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Result not found',
            ], 404);
        }

        $result->delete();

        return response()->json([
            'success' => true,
            'message' => 'Result deleted successfully',
        ]);
    }
}
