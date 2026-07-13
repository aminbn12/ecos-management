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

    protected $progressionService;
    protected $examiner;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Seed database using the DatabaseSeeder
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        // 2. Create an examiner User
        $this->examiner = User::create([
            'name' => 'Dr. Examiner',
            'email' => 'examiner@um6ss.ma',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'role' => 'admin_examiner',
        ]);

        // 3. Create a student User and StudentProfile
        $studentUser = User::create([
            'name' => 'Amina Laroui',
            'email' => 'amina@um6ss.ma',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'role' => 'student',
        ]);
        StudentProfile::create([
            'user_id' => $studentUser->id,
            'matricule' => '200200',
            'level' => '5',
        ]);

        // 4. Create an Exam
        $exam = Exam::create([
            'title' => 'Examen Pratique Dentaire',
            'date' => now()->toDateString(),
            'status' => 'active',
        ]);

        // 5. Create Initial & Reserve Stations for Steps 1 to 5
        for ($i = 1; $i <= 5; $i++) {
            Station::create([
                'exam_id' => $exam->id,
                'name' => "Station {$i} Initial",
                'step_number' => $i,
                'is_reserve' => false,
                'type' => 'examiner_eval',
                'examiner_id' => $this->examiner->id,
            ]);

            Station::create([
                'exam_id' => $exam->id,
                'name' => "Station {$i} Reserve",
                'step_number' => $i,
                'is_reserve' => true,
                'type' => 'examiner_eval',
                'examiner_id' => $this->examiner->id,
            ]);
        }

        // 6. Resolve the ExamProgressionService
        $this->progressionService = app(ExamProgressionService::class);
    }

    /**
     * Test transition from Step N Initial on success.
     * Rule: Success Step N (Initial) -> Move to Step N+1 (Initial).
     */
    public function test_success_initial_moves_to_next_initial_station(): void
    {
        $student = StudentProfile::first();
        $station1 = Station::where('step_number', 1)->where('is_reserve', false)->first();
        $station2 = Station::where('step_number', 2)->where('is_reserve', false)->first();

        // Run the service processing a PASS
        $progression = $this->progressionService->processResult($student, $station1, true, 15.5, $this->examiner);

        // Assertions
        $this->assertEquals($station2->id, $progression->current_station_id);
        $this->assertFalse($progression->requires_jury_decision);
        $this->assertEquals('in_progress', $progression->status);

        // Assert evaluation result is created
        $this->assertDatabaseHas('evaluation_results', [
            'exam_progression_id' => $progression->id,
            'station_id' => $station1->id,
            'passed' => true,
            'score' => 15.5,
            'examiner_id' => $this->examiner->id,
        ]);
    }

    /**
     * Test transition from Step N Initial on failure.
     * Rule: Failure Step N (Initial) -> Move to Step N (Reserve).
     */
    public function test_failure_initial_moves_to_same_reserve_station(): void
    {
        $student = StudentProfile::first();
        $station1 = Station::where('step_number', 1)->where('is_reserve', false)->first();
        $station1Reserve = Station::where('step_number', 1)->where('is_reserve', true)->first();

        // Run the service processing a FAIL
        $progression = $this->progressionService->processResult($student, $station1, false, 8.0, $this->examiner);

        // Assertions
        $this->assertEquals($station1Reserve->id, $progression->current_station_id);
        $this->assertFalse($progression->requires_jury_decision);
        $this->assertEquals('in_progress', $progression->status);
    }

    /**
     * Test transition from Step N Reserve on success.
     * Rule: Success Step N (Reserve) -> Move to Step N+1 (Initial).
     */
    public function test_success_reserve_moves_to_next_initial_station(): void
    {
        $student = StudentProfile::first();
        $station1Reserve = Station::where('step_number', 1)->where('is_reserve', true)->first();
        $station2 = Station::where('step_number', 2)->where('is_reserve', false)->first();

        // Setup the student currently at Step 1 Reserve
        $exam = Exam::first();
        $progression = ExamProgression::create([
            'exam_id' => $exam->id,
            'student_id' => $student->id,
            'current_station_id' => $station1Reserve->id,
            'status' => 'in_progress',
            'requires_jury_decision' => false,
        ]);

        // Run the service processing a PASS
        $progression = $this->progressionService->processResult($student, $station1Reserve, true, 12.0, $this->examiner);

        // Assertions
        $this->assertEquals($station2->id, $progression->current_station_id);
        $this->assertFalse($progression->requires_jury_decision);
    }

    /**
     * Test transition from Step N Reserve on failure.
     * Rule: Failure Step N (Reserve) -> Move to Step N+1 (Initial) AND flag requires_jury_decision = true.
     */
    public function test_failure_reserve_moves_to_next_initial_and_flags_jury(): void
    {
        $student = StudentProfile::first();
        $station1Reserve = Station::where('step_number', 1)->where('is_reserve', true)->first();
        $station2 = Station::where('step_number', 2)->where('is_reserve', false)->first();

        // Setup the student currently at Step 1 Reserve
        $exam = Exam::first();
        $progression = ExamProgression::create([
            'exam_id' => $exam->id,
            'student_id' => $student->id,
            'current_station_id' => $station1Reserve->id,
            'status' => 'in_progress',
            'requires_jury_decision' => false,
        ]);

        // Run the service processing a FAIL
        $progression = $this->progressionService->processResult($student, $station1Reserve, false, 7.5, $this->examiner);

        // Assertions
        $this->assertEquals($station2->id, $progression->current_station_id);
        $this->assertTrue($progression->requires_jury_decision);
    }

    /**
     * Test completing the exam.
     * Rule: Completing step 5 initial or step 5 reserve marks status = completed.
     */
    public function test_passing_step_5_completes_exam(): void
    {
        $student = StudentProfile::first();
        $station5 = Station::where('step_number', 5)->where('is_reserve', false)->first();

        // Setup the student currently at Step 5 Initial
        $exam = Exam::first();
        $progression = ExamProgression::create([
            'exam_id' => $exam->id,
            'student_id' => $student->id,
            'current_station_id' => $station5->id,
            'status' => 'in_progress',
            'requires_jury_decision' => false,
        ]);

        // Resolve steps 1, 2, 3, 4 first
        for ($i = 1; $i <= 4; $i++) {
            $station = Station::where('step_number', $i)->where('is_reserve', false)->first();
            \App\Models\EvaluationResult::create([
                'exam_progression_id' => $progression->id,
                'station_id' => $station->id,
                'examiner_id' => $this->examiner->id,
                'score' => 15.0,
                'passed' => true,
                'duration' => 120,
            ]);
        }

        // Run the service processing a PASS
        $progression = $this->progressionService->processResult($student, $station5, true, 18.0, $this->examiner);

        // Assertions
        $this->assertNull($progression->current_station_id);
        $this->assertEquals('completed', $progression->status);
        $this->assertFalse($progression->requires_jury_decision);
    }

    /**
     * Test completing the exam on step 5 reserve failure.
     * Rule: Failing step 5 reserve marks status = completed AND flags jury decision.
     */
    public function test_failing_step_5_reserve_completes_exam_with_jury_decision(): void
    {
        $student = StudentProfile::first();
        $station5Reserve = Station::where('step_number', 5)->where('is_reserve', true)->first();

        // Setup the student currently at Step 5 Reserve
        $exam = Exam::first();
        $progression = ExamProgression::create([
            'exam_id' => $exam->id,
            'student_id' => $student->id,
            'current_station_id' => $station5Reserve->id,
            'status' => 'in_progress',
            'requires_jury_decision' => false,
        ]);

        // Resolve steps 1, 2, 3, 4 first
        for ($i = 1; $i <= 4; $i++) {
            $station = Station::where('step_number', $i)->where('is_reserve', false)->first();
            \App\Models\EvaluationResult::create([
                'exam_progression_id' => $progression->id,
                'station_id' => $station->id,
                'examiner_id' => $this->examiner->id,
                'score' => 15.0,
                'passed' => true,
                'duration' => 120,
            ]);
        }

        // Run the service processing a FAIL
        $progression = $this->progressionService->processResult($student, $station5Reserve, false, 9.0, $this->examiner);

        // Assertions
        $this->assertNull($progression->current_station_id);
        $this->assertEquals('completed', $progression->status);
        $this->assertTrue($progression->requires_jury_decision);
    }
}
