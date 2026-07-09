<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\StudentProfile;
use App\Models\Exam;
use App\Models\Station;
use App\Models\EvaluationForm;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Super Admin
        User::create([
            'name' => 'Admin UM6SS',
            'email' => 'admin@um6ss.ma',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);
    }
}
