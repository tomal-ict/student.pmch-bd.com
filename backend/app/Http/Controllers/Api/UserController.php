<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::select('id', 'username', 'display_name', 'role_name', 'permissions_json', 'is_active', 'created_at')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:100|unique:users,username',
            'display_name' => 'nullable|string|max:150',
            'role_name' => 'required|string|in:super_admin,admin,staff',
            'password' => 'required|string|min:6',
            'permissions' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'username' => trim($request->input('username')),
            'display_name' => trim($request->input('display_name') ?: $request->input('username')),
            'role_name' => $request->input('role_name'),
            'password_hash' => Hash::make($request->input('password')),
            'permissions_json' => $request->input('permissions', []),
            'is_active' => (bool) $request->input('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data' => $user,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::select('id', 'username', 'display_name', 'role_name', 'permissions_json', 'is_active', 'created_at')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:100|unique:users,username,' . $id,
            'display_name' => 'nullable|string|max:150',
            'role_name' => 'required|string|in:super_admin,admin,staff',
            'password' => 'nullable|string|min:6',
            'permissions' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = [
            'username' => trim($request->input('username')),
            'display_name' => trim($request->input('display_name') ?: $request->input('username')),
            'role_name' => $request->input('role_name'),
            'permissions_json' => $request->input('permissions', []),
            'is_active' => (bool) $request->input('is_active', true),
        ];

        if ($request->filled('password')) {
            $updateData['password_hash'] = Hash::make($request->input('password'));
        }

        $user->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $user->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($request->user()->id === $id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);
    }
}
