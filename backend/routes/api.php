<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ExaminerController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Middleware\CheckRole;
use Illuminate\Support\Facades\Route;

// Public authentication route
Route::post('/auth/login', [AuthController::class, 'login']);

// Fallback named route for authentication redirects in Laravel
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Guarded routes
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth actions
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Stations lookup is accessible to administrators and examiners
    Route::get('/admin/stations', [AdminController::class, 'getStations'])
        ->middleware(CheckRole::class . ':super_admin,admin,admin_examiner');

    // Admin & Super Admin Group
    Route::middleware(CheckRole::class . ':super_admin,admin')->group(function () {
        Route::get('/admin/live-dashboard', [AdminController::class, 'liveDashboard']);
        Route::post('/admin/exams/{id}/terminate', [AdminController::class, 'terminateExam']);
        Route::get('/admin/settings', [AdminController::class, 'getSettings']);
        Route::post('/admin/settings', [AdminController::class, 'saveSetting']);
        Route::post('/admin/exams/{id}/delete', [AdminController::class, 'deleteExam']);
        
        // Stations management (restricted to admins)
        Route::post('/admin/stations', [AdminController::class, 'saveStation']);
        Route::delete('/admin/stations/{id}', [AdminController::class, 'deleteStation']);
        
        // Form & Criteria creation
        Route::post('/admin/forms', [AdminController::class, 'createForm']);

        // Examiners management
        Route::post('/admin/examiners', [AdminController::class, 'saveExaminer']);
        Route::delete('/admin/examiners/{id}', [AdminController::class, 'deleteExaminer']);

        // Students management
        Route::get('/admin/students', [AdminController::class, 'getStudents']);
        Route::post('/admin/students', [AdminController::class, 'saveStudent']);
        Route::delete('/admin/students/{id}', [AdminController::class, 'deleteStudent']);
        Route::post('/admin/students/import', [AdminController::class, 'importStudents']);

        // Exams management
        Route::get('/admin/exams', [AdminController::class, 'getExams']);
        Route::post('/admin/exams', [AdminController::class, 'saveExam']);
        Route::get('/admin/exams/{id}/results', [AdminController::class, 'getExamResults']);
        Route::get('/admin/exams/{id}/export', [AdminController::class, 'exportExamResults']);

        // Super Admin only routes (Administrators management)
        Route::middleware(CheckRole::class . ':super_admin')->group(function () {
            Route::get('/admin/administrators', [AdminController::class, 'getAdmins']);
            Route::post('/admin/administrators', [AdminController::class, 'saveAdmin']);
            Route::delete('/admin/administrators/{id}', [AdminController::class, 'deleteAdmin']);
        });
    });

    // Examiner Group
    Route::middleware(CheckRole::class . ':admin_examiner,super_admin')->group(function () {
        Route::post('/examiner/scan', [ExaminerController::class, 'scan']);
        Route::post('/examiner/start-timer', [ExaminerController::class, 'startTimer']);
    });
    Route::post('/examiner/submit', [ExaminerController::class, 'submit'])
        ->middleware(CheckRole::class . ':admin_examiner,super_admin,student');
    // Student Group
    Route::middleware(CheckRole::class . ':student')->group(function () {
        Route::get('/student/profile', [StudentController::class, 'profile']);
        Route::get('/student/check-scan', [StudentController::class, 'checkScan']);
    });
});
