<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\StudentProfile;
use App\Models\Exam;
use App\Models\Station;
use App\Models\ExamProgression;
use App\Services\ExamProgressionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamProgressionTest extends TestCase
{
    use RefreshDatabase;

    protected $service;
    protected $student;
    protected $examiner;
    protected $exam;
    protected $stations = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ExamProgressionService();

        // Create Examiner
        $this->examiner = User::factory()->create([
            'role' => 'admin_examiner',
        ]);

        // Create Student
        $studentUser = User::factory()->create([
            'role' => 'student',
        ]);
        $this->student = StudentProfile::create([
            'user_id' => $studentUser->id,
            'matricule' => 'STUD12345',
        ]);

        // Create Exam
        $this->exam = Exam::create([
            'title' => 'ECOS Medicine Dentaire June 2026',
            'date' => '2026-06-30',
            'status' => 'active',
        ]);

        // Create all 10 stations (5 Initial + 5 Reserve)
        for ($i = 1; $i <= 5; $i++) {
            // Initial
            $this->stations["initial_{$i}"] = Station::create([
                'exam_id' => $this->exam->id,
                'name' => "Station {$i} Initial",
                'step_number' => $i,
                'is_reserve' => false,
                'type' => 'examiner_eval',
            ]);

            // Reserve
            $this->stations["reserve_{$i}"] = Station::create([
                'exam_id' => $this->exam->id,
                'name' => "Station {$i} Reserve",
                'step_number' => $i,
                'is_reserve' => true,
                'type' => 'examiner_eval',
            ]);
        }
    }

    /** @test */
    public function initial_success_transitions_to_next_initial_station()
    {
        // Student is at Step 1 Initial, passes
        $progression = $this->service->processResult(
            $this->student,
            $this->stations['initial_1'],
            true, // passed
            16.5,
            $this->examiner
        );

        $this->assertEquals($this->stations['initial_2']->id, $progression->current_station_id);
        $this->assertEquals('in_progress', $progression->status);
        $this->assertFalse($progression->requires_jury_decision);
    }

    /** @test */
    public function initial_failure_transitions_to_same_reserve_station()
    {
        // Student is at Step 1 Initial, fails
        $progression = $this->service->processResult(
            $this->student,
            $this->stations['initial_1'],
            false, // failed
            8.0,
            $this->examiner
        );

        // Should transition to Step 1 Reserve
        $this->assertEquals($this->stations['reserve_1']->id, $progression->current_station_id);
        $this->assertEquals('in_progress', $progression->status);
        $this->assertFalse($progression->requires_jury_decision);
    }

    /** @test */
    public function reserve_success_transitions_to_next_initial_station()
    {
        // Mock progression to start at Step 2 Reserve
        $progression = ExamProgression::create([
            'exam_id' => $this->exam->id,
            'student_id' => $this->student->id,
            'current_station_id' => $this->stations['reserve_2']->id,
            'status' => 'in_progress',
        ]);

        // Student passes Step 2 Reserve
        $updatedProgression = $this->service->processResult(
            $this->student,
            $this->stations['reserve_2'],
            true, // passed
            12.0,
            $this->examiner
        );

        // Should transition to Step 3 Initial
        $this->assertEquals($this->stations['initial_3']->id, $updatedProgression->current_station_id);
        $this->assertEquals('in_progress', $updatedProgression->status);
        $this->assertFalse($updatedProgression->requires_jury_decision);
    }

    /** @test */
    public function reserve_failure_transitions_to_next_initial_station_and_triggers_jury_flag()
    {
        // Mock progression to start at Step 2 Reserve
        $progression = ExamProgression::create([
            'exam_id' => $this->exam->id,
            'student_id' => $this->student->id,
            'current_station_id' => $this->stations['reserve_2']->id,
            'status' => 'in_progress',
        ]);

        // Student fails Step 2 Reserve
        $updatedProgression = $this->service->processResult(
            $this->student,
            $this->stations['reserve_2'],
            false, // failed
            6.5,
            $this->examiner
        );

        // Should transition to Step 3 Initial AND flag requires jury decision
        $this->assertEquals($this->stations['initial_3']->id, $updatedProgression->current_station_id);
        $this->assertEquals('in_progress', $updatedProgression->status);
        $this->assertTrue($updatedProgression->requires_jury_decision);
    }

    /** @test */
    public function final_station_success_completes_exam()
    {
        // Mock progression to start at Step 5 Initial
        $progression = ExamProgression::create([
            'exam_id' => $this->exam->id,
            'student_id' => $this->student->id,
            'current_station_id' => $this->stations['initial_5']->id,
            'status' => 'in_progress',
        ]);

        // Student passes final step
        $updatedProgression = $this->service->processResult(
            $this->student,
            $this->stations['initial_5'],
            true, // passed
            18.0,
            $this->examiner
        );

        // Status should be completed
        $this->assertNull($updatedProgression->current_station_id);
        $this->assertEquals('completed', $updatedProgression->status);
    }
}
