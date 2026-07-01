<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    protected $fillable = [
        'title',
        'date',
        'status',
    ];

    public function stations()
    {
        return $this->hasMany(Station::class);
    }

    public function progressions()
    {
        return $this->hasMany(ExamProgression::class);
    }
}
