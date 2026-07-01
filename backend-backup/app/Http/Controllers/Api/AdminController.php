<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamProgression;
use App\Models\EvaluationForm;
use App\Models\Station;
use App\Models\Exam;
use Illuminate\Http\Request;

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

        return response()->json([
            'progressions' => $progressions
        ]);
    }

    /**
     * Get all exams and stations.
     */
    public function getStations(Request $request)
    {
        $stations = Station::with('evaluationForm')
            ->orderBy('step_number')
            ->orderBy('is_reserve')
            ->get();

        $exams = Exam::all();

        return response()->json([
            'stations' => $stations,
            'exams' => $exams
        ]);
    }

    /**
     * Create or update a station.
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
        ]);

        $station = Station::updateOrCreate(
            ['id' => $request->id],
            [
                'exam_id' => $request->exam_id,
                'name' => $request->name,
                'step_number' => $request->step_number,
                'is_reserve' => $request->is_reserve,
                'type' => $request->type,
            ]
        );

        return response()->json([
            'message' => 'Station enregistrée avec succès.',
            'station' => $station->load('evaluationForm')
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
}
