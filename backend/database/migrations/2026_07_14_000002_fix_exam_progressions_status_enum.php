<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE exam_progressions MODIFY COLUMN status ENUM('in_progress','paused','completed') DEFAULT 'in_progress'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE exam_progressions MODIFY COLUMN status ENUM('in_progress','completed') DEFAULT 'in_progress'");
    }
};
