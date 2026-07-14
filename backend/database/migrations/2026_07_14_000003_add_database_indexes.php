<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Index on exams.status — used by every polling request to find the active exam
        Schema::table('exams', function (Blueprint $table) {
            $table->index('status');
        });

        // Index on users.role — used to list students, examiners, admins
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });

        // Composite index on exam_progressions — the most queried table
        Schema::table('exam_progressions', function (Blueprint $table) {
            // Used by: ExamProgressionService, ExaminerController, StudentController
            $table->index(['student_id', 'exam_id'], 'idx_progression_student_exam');
            // Used by: StudentController occupation check
            $table->index('current_station_id', 'idx_progression_current_station');
            // Used by: filtering progressions by status
            $table->index('status', 'idx_progression_status');
        });

        // Index on evaluation_results.exam_progression_id — for hasMany lookups
        Schema::table('evaluation_results', function (Blueprint $table) {
            $table->index('exam_progression_id', 'idx_results_progression');
        });

        // Composite index on stations — used by progression transitions
        Schema::table('stations', function (Blueprint $table) {
            $table->index(['exam_id', 'step_number', 'is_reserve'], 'idx_station_exam_step_reserve');
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        Schema::table('exam_progressions', function (Blueprint $table) {
            $table->dropIndex('idx_progression_student_exam');
            $table->dropIndex('idx_progression_current_station');
            $table->dropIndex('idx_progression_status');
        });

        Schema::table('evaluation_results', function (Blueprint $table) {
            $table->dropIndex('idx_results_progression');
        });

        Schema::table('stations', function (Blueprint $table) {
            $table->dropIndex('idx_station_exam_step_reserve');
        });
    }
};
