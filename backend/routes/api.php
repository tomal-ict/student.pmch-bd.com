<?php

use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DataSyncController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentPortalController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Direct Media / Storage File Serving (Works on Windows, cPanel, aaPanel, VPS without relying on symlinks)
Route::get('/media/{path}', function (string $path) {
    $cleanPath = ltrim(str_replace(['..', '\\'], ['', '/'], $path), '/');
    $fullPath = storage_path('app/public/' . $cleanPath);
    if (!file_exists($fullPath) || !is_file($fullPath)) {
        return response()->json(['message' => 'File not found'], 404);
    }
    return response()->file($fullPath, [
        'Cache-Control' => 'public, max-age=86400',
        'Access-Control-Allow-Origin' => '*',
    ]);
})->where('path', '.*');

/*
|--------------------------------------------------------------------------
| Public Routes (Protected by Rate Limiter & Secure Encryption)
|--------------------------------------------------------------------------
*/
Route::middleware(['throttle:60,1'])->group(function () {
    Route::get('/settings/public', [PublicController::class, 'getSettings']);
    Route::post('/results/lookup', [PublicController::class, 'lookupResult']);
    Route::post('/results/request-otp', [PublicController::class, 'requestResultOtp']);
    Route::post('/results/verify-otp', [PublicController::class, 'verifyResultOtp']);
    Route::post('/students/phone-hint', [PublicController::class, 'getPhoneHint']);
    Route::post('/students/register/request-otp', [PublicController::class, 'requestRegisterOtp']);
    Route::post('/students/register', [PublicController::class, 'registerStudent']);
    Route::post('/admissions/request-otp', [PublicController::class, 'requestAdmissionOtp']);
    Route::post('/admissions/submit', [PublicController::class, 'submitAdmission']);

    // Student Portal Authentication via REVE SMS Gateway
    Route::post('/student-auth/request-otp', [StudentPortalController::class, 'requestOtp']);
    Route::post('/student-auth/verify-otp', [StudentPortalController::class, 'verifyOtp']);
});

// Auth Routes (Login throttled strictly to 10 requests / minute against brute-force attacks)
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| Protected Admin & Staff Routes (Sanctum Authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {
    // Student Self-Service Portal
    Route::prefix('student')->group(function () {
        Route::get('/profile', [StudentPortalController::class, 'getProfile']);
        Route::post('/results', [StudentPortalController::class, 'recordResult']);
        Route::post('/logout', [StudentPortalController::class, 'logout']);
    });

    // Current user profile & actions
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // Dashboard metrics
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);

    // Students Management
    Route::prefix('students')->group(function () {
        Route::get('/', [StudentController::class, 'index'])->middleware('permission:students.view');
        Route::post('/', [StudentController::class, 'store'])->middleware('permission:students.manage');
        Route::get('/by-reg/{regNo}', [StudentController::class, 'findByReg'])->middleware('permission:students.view');
        Route::get('/{id}', [StudentController::class, 'show'])->middleware('permission:students.view');
        Route::put('/{id}', [StudentController::class, 'update'])->middleware('permission:students.manage');
        Route::delete('/{id}', [StudentController::class, 'destroy'])->middleware('permission:students.manage');
    });

    // Results Management
    Route::prefix('results')->group(function () {
        Route::get('/', [ResultController::class, 'index'])->middleware('permission:results.view');
        Route::post('/', [ResultController::class, 'store'])->middleware('permission:results.manage');
        Route::get('/{id}', [ResultController::class, 'show'])->middleware('permission:results.view');
        Route::put('/{id}', [ResultController::class, 'update'])->middleware('permission:results.manage');
        Route::delete('/{id}', [ResultController::class, 'destroy'])->middleware('permission:results.manage');
    });

    // Admissions Management
    Route::prefix('admissions')->group(function () {
        Route::get('/', [AdmissionController::class, 'index'])->middleware('permission:admissions.view');
        Route::get('/photos/list', [AdmissionController::class, 'listPhotos'])->middleware('permission:admissions.view');
        Route::get('/photos/download-zip', [AdmissionController::class, 'downloadPhotosZip'])->middleware('permission:admissions.view');
        Route::get('/{id}/download-photo', [AdmissionController::class, 'downloadSinglePhoto'])->middleware('permission:admissions.view');
        Route::get('/{id}', [AdmissionController::class, 'show'])->middleware('permission:admissions.view');
        Route::put('/{id}', [AdmissionController::class, 'update'])->middleware('permission:admissions.manage');
        Route::post('/{id}/approve', [AdmissionController::class, 'approve'])->middleware('permission:admissions.manage');
        Route::post('/{id}/reject', [AdmissionController::class, 'reject'])->middleware('permission:admissions.manage');
        Route::delete('/{id}', [AdmissionController::class, 'destroy'])->middleware('permission:admissions.manage');
    });

    // Reports & Tabulation
    Route::prefix('reports')->middleware('permission:reports.view')->group(function () {
        Route::get('/summary', [ReportController::class, 'getSummary']);
        Route::get('/download-csv', [ReportController::class, 'downloadCsv']);
    });

    // User Management (Super Admin / Admin only)
    Route::prefix('users')->middleware('permission:users.manage')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
    });

    // Settings Management
    Route::prefix('settings')->middleware('permission:settings.manage')->group(function () {
        Route::get('/', [SettingController::class, 'index']);
        Route::post('/update', [SettingController::class, 'update']);
        Route::get('/curriculum', [SettingController::class, 'getCurriculum']);
        Route::post('/curriculum', [SettingController::class, 'saveCurriculum']);
        Route::post('/test-sms', [SettingController::class, 'testSms']);
        Route::post('/sessions', [SettingController::class, 'addSession']);
        Route::delete('/sessions/{id}', [SettingController::class, 'deleteSession']);
        Route::post('/activities', [SettingController::class, 'addActivity']);
        Route::delete('/activities/{id}', [SettingController::class, 'deleteActivity']);

        // Data Backup & Smart Database Synchronization
        Route::get('/data-sync/status', [DataSyncController::class, 'status']);
        Route::post('/data-sync/backup', [DataSyncController::class, 'backup']);
        Route::post('/data-sync/synchronize', [DataSyncController::class, 'synchronize']);
        Route::get('/data-sync/download/{filename}', [DataSyncController::class, 'downloadSql']);
    });
});
