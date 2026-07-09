<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\ExamProgression;
use App\Models\Setting;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    /**
     * Get the authenticated student's profile, including their active progression.
     */
    public function profile(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'student') {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $studentProfile = StudentProfile::where('user_id', $user->id)->first();

        if (!$studentProfile) {
            return response()->json(['message' => 'Profil étudiant inexistant.'], 404);
        }

        $progression = ExamProgression::with(['currentStation.evaluationForm', 'exam', 'results.station'])
            ->where('student_id', $studentProfile->id)
            ->first();

        $showAverage = Setting::getValue('show_student_average', '0') === '1';

        $averageScore = null;
        if ($showAverage && $progression && count($progression->results) > 0) {
            $total = $progression->results->sum('score');
            $averageScore = round($total / count($progression->results), 2);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'student_profile' => $studentProfile,
            'progression' => $progression,
            'show_average' => $showAverage,
            'average_score' => $averageScore,
        ]);
    }

    /**
     * Check if the examiner has scanned the student at a tablet station.
     * Used by the student tablet for polling-based auto-launch.
     */
    public function checkScan(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'student') {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $studentProfile = StudentProfile::where('user_id', $user->id)->first();

        if (!$studentProfile) {
            return response()->json(['scanned' => false]);
        }

        $progression = ExamProgression::with(['currentStation.evaluationForm'])
            ->where('student_id', $studentProfile->id)
            ->first();

        if (!$progression || !$progression->currentStation) {
            return response()->json(['scanned' => false]);
        }

        // Check if the current station is a tablet station and the student has been scanned
        $isTabletStation = $progression->currentStation->type === 'student_tablet';
        $isScanned = $progression->scanned_at !== null;

        if ($isTabletStation && $isScanned) {
            return response()->json([
                'scanned' => true,
                'student_name' => $user->name,
                'station' => [
                    'id' => $progression->currentStation->id,
                    'name' => $progression->currentStation->name,
                    'step_number' => $progression->currentStation->step_number,
                    'is_reserve' => $progression->currentStation->is_reserve,
                    'type' => $progression->currentStation->type,
                    'evaluation_form' => $progression->currentStation->evaluationForm,
                ],
            ]);
        }

        return response()->json([
            'scanned' => false,
            'current_station_type' => $progression->currentStation->type ?? null,
        ]);
    }
}
