<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamProgression;
use App\Models\EvaluationForm;
use App\Models\EvaluationResult;
use App\Models\Station;
use App\Models\Exam;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    /**
     * Get the live dashboard data with all students, current station, and status flags.
     * Eager loads student profiles, user records, and active station state.
     */
    public function liveDashboard(Request $request)
    {
        $progressions = ExamProgression::with([
            'student.user', 
            'currentStation', 
            'exam',
            'results.station'
        ])
        ->orderBy('updated_at', 'desc')
        ->get();

        $stations = Station::with(['examiner', 'evaluationForm'])
            ->orderBy('step_number')
            ->orderBy('is_reserve')
            ->get();

        return response()->json([
            'progressions' => $progressions,
            'stations' => $stations
        ]);
    }

    /**
     * Get all exams, stations (with examiner info), and available examiners.
     */
    public function getStations(Request $request)
    {
        $stations = Station::with(['evaluationForm', 'examiner'])
            ->orderBy('step_number')
            ->orderBy('is_reserve')
            ->get();

        $exams = Exam::all();

        $examiners = User::where('role', 'admin_examiner')
            ->select('id', 'name', 'email', 'title', 'gender', 'age', 'specialty')
            ->orderBy('name')
            ->get();

        return response()->json([
            'stations' => $stations,
            'exams' => $exams,
            'examiners' => $examiners,
        ]);
    }

    /**
     * Create or update a station (now includes examiner_id).
     */
    public function saveStation(Request $request)
    {
        $request->validate([
            'id' => 'nullable|exists:stations,id',
            'exam_id' => 'required|exists:exams,id',
            'name' => 'required|string|max:255',
            'step_number' => 'required|integer|min:1|max:5',
            'is_reserve' => 'required|boolean',
            'type' => 'required|in:examiner_eval,student_tablet',
            'examiner_id' => 'nullable|exists:users,id',
        ]);

        $station = Station::updateOrCreate(
            ['id' => $request->id],
            [
                'exam_id' => $request->exam_id,
                'name' => $request->name,
                'step_number' => $request->step_number,
                'is_reserve' => $request->is_reserve,
                'type' => $request->type,
                'examiner_id' => $request->examiner_id,
            ]
        );

        return response()->json([
            'message' => 'Station enregistrée avec succès.',
            'station' => $station->load(['evaluationForm', 'examiner'])
        ]);
    }

    /**
     * Delete a station.
     */
    public function deleteStation($id)
    {
        $station = Station::findOrFail($id);
        $station->delete();

        return response()->json([
            'message' => 'Station supprimée avec succès.'
        ]);
    }

    /**
     * Create or update an evaluation form (or student QCM sheet) for a station.
     */
    public function createForm(Request $request)
    {
        $request->validate([
            'station_id' => 'required|exists:stations,id',
            'title' => 'required|string|max:255',
            'total_points' => 'required|numeric|min:1',
            'criteria' => 'required|array', // can hold checklist or MCQ questions
        ]);

        $form = EvaluationForm::updateOrCreate(
            ['station_id' => $request->station_id],
            [
                'title' => $request->title,
                'total_points' => $request->total_points,
                'criteria' => $request->criteria,
            ]
        );

        return response()->json([
            'message' => 'Contenu d\'évaluation enregistré avec succès.',
            'form' => $form
        ], 201);
    }

    /**
     * Create or update an examiner.
     */
    public function saveExaminer(Request $request)
    {
        $request->validate([
            'id' => 'nullable|exists:users,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $request->id,
            'password' => $request->id ? 'nullable|string|min:6' : 'required|string|min:6',
            'title' => 'nullable|string|max:255',
            'gender' => 'nullable|string|max:255',
            'age' => 'nullable|integer',
            'specialty' => 'nullable|string|max:255',
        ]);

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => 'admin_examiner',
            'title' => $request->title,
            'gender' => $request->gender,
            'age' => $request->age,
            'specialty' => $request->specialty,
        ];

        if ($request->password) {
            $data['password'] = Hash::make($request->password);
        }

        $examiner = User::updateOrCreate(
            ['id' => $request->id],
            $data
        );

        return response()->json([
            'message' => $request->id ? 'Examinateur mis à jour.' : 'Examinateur créé avec succès.',
            'examiner' => $examiner
        ]);
    }

    /**
     * Delete an examiner.
     */
    public function deleteExaminer($id)
    {
        $examiner = User::where('role', 'admin_examiner')->findOrFail($id);
        $examiner->delete();

        return response()->json([
            'message' => 'Examinateur supprimé avec succès.'
        ]);
    }

    /**
     * Get all exams with candidate count and average scores.
     */
    public function getExams()
    {
        $exams = Exam::withCount('progressions')
            ->orderBy('date', 'desc')
            ->get();

        foreach ($exams as $exam) {
            $progressionsIds = ExamProgression::where('exam_id', $exam->id)->pluck('id');
            $avg = EvaluationResult::whereIn('exam_progression_id', $progressionsIds)->avg('score');
            $exam->average_score = $avg ? round($avg, 2) : null;
        }

        return response()->json([
            'exams' => $exams
        ]);
    }

    /**
     * Create or update an exam. deactivates other active exams if status=active.
     */
    public function saveExam(Request $request)
    {
        $request->validate([
            'id' => 'nullable|exists:exams,id',
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'status' => 'required|in:draft,active,completed',
        ]);

        if ($request->status === 'active') {
            Exam::where('status', 'active')->update(['status' => 'completed']);
        }

        $exam = Exam::updateOrCreate(
            ['id' => $request->id],
            [
                'title' => $request->title,
                'date' => $request->date,
                'status' => $request->status,
            ]
        );

        return response()->json([
            'message' => $request->id ? 'Examen mis à jour.' : 'Examen créé avec succès.',
            'exam' => $exam
        ]);
    }

    /**
     * Get results/progressions for a specific exam.
     */
    public function getExamResults($id)
    {
        $exam = Exam::findOrFail($id);
        $progressions = ExamProgression::where('exam_id', $id)
            ->with(['student.user', 'results.station', 'results.examiner'])
            ->get();

        return response()->json([
            'exam' => $exam,
            'results' => $progressions
        ]);
    }

    /**
     * Export detailed exam results as CSV.
     */
    public function exportExamResults($id)
    {
        $exam = Exam::findOrFail($id);
        $progressions = ExamProgression::where('exam_id', $id)
            ->with(['student.user', 'results.station.evaluationForm'])
            ->get();

        $headers = [
            "Content-type" => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=eco_results_" . str_replace(' ', '_', strtolower($exam->title)) . ".csv",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = [
            'Matricule', 
            'Nom Etudiant', 
            'Statut Examen', 
            'Score Moyen', 
            'Résultats par Étape (Étape | Nom Station | Note | Statut | Critères détaillés | Remarques)'
        ];

        $callback = function() use ($progressions, $columns) {
            $file = fopen('php://output', 'w');
            
            // Add UTF-8 BOM for Excel compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($file, $columns, ';');

            foreach ($progressions as $prog) {
                $totalScore = 0;
                $passedCount = 0;
                $resultsDetails = [];

                foreach ($prog->results as $res) {
                    $totalScore += $res->score;
                    if ($res->passed) $passedCount++;
                    
                    $critString = "";
                    if ($res->details) {
                        $detailsArray = is_string($res->details) ? json_decode($res->details, true) : $res->details;
                        if (is_array($detailsArray)) {
                            $crits = [];
                            foreach ($detailsArray as $d) {
                                $crits[] = ($d['criterion'] ?? $d['text'] ?? '') . ": " . ($d['points_awarded'] ?? $d['score'] ?? 0) . "/" . ($d['points_max'] ?? $d['points'] ?? 0);
                            }
                            $critString = implode(" | ", $crits);
                        }
                    }
                    
                    $resultsDetails[] = sprintf(
                        "Étape %d: %s (Note: %s, %s, Critères: [%s], Remarque: %s)",
                        $res->station->step_number,
                        $res->station->name,
                        $res->score,
                        $res->passed ? 'Admis' : 'Ajourné',
                        $critString ?: 'N/A',
                        $res->remarks ?: 'Aucune'
                    );
                }

                $avgScore = count($prog->results) > 0 ? round($totalScore / count($prog->results), 2) : 0;

                fputcsv($file, [
                    $prog->student->matricule,
                    $prog->student->user->name,
                    $prog->status === 'completed' ? 'Terminé' : 'En cours',
                    $avgScore,
                    implode(" ; ", $resultsDetails)
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
