<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query();

        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('reg_no', 'like', $search)
                  ->orWhere('student_name', 'like', $search)
                  ->orWhere('phone', 'like', $search)
                  ->orWhere('father_name', 'like', $search);
            });
        }

        if ($request->filled('session_name')) {
            $query->where('session_name', $request->input('session_name'));
        }

        $perPage = (int) $request->input('per_page', 15);
        $students = $query->withCount('examResults')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50|unique:students,reg_no',
            'student_name' => 'required|string|max:255',
            'session_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
            'father_name' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student = Student::create([
            'reg_no' => trim($request->input('reg_no')),
            'student_name' => trim($request->input('student_name')),
            'session_name' => $request->input('session_name'),
            'phone' => $request->input('phone'),
            'father_name' => $request->input('father_name'),
            'mother_name' => $request->input('mother_name'),
            'address' => $request->input('address'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Student created successfully',
            'data' => $student,
        ], 201);
    }

    public function findByReg(string $regNo): JsonResponse
    {
        $student = Student::with(['examResults' => function ($query) {
            $query->orderBy('exam_year', 'asc')
                  ->orderBy('id', 'asc')
                  ->with('marks');
        }])->where('reg_no', trim($regNo))->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'No registered student found with Registration Number "' . $regNo . '"',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $student,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $student = Student::with(['examResults' => function ($query) {
            $query->orderBy('exam_year', 'asc')
                  ->orderBy('id', 'asc')
                  ->with('marks');
        }])->find($id);

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $student,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'reg_no' => 'required|string|max:50|unique:students,reg_no,' . $id,
            'student_name' => 'required|string|max:255',
            'session_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
            'father_name' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student->update([
            'reg_no' => trim($request->input('reg_no')),
            'student_name' => trim($request->input('student_name')),
            'session_name' => $request->input('session_name'),
            'phone' => $request->input('phone'),
            'father_name' => $request->input('father_name'),
            'mother_name' => $request->input('mother_name'),
            'address' => $request->input('address'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Student updated successfully',
            'data' => $student,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found',
            ], 404);
        }

        $student->delete();

        return response()->json([
            'success' => true,
            'message' => 'Student deleted successfully',
        ]);
    }
}
