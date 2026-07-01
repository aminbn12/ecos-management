<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentProfile extends Model
{
    protected $fillable = [
        'user_id',
        'matricule',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function progressions()
    {
        return $this->hasMany(ExamProgression::class, 'student_id');
    }

    public function results()
    {
        return $this->hasManyThrough(
            EvaluationResult::class,
            ExamProgression::class,
            'student_id', // Foreign key on ExamProgression table
            'exam_progression_id', // Foreign key on EvaluationResult table
            'id', // Local key on StudentProfile table
            'id' // Local key on ExamProgression table
        );
    }
}
