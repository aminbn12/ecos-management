<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamProgression extends Model
{
    protected $fillable = [
        'exam_id',
        'student_id',
        'current_station_id',
        'status',
        'requires_jury_decision',
        'scanned_at',
        'timer_started_at',
    ];

    protected $casts = [
        'requires_jury_decision' => 'boolean',
        'scanned_at' => 'datetime',
        'timer_started_at' => 'datetime',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id');
    }

    public function currentStation()
    {
        return $this->belongsTo(Station::class, 'current_station_id');
    }

    public function results()
    {
        return $this->hasMany(EvaluationResult::class, 'exam_progression_id');
    }
}
