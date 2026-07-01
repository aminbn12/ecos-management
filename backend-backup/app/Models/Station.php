<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Station extends Model
{
    protected $fillable = [
        'exam_id',
        'name',
        'step_number',
        'is_reserve',
        'type',
    ];

    protected $casts = [
        'is_reserve' => 'boolean',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function evaluationForm()
    {
        return $this->hasOne(EvaluationForm::class);
    }
}
