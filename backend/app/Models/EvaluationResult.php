<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvaluationResult extends Model
{
    protected $fillable = [
        'exam_progression_id',
        'station_id',
        'examiner_id',
        'score',
        'passed',
        'remarks',
        'details',
    ];

    protected $casts = [
        'passed' => 'boolean',
        'score' => 'float',
        'details' => 'array',
    ];

    public function progression()
    {
        return $this->belongsTo(ExamProgression::class, 'exam_progression_id');
    }

    public function station()
    {
        return $this->belongsTo(Station::class);
    }

    public function examiner()
    {
        return $this->belongsTo(User::class, 'examiner_id');
    }
}
