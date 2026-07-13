<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_progressions', function (Blueprint $table) {
            $table->timestamp('timer_started_at')->nullable()->after('scanned_at');
        });
    }

    public function down(): void
    {
        Schema::table('exam_progressions', function (Blueprint $table) {
            $table->dropColumn('timer_started_at');
        });
    }
};
