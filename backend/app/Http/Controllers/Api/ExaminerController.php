<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\Station;
use App\Models\ExamProgression;
use App\Services\ExamProgressionService;
use Illuminate\Http\Request;
use Exception;

class ExaminerController extends Controller
{
    protected $progressionService;

    public function __construct(ExamProgressionService $progressionService)
    {
        $this->progressionService = $progressionService;
    }

    /**
     * Scan a student matricule at a specific station.
     * Validates if the student is expected at this station.
     * For student_tablet stations: marks scanned_at to trigger auto-launch on the tablet.
     * For examiner_eval stations: returns the evaluation form grid.
     */
    public function scan(Request $request)
    {
        $request->validate([
            'matricule' => 'required|string',
            'station_id' => 'required|exists:stations,id',
        ]);

        $student = StudentProfile::with('user')->where('matricule', $request->matricule)->first();

        if (!$student) {
            return response()->json([
                'error' => 'StudentNotFound',
                'message' => "Aucun étudiant trouvé avec le matricule: {$request->matricule}."
            ], 404);
        }

        $station = Station::with(['exam', 'evaluationForm'])->find($request->station_id);

        if ($station && $station->exam && $station->exam->status === 'completed') {
            return response()->json([
                'error' => 'ExamCompleted',
                'message' => "Cet examen est archivé. Aucune nouvelle évaluation ne peut être effectuée."
            ], 400);
        }

        // Fetch or create progression for this student
        $progression = ExamProgression::where('student_id', $student->id)
            ->where('exam_id', $station->exam_id)
            ->first();

        // If no progression exists, and the station is Step 1 Initial, we can start it
        if (!$progression) {
            if ($station->step_number === 1 && !$station->is_reserve) {
                $progression = ExamProgression::create([
                    'exam_id' => $station->exam_id,
                    'student_id' => $student->id,
                    'current_station_id' => $station->id,
                    'status' => 'in_progress',
                    'requires_jury_decision' => false,
                ]);
            } else {
                return response()->json([
                    'error' => 'NotExpectedHere',
                    'message' => "L'étudiant n'a pas commencé son examen. Il doit s'enregistrer à l'Étape 1 (Initiale)."
                ], 400);
            }
        }

        // Check if student has finished
        if ($progression->status === 'completed') {
            return response()->json([
                'error' => 'ExamCompleted',
                'message' => "Cet étudiant a déjà validé ou terminé toutes les étapes de cet examen."
            ], 400);
        }

        // Validate if student is expected at the scanned station
        if ($progression->current_station_id !== $station->id) {
            $expectedStation = Station::find($progression->current_station_id);
            $stationName = $expectedStation ? $expectedStation->name : "Inconnue";
            $stepNum = $expectedStation ? $expectedStation->step_number : "?";
            $reserveLabel = $expectedStation && $expectedStation->is_reserve ? " (Réserve)" : " (Initiale)";

            return response()->json([
                'error' => 'NotExpectedHere',
                'message' => "L'étudiant n'est pas attendu à cette station. Étape attendue : Étape {$stepNum}{$reserveLabel} - {$stationName}."
            ], 400);
        }

        // === STUDENT TABLET STATION: Mark as scanned for auto-launch ===
        if ($station->type === 'student_tablet') {
            return response()->json([
                'type' => 'student_tablet',
                'message' => "L'étudiant a été scanné. En attente du démarrage de l'épreuve par l'examinateur.",
                'student' => [
                    'id' => $student->id,
                    'name' => $student->user->name,
                    'matricule' => $student->matricule,
                ],
                'station' => [
                    'id' => $station->id,
                    'name' => $station->name,
                    'step_number' => $station->step_number,
                    'is_reserve' => $station->is_reserve,
                    'type' => $station->type,
                ],
            ]);
        }

        // === EXAMINER EVAL STATION: Return evaluation form ===
        return response()->json([
            'type' => 'examiner_eval',
            'student' => [
                'id' => $student->id,
                'name' => $student->user->name,
                'matricule' => $student->matricule,
            ],
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'step_number' => $station->step_number,
                'is_reserve' => $station->is_reserve,
                'type' => $station->type,
            ],
            'evaluation_form' => $station->evaluationForm,
            'progression' => $progression
        ]);
    }

    /**
     * Start the countdown timer for a scanned student (sets scanned_at = now()).
     */
    public function startTimer(Request $request)
    {
        $request->validate([
            'matricule' => 'required|string',
            'station_id' => 'required|exists:stations,id',
        ]);

        $student = StudentProfile::where('matricule', $request->matricule)->first();
        if (!$student) {
            return response()->json(['message' => 'Étudiant introuvable.'], 404);
        }

        $station = Station::find($request->station_id);

        $progression = ExamProgression::where('student_id', $student->id)
            ->where('exam_id', $station->exam_id)
            ->first();

        if (!$progression) {
            return response()->json(['message' => 'Progression introuvable. Veuillez d\'abord scanner l\'étudiant.'], 400);
        }

        $progression->scanned_at = now();
        $progression->save();

        return response()->json([
            'message' => 'Chronomètre démarré.',
            'scanned_at' => $progression->scanned_at,
        ]);
    }

    /**
     * Submit examiner evaluation for a student.
     * Triggers progression transitions.
     */
    public function submit(Request $request)
    {
        $request->validate([
            'matricule' => 'required|string',
            'station_id' => 'required|exists:stations,id',
            'score' => 'required|numeric|min:0',
            'passed' => 'required|boolean',
            'remarks' => 'nullable|string',
            'details' => 'nullable|array',
            'duration' => 'nullable|integer',
        ]);

        $student = StudentProfile::where('matricule', $request->matricule)->first();
        if (!$student) {
            return response()->json(['message' => 'Étudiant introuvable.'], 404);
        }

        $station = Station::find($request->station_id);

        try {
            $progression = $this->progressionService->processResult(
                $student,
                $station,
                $request->passed,
                $request->score,
                auth()->user(),
                $request->remarks,
                $request->details,
                $request->duration
            );

            // Clear scanned_at after processing (for tablet stations)
            $progression->scanned_at = null;
            $progression->save();

            // Load relations to return full update
            $progression->load(['currentStation']);

            return response()->json([
                'message' => 'Évaluation enregistrée avec succès.',
                'status' => $progression->status,
                'requires_jury_decision' => $progression->requires_jury_decision,
                'next_station' => $progression->currentStation ? [
                    'id' => $progression->currentStation->id,
                    'name' => $progression->currentStation->name,
                    'step_number' => $progression->currentStation->step_number,
                    'is_reserve' => $progression->currentStation->is_reserve,
                ] : null,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Erreur lors du traitement : ' . $e->getMessage()
            ], 422);
        }
    }
}
