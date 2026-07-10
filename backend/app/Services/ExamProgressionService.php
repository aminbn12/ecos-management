<?php

namespace App\Services;

use App\Models\StudentProfile;
use App\Models\Station;
use App\Models\ExamProgression;
use App\Models\EvaluationResult;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;

class ExamProgressionService
{
    /**
     * Process an evaluation result for a student and transition them to the next step.
     *
     * Algorithm (5+5):
     * - Success Step N (Initial) -> Move to Step N+1 (Initial).
     * - Failure Step N (Initial) -> Move to Step N (Reserve).
     * - Success Step N (Reserve) -> Move to Step N+1 (Initial).
     * - Failure Step N (Reserve) -> Move to Step N+1 (Initial) AND mark requires_jury_decision = true.
     *
     * @param StudentProfile $student
     * @param Station $station
     * @param bool $passed
     * @param float $score
     * @param User|null $examiner
     * @param string|null $remarks
     * @return ExamProgression
     * @throws Exception
     */
    public function processResult(
        StudentProfile $student,
        Station $station,
        bool $passed,
        float $score = 0.0,
        ?User $examiner = null,
        ?string $remarks = null,
        ?array $details = null,
        ?int $duration = 0
    ): ExamProgression {
        return DB::transaction(function () use ($student, $station, $passed, $score, $examiner, $remarks, $details, $duration) {
            // 1. Retrieve the student's active progression for this exam
            $progression = ExamProgression::where('student_id', $student->id)
                ->where('exam_id', $station->exam_id)
                ->first();

            if (!$progression) {
                // If progression doesn't exist, initialize it
                $progression = ExamProgression::create([
                    'exam_id' => $station->exam_id,
                    'student_id' => $student->id,
                    'current_station_id' => $station->id,
                    'status' => 'in_progress',
                    'requires_jury_decision' => false,
                ]);
            }

            // Verify that the student is indeed at this station (or was, in case of re-submission)
            if ($progression->current_station_id !== $station->id && $progression->status === 'completed') {
                throw new Exception("This student has already completed their progression or is at another station.");
            }

            // 2. Create the Evaluation Result
            EvaluationResult::create([
                'exam_progression_id' => $progression->id,
                'station_id' => $station->id,
                'examiner_id' => $examiner ? $examiner->id : auth()->id(),
                'score' => $score,
                'passed' => $passed,
                'remarks' => $remarks,
                'details' => $details,
                'duration' => $duration ?: 0,
            ]);

            // 3. Compute next step state
            $currentStep = $station->step_number;
            $isReserve = $station->is_reserve;

            $nextStep = $currentStep;
            $nextIsReserve = false;

            if ($passed) {
                // Success: Move to step N + 1 (Initial)
                $nextStep = ($currentStep == 5) ? 1 : $currentStep + 1;
                $nextIsReserve = false;
            } else {
                // Failure:
                if (!$isReserve) {
                    // Initial failed -> Go to reserve at same step N
                    $nextStep = $currentStep;
                    $nextIsReserve = true;
                } else {
                    // Reserve failed -> Go to step N + 1 (Initial) AND flag for jury review
                    $nextStep = ($currentStep == 5) ? 1 : $currentStep + 1;
                    $nextIsReserve = false;
                    $progression->requires_jury_decision = true;
                }
            }

            // 4. Update the progression state
            // A step N is resolved if the candidate either passes the initial station,
            // or attempts the reserve station (whether pass or fail).
            $results = $progression->results()->with('station')->get();
            $resolvedSteps = 0;
            for ($i = 1; $i <= 5; $i++) {
                $stepResults = $results->filter(function($r) use ($i) {
                    return $r->station && $r->station->step_number === $i;
                });
                if ($stepResults->isEmpty()) {
                    continue;
                }
                $hasPass = $stepResults->contains('passed', true);
                $hasReserve = $stepResults->contains('station.is_reserve', true);
                if ($hasPass || $hasReserve) {
                    $resolvedSteps++;
                }
            }

            if ($resolvedSteps >= 5) {
                // The candidate completed all 5 steps (in any order)
                $progression->status = 'completed';
                $progression->current_station_id = null;
            } else {
                // Find the next station matching the transition logic
                $nextStation = Station::where('exam_id', $station->exam_id)
                    ->where('step_number', $nextStep)
                    ->where('is_reserve', $nextIsReserve)
                    ->first();

                if ($nextStation) {
                    $progression->current_station_id = $nextStation->id;
                } else {
                    // If the next station is not found in database, auto-complete to prevent deadlocks
                    $progression->status = 'completed';
                    $progression->current_station_id = null;
                }
            }

            $progression->save();

            return $progression;
        });
    }
}
