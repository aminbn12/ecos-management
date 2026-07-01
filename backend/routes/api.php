<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ExaminerController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Middleware\CheckRole;
use Illuminate\Support\Facades\Route;

// Public authentication route
Route::post('/auth/login', [AuthController::class, 'login']);

// Guarded routes
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth actions
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Admin Group
    Route::middleware(CheckRole::class . ':super_admin')->group(function () {
        Route::get('/admin/live-dashboard', [AdminController::class, 'liveDashboard']);
        
        // Stations management
        Route::get('/admin/stations', [AdminController::class, 'getStations']);
        Route::post('/admin/stations', [AdminController::class, 'saveStation']);
        Route::delete('/admin/stations/{id}', [AdminController::class, 'deleteStation']);
        
        // Form & Criteria creation
        Route::post('/admin/forms', [AdminController::class, 'createForm']);

        // Examiners management
        Route::post('/admin/examiners', [AdminController::class, 'saveExaminer']);
        Route::delete('/admin/examiners/{id}', [AdminController::class, 'deleteExaminer']);

        // Exams management
        Route::get('/admin/exams', [AdminController::class, 'getExams']);
        Route::post('/admin/exams', [AdminController::class, 'saveExam']);
        Route::get('/admin/exams/{id}/results', [AdminController::class, 'getExamResults']);
        Route::get('/admin/exams/{id}/export', [AdminController::class, 'exportExamResults']);
    });

    // Examiner Group
    Route::middleware(CheckRole::class . ':admin_examiner,super_admin')->group(function () {
        Route::post('/examiner/scan', [ExaminerController::class, 'scan']);
    });
    Route::post('/examiner/submit', [ExaminerController::class, 'submit'])
        ->middleware(CheckRole::class . ':admin_examiner,super_admin,student');

    // Student Group
    Route::middleware(CheckRole::class . ':student')->group(function () {
        Route::get('/student/profile', [StudentController::class, 'profile']);
        Route::get('/student/check-scan', [StudentController::class, 'checkScan']);
    });
});
