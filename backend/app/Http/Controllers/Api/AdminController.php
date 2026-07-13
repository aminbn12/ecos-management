<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamProgression;
use App\Models\EvaluationForm;
use App\Models\EvaluationResult;
use App\Models\Station;
use App\Models\StudentProfile;
use App\Models\Exam;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Get the live dashboard data with all students, current station, and status flags.
     * Eager loads student profiles, user records, and active station state.
     */
    public function liveDashboard(Request $request)
    {
        // 1. Get the exam (either specified by ID or the active one)
        $examId = $request->query('exam_id');
        if ($examId) {
            $exam = Exam::find($examId);
        } else {
            $exam = Exam::where('status', 'active')->first();
        }

        if (!$exam) {
            return response()->json([
                'active_exam' => null,
                'progressions' => [],
                'stations' => []
            ]);
        }

        $progressions = ExamProgression::where('exam_id', $exam->id)
            ->with([
                'student.user', 
                'currentStation', 
                'exam',
                'results.station'
            ])
            ->orderBy('updated_at', 'desc')
            ->get();

        $stations = Station::where('exam_id', $exam->id)
            ->with(['examiner', 'evaluationForm'])
            ->orderBy('step_number')
            ->orderBy('is_reserve')
            ->get();

        return response()->json([
            'active_exam' => $exam,
            'progressions' => $progressions,
            'stations' => $stations
        ]);
    }

    /**
     * Terminate and archive an exam with a password-protected endpoint.
     */
    public function terminateExam(Request $request, $id)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $correctCode = env('ADMIN_EXAM_TERMINATION_CODE', '2026');

        if ($request->code !== $correctCode) {
            return response()->json([
                'message' => 'Code de clôture incorrect. Action refusée.'
            ], 403);
        }

        $exam = Exam::find($id);
        if (!$exam) {
            return response()->json([
                'message' => 'Examen introuvable.'
            ], 404);
        }

        $exam->status = 'completed';
        $exam->save();

        return response()->json([
            'message' => 'L\'examen a été clôturé et archivé avec succès.',
            'exam' => $exam
        ]);
    }

    /**
     * Get all settings.
     */
    public function getSettings(Request $request)
    {
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        // Ensure show_student_average exists
        if (!isset($settings['show_student_average'])) {
            Setting::create(['key' => 'show_student_average', 'value' => '0']);
            $settings['show_student_average'] = '0';
        }

        // Ensure allow_exam_deletion exists
        if (!isset($settings['allow_exam_deletion'])) {
            Setting::create(['key' => 'allow_exam_deletion', 'value' => '0']);
            $settings['allow_exam_deletion'] = '0';
        }

        return response()->json([
            'settings' => $settings
        ]);
    }

    /**
     * Save/update a setting value.
     */
    public function saveSetting(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
            'value' => 'nullable|string',
        ]);

        $setting = Setting::updateOrCreate(
            ['key' => $request->key],
            ['value' => $request->value ?? '']
        );

        return response()->json([
            'message' => 'Paramètre enregistré.',
            'setting' => $setting
        ]);
    }

    /**
     * Delete an exam with passcode and parameters validation.
     */
    public function deleteExam(Request $request, $id)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $allowDeletion = Setting::getValue('allow_exam_deletion', '0') === '1';

        if (!$allowDeletion) {
            return response()->json([
                'message' => 'La suppression des examens est actuellement désactivée dans les paramètres généraux.'
            ], 403);
        }

        $correctCode = env('ADMIN_EXAM_TERMINATION_CODE', '2026');

        if ($request->code !== $correctCode) {
            return response()->json([
                'message' => 'Code secret incorrect. Suppression refusée.'
            ], 403);
        }

        $exam = Exam::find($id);
        if (!$exam) {
            return response()->json([
                'message' => 'Examen introuvable.'
            ], 404);
        }

        // Database will cascade delete all stations, progressions, evaluation results
        $exam->delete();

        return response()->json([
            'message' => 'L\'examen et toutes ses données associées ont été supprimés définitivement.'
        ]);
    }

    /**
     * Duplicate an exam including stations and evaluation forms.
     */
    public function duplicateExam(Request $request, $id)
    {
        $originalExam = Exam::with('stations.evaluationForm')->find($id);
        if (!$originalExam) {
            return response()->json([
                'message' => 'Examen introuvable.'
            ], 404);
        }

        try {
            return DB::transaction(function () use ($originalExam) {
                // 1. Duplicate Exam
                $duplicatedExam = Exam::create([
                    'title' => $originalExam->title . ' (Copie)',
                    'date' => now()->toDateString(),
                    'status' => 'draft', // Duplicate is draft (En attente) by default
                ]);

                // 2. Duplicate Stations
                foreach ($originalExam->stations as $originalStation) {
                    $duplicatedStation = Station::create([
                        'exam_id' => $duplicatedExam->id,
                        'name' => $originalStation->name,
                        'step_number' => $originalStation->step_number,
                        'is_reserve' => $originalStation->is_reserve,
                        'type' => $originalStation->type,
                        'examiner_id' => $originalStation->examiner_id,
                    ]);

                    // 3. Duplicate Evaluation Form if exists
                    if ($originalStation->evaluationForm) {
                        EvaluationForm::create([
                            'station_id' => $duplicatedStation->id,
                            'title' => $originalStation->evaluationForm->title,
                            'total_points' => $originalStation->evaluationForm->total_points,
                            'criteria' => $originalStation->evaluationForm->criteria,
                        ]);
                    }
                }

                return response()->json([
                    'message' => 'Examen dupliqué avec succès.',
                    'exam' => $duplicatedExam
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la duplication : ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Pause a student progression (medical emergency / malaise) and clear scan to free the room.
     */
    public function pauseProgression(Request $request, $id)
    {
        $progression = ExamProgression::find($id);
        if (!$progression) {
            return response()->json(['message' => 'Progression introuvable.'], 404);
        }

        $progression->status = 'paused';
        $progression->scanned_at = null; // Free up the station scanner kiosk!
        $progression->save();

        return response()->json([
            'message' => 'Examen mis en pause temporaire pour ce candidat. La salle est libérée.',
            'progression' => $progression
        ]);
    }

    /**
     * Resume a paused student progression.
     */
    public function resumeProgression(Request $request, $id)
    {
        $progression = ExamProgression::find($id);
        if (!$progression) {
            return response()->json(['message' => 'Progression introuvable.'], 404);
        }

        if ($progression->status !== 'paused') {
            return response()->json(['message' => 'Cette progression n\'est pas en pause.'], 400);
        }

        $progression->status = 'in_progress';
        $progression->save();

        return response()->json([
            'message' => 'Examen repris pour ce candidat. Il peut se diriger à nouveau vers sa station.',
            'progression' => $progression
        ]);
    }

    /**
     * Abandon a student progression permanently (completed status).
     */
    public function abandonProgression(Request $request, $id)
    {
        $progression = ExamProgression::find($id);
        if (!$progression) {
            return response()->json(['message' => 'Progression introuvable.'], 404);
        }

        $progression->status = 'completed';
        $progression->current_station_id = null;
        $progression->scanned_at = null;
        $progression->save();

        return response()->json([
            'message' => 'Examen clos pour ce candidat (Abandon enregistré).',
            'progression' => $progression
        ]);
    }

    /**
     * Get all exams, stations (with examiner info), and available examiners.
     */
    public function getStations(Request $request)
    {
        $examId = $request->query('exam_id');

        $stationsQuery = Station::with(['evaluationForm', 'examiner']);
        if ($examId) {
            $stationsQuery->where('exam_id', $examId);
        } else {
            // Default to the active exam if one exists
            $activeExam = Exam::where('status', 'active')->first();
            if ($activeExam) {
                $stationsQuery->where('exam_id', $activeExam->id);
            } else {
                // If no active exam exists, default to the most recent exam to match frontend default
                $latestExam = Exam::orderBy('date', 'desc')->first();
                if ($latestExam) {
                    $stationsQuery->where('exam_id', $latestExam->id);
                } else {
                    $stationsQuery->where('id', 0); // Return empty results
                }
            }
        }

        $stations = $stationsQuery->orderBy('step_number')
            ->orderBy('is_reserve')
            ->get();

        $exams = Exam::orderBy('date', 'desc')->get();

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
     * Ensures uniqueness of step_number + is_reserve per exam.
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

        // Check uniqueness: one station per step_number + is_reserve per exam
        $duplicate = Station::where('exam_id', $request->exam_id)
            ->where('step_number', $request->step_number)
            ->where('is_reserve', $request->is_reserve);

        // Exclude current station if editing
        if ($request->id) {
            $duplicate->where('id', '!=', $request->id);
        }

        if ($duplicate->exists()) {
            $label = $request->is_reserve ? 'Réserve' : 'Initiale';
            return response()->json([
                'message' => "Une station existe déjà pour l'Étape {$request->step_number} ({$label}). Veuillez modifier la station existante ou choisir une autre étape."
            ], 422);
        }

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
     * Get all students with their profiles.
     */
    public function getStudents()
    {
        $students = User::where('role', 'student')
            ->with('studentProfile')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'gender' => $user->gender,
                    'matricule' => $user->studentProfile->matricule ?? null,
                    'level' => $user->studentProfile->level ?? null,
                    'profile_id' => $user->studentProfile->id ?? null,
                ];
            });

        return response()->json([
            'students' => $students
        ]);
    }

    /**
     * Create or update a student (User + StudentProfile).
     */
    public function saveStudent(Request $request)
    {
        $request->validate([
            'id' => 'nullable|exists:users,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $request->id,
            'matricule' => 'required|string|regex:/^[a-zA-Z0-9]+$/|max:50',
            'gender' => 'nullable|string|in:m,f',
            'level' => 'nullable|string|in:1,2,3,4,5,6,résident',
            'password' => $request->id ? 'nullable|string|min:6' : 'nullable|string|min:6',
        ]);

        // Check matricule uniqueness
        $matriculeQuery = StudentProfile::where('matricule', strtoupper($request->matricule));
        if ($request->id) {
            $existingProfile = StudentProfile::where('user_id', $request->id)->first();
            if ($existingProfile) {
                $matriculeQuery->where('id', '!=', $existingProfile->id);
            }
        }
        if ($matriculeQuery->exists()) {
            return response()->json([
                'message' => 'Ce matricule est déjà utilisé par un autre étudiant.'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $userData = [
                'name' => $request->name,
                'email' => $request->email,
                'role' => 'student',
                'gender' => $request->gender,
            ];

            $password = $request->password ?: $request->matricule;
            if (!$request->id) {
                $userData['password'] = Hash::make($password);
            } elseif ($request->password) {
                $userData['password'] = Hash::make($request->password);
            }

            $user = User::updateOrCreate(
                ['id' => $request->id],
                $userData
            );

            StudentProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'matricule' => strtoupper($request->matricule),
                    'level' => $request->level,
                ]
            );

            DB::commit();

            return response()->json([
                'message' => $request->id ? 'Étudiant mis à jour.' : 'Étudiant créé avec succès.',
                'student' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'gender' => $user->gender,
                    'matricule' => strtoupper($request->matricule),
                    'level' => $request->level,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erreur lors de l\'enregistrement : ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a student (User + StudentProfile cascade).
     */
    public function deleteStudent($id)
    {
        $user = User::where('role', 'student')->findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'Étudiant supprimé avec succès.'
        ]);
    }

    /**
     * Bulk import students from CSV data.
     */
    public function importStudents(Request $request)
    {
        $request->validate([
            'students' => 'required|array|min:1',
            'students.*.name' => 'required|string|max:255',
            'students.*.email' => 'required|email',
            'students.*.matricule' => 'required|string|max:50',
            'students.*.gender' => 'nullable|string|in:m,f',
            'students.*.level' => 'nullable|string|in:1,2,3,4,5,6,résident',
        ]);

        $created = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($request->students as $index => $studentData) {
                $matricule = strtoupper(trim($studentData['matricule']));
                $email = trim($studentData['email']);

                // Skip if matricule or email already exists
                if (StudentProfile::where('matricule', $matricule)->exists()) {
                    $skipped++;
                    $errors[] = "Ligne " . ($index + 1) . ": Matricule {$matricule} déjà existant.";
                    continue;
                }
                if (User::where('email', $email)->exists()) {
                    $skipped++;
                    $errors[] = "Ligne " . ($index + 1) . ": Email {$email} déjà utilisé.";
                    continue;
                }

                $user = User::create([
                    'name' => trim($studentData['name']),
                    'email' => $email,
                    'password' => Hash::make($matricule),
                    'role' => 'student',
                    'gender' => $studentData['gender'] ?? null,
                ]);

                StudentProfile::create([
                    'user_id' => $user->id,
                    'matricule' => $matricule,
                    'level' => $studentData['level'] ?? null,
                ]);

                $created++;
            }

            DB::commit();

            return response()->json([
                'message' => "{$created} étudiant(s) importé(s) avec succès." . ($skipped > 0 ? " {$skipped} ignoré(s)." : ''),
                'created' => $created,
                'skipped' => $skipped,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erreur lors de l\'importation : ' . $e->getMessage()
            ], 500);
        }
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
            ->with(['student.user', 'results.station.evaluationForm', 'results.examiner'])
            ->get();

        return response()->json([
            'exam' => $exam,
            'results' => $progressions
        ]);
    }

    /**
     * Export detailed exam results as styled Excel.
     */
    public function exportExamResults($id)
    {
        $exam = Exam::findOrFail($id);
        $progressions = ExamProgression::where('exam_id', $id)
            ->with(['student.user', 'results.station.examiner', 'results.station.evaluationForm'])
            ->get();

        $filename = "ecos_results_" . str_replace(' ', '_', strtolower($exam->title)) . ".xls";

        $headers = [
            "Content-type" => "application/vnd.ms-excel; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=" . $filename,
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $callback = function() use ($exam, $progressions) {
            $output = fopen('php://output', 'w');
            
            // Format duration helper
            $formatDuration = function($seconds) {
                if (!$seconds) return '00:00';
                $m = floor($seconds / 60);
                $s = $seconds % 60;
                return sprintf('%02d:%02d', $m, $s);
            };

            // Calculate stats
            $totalCandidates = count($progressions);
            $completedCandidates = 0;
            $activeCandidates = 0;
            $juryAlerts = 0;
            $totalSum = 0;
            $totalEvaluations = 0;

            foreach ($progressions as $p) {
                if ($p->status === 'completed') {
                    $completedCandidates++;
                } else {
                    $activeCandidates++;
                }
                if ($p->requires_jury_decision) {
                    $juryAlerts++;
                }
                foreach ($p->results as $r) {
                    $totalSum += $r->score;
                    $totalEvaluations++;
                }
            }

            $globalAverage = $totalEvaluations > 0 ? round($totalSum / $totalEvaluations, 2) : 0;
            $successRate = $totalCandidates > 0 ? round(($completedCandidates / $totalCandidates) * 100, 1) : 0;

            // Output HTML content
            fwrite($output, '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">');
            fwrite($output, '<head>');
            fwrite($output, '<meta http-equiv="Content-type" content="text/html;charset=utf-8" />');
            fwrite($output, '<style>
                body { font-family: "Segoe UI", Arial, sans-serif; }
                table { border-collapse: collapse; width: 100%; margin-top: 15px; }
                th { background-color: #0E7490; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1; padding: 10px; font-size: 12px; }
                td { border: 1px solid #E2E8F0; padding: 8px; font-size: 11px; vertical-align: middle; }
                .title-row { background-color: #0891B2; color: #FFFFFF; text-align: left; padding: 15px; font-size: 18px; font-weight: bold; }
                .meta-table { margin-bottom: 20px; border: none; }
                .meta-table td { border: none; padding: 4px 8px; font-size: 12px; }
                .meta-label { font-weight: bold; color: #475569; }
                .admis { background-color: #DCFCE7; color: #15803D; font-weight: bold; text-align: center; }
                .ajourne { background-color: #FEE2E2; color: #B91C1C; font-weight: bold; text-align: center; }
                .rattrapage { background-color: #FFEDD5; color: #EA580C; font-weight: bold; text-align: center; }
                .jury-alert { background-color: #FEF3C7; color: #D97706; font-weight: bold; text-align: center; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
            </style>');
            fwrite($output, '</head>');
            fwrite($output, '<body>');

            // Exam Title & Meta Info
            fwrite($output, '<h2>' . htmlspecialchars($exam->title) . '</h2>');
            fwrite($output, '<table class="meta-table">');
            fwrite($output, '<tr><td class="meta-label">Date de l\'examen :</td><td>' . htmlspecialchars($exam->date) . '</td></tr>');
            fwrite($output, '<tr><td class="meta-label">Total candidats :</td><td>' . $totalCandidates . '</td></tr>');
            fwrite($output, '<tr><td class="meta-label">Parcours terminés :</td><td>' . $completedCandidates . ' (' . $successRate . '%)</td></tr>');
            fwrite($output, '<tr><td class="meta-label">Parcours en cours :</td><td>' . $activeCandidates . '</td></tr>');
            fwrite($output, '<tr><td class="meta-label">Alertes Jury :</td><td>' . $juryAlerts . '</td></tr>');
            fwrite($output, '<tr><td class="meta-label">Moyenne générale :</td><td>' . $globalAverage . ' / 20</td></tr>');
            fwrite($output, '</table>');

            // Results Table
            fwrite($output, '<table>');
            fwrite($output, '<thead>');
            fwrite($output, '<tr>');
            fwrite($output, '<th rowspan="2">Matricule</th>');
            fwrite($output, '<th rowspan="2">Nom Etudiant</th>');
            fwrite($output, '<th rowspan="2">Statut Général</th>');
            fwrite($output, '<th rowspan="2">Moyenne</th>');
            fwrite($output, '<th colspan="5">Étape 1</th>');
            fwrite($output, '<th colspan="5">Étape 2</th>');
            fwrite($output, '<th colspan="5">Étape 3</th>');
            fwrite($output, '<th colspan="5">Étape 4</th>');
            fwrite($output, '<th colspan="5">Étape 5</th>');
            fwrite($output, '</tr>');
            fwrite($output, '<tr>');
            for ($i = 1; $i <= 5; $i++) {
                fwrite($output, '<th>Station</th>');
                fwrite($output, '<th>Note</th>');
                fwrite($output, '<th>Décision</th>');
                fwrite($output, '<th>Temps</th>');
                fwrite($output, '<th>Examinateur</th>');
            }
            fwrite($output, '</tr>');
            fwrite($output, '</thead>');
            fwrite($output, '<tbody>');

            foreach ($progressions as $prog) {
                fwrite($output, '<tr>');
                fwrite($output, '<td class="text-center font-bold">' . htmlspecialchars($prog->student->matricule) . '</td>');
                fwrite($output, '<td>' . htmlspecialchars($prog->student->user->name) . '</td>');
                
                $statusClass = $prog->status === 'completed' ? 'admis' : 'font-bold text-center';
                $statusText = $prog->status === 'completed' ? 'Terminé' : 'En cours';
                if ($prog->requires_jury_decision) {
                    $statusClass = 'jury-alert';
                    $statusText = 'Alerte Jury';
                }
                fwrite($output, '<td class="' . $statusClass . '">' . $statusText . '</td>');

                $resultsList = $prog->results;
                $totalScore = 0;
                
                $stepResultsGroup = array_fill(1, 5, []);
                foreach ($resultsList as $res) {
                    $totalScore += $res->score;
                    $stepNum = $res->station->step_number ?? 1;
                    if ($stepNum >= 1 && $stepNum <= 5) {
                        $stepResultsGroup[$stepNum][] = $res;
                    }
                }
                
                $avg = count($resultsList) > 0 ? round($totalScore / count($resultsList), 2) : 0;
                
                fwrite($output, '<td class="text-center font-bold">' . $avg . ' / 20</td>');

                for ($stepNum = 1; $stepNum <= 5; $stepNum++) {
                    $group = $stepResultsGroup[$stepNum];
                    $res = null;
                    $hasReserve = false;
                    
                    foreach ($group as $r) {
                        if ($r->station && $r->station->is_reserve) {
                            $res = $r;
                            $hasReserve = true;
                            break;
                        }
                    }
                    if (!$res && count($group) > 0) {
                        $res = $group[0];
                    }

                    if ($res) {
                        $decisionText = '';
                        $decisionClass = '';
                        if ($hasReserve) {
                            if ($res->passed) {
                                $decisionText = 'Admis après rattrapage';
                                $decisionClass = 'rattrapage';
                            } else {
                                $decisionText = 'Non validé';
                                $decisionClass = 'ajourne';
                            }
                        } else {
                            if ($res->passed) {
                                $decisionText = 'Admis';
                                $decisionClass = 'admis';
                            } else {
                                $decisionText = 'Non validé';
                                $decisionClass = 'ajourne';
                            }
                        }

                        fwrite($output, '<td>' . htmlspecialchars($res->station->name) . '</td>');
                        fwrite($output, '<td class="text-center font-bold">' . $res->score . '</td>');
                        fwrite($output, '<td class="' . $decisionClass . '">' . htmlspecialchars($decisionText) . '</td>');
                        fwrite($output, '<td class="text-center">' . htmlspecialchars($formatDuration($res->duration)) . '</td>');
                        fwrite($output, '<td>' . htmlspecialchars($res->examiner->name ?? 'Système') . '</td>');
                    } else {
                        fwrite($output, '<td class="text-center">-</td>');
                        fwrite($output, '<td class="text-center">-</td>');
                        fwrite($output, '<td class="text-center">-</td>');
                        fwrite($output, '<td class="text-center">-</td>');
                        fwrite($output, '<td class="text-center">-</td>');
                    }
                }
                fwrite($output, '</tr>');
            }

            fwrite($output, '</tbody>');
            fwrite($output, '</table>');
            fwrite($output, '</body>');
            fwrite($output, '</html>');
            
            fclose($output);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Get list of all administrators.
     */
    public function getAdmins()
    {
        $admins = User::whereIn('role', ['super_admin', 'admin'])->get();
        return response()->json([
            'admins' => $admins
        ]);
    }

    /**
     * Create or update an administrator account.
     */
    public function saveAdmin(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'role' => 'required|string|in:super_admin,admin',
            'password' => 'nullable|string|min:6'
        ]);

        $id = $request->input('id');
        $email = trim($request->input('email'));

        // Check if email already used by another user
        $exists = User::where('email', $email);
        if ($id) {
            $exists->where('id', '!=', $id);
        }
        if ($exists->exists()) {
            return response()->json([
                'message' => 'Cette adresse email est déjà utilisée.'
            ], 422);
        }

        if ($id) {
            $user = User::findOrFail($id);
            $user->name = trim($request->input('name'));
            $user->email = $email;
            $user->role = $request->input('role');
            if ($request->input('password')) {
                $user->password = \Illuminate\Support\Facades\Hash::make($request->input('password'));
            }
            $user->save();
            $message = 'Administrateur mis à jour avec succès.';
        } else {
            if (!$request->input('password')) {
                return response()->json([
                    'message' => 'Le mot de passe est obligatoire pour un nouveau compte.'
                ], 422);
            }
            User::create([
                'name' => trim($request->input('name')),
                'email' => $email,
                'role' => $request->input('role'),
                'password' => \Illuminate\Support\Facades\Hash::make($request->input('password'))
            ]);
            $message = 'Administrateur créé avec succès.';
        }

        return response()->json([
            'message' => $message
        ]);
    }

    /**
     * Delete an administrator account.
     */
    public function deleteAdmin($id)
    {
        $user = User::findOrFail($id);

        // Prevent self deletion
        if (auth()->id() == $user->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.'
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'Administrateur supprimé avec succès.'
        ]);
    }
}
