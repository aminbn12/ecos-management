<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evaluation_results', function (Blueprint $table) {
            // Drop existing foreign key constraint
            $table->dropForeign(['examiner_id']);

            // Make examiner_id nullable and re-add FK with SET NULL behavior
            $table->unsignedBigInteger('examiner_id')->nullable()->change();
            $table->foreign('examiner_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('evaluation_results', function (Blueprint $table) {
            $table->dropForeign(['examiner_id']);

            $table->unsignedBigInteger('examiner_id')->nullable(false)->change();
            $table->foreign('examiner_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });
    }
};
