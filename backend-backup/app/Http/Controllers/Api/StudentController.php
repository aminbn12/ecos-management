<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\ExamProgression;
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

        $progression = ExamProgression::with(['currentStation', 'exam', 'results.station'])
            ->where('student_id', $studentProfile->id)
            ->first();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'student_profile' => $studentProfile,
            'progression' => $progression
        ]);
    }
}
