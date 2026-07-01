<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvaluationForm extends Model
{
    protected $fillable = [
        'station_id',
        'title',
        'total_points',
        'criteria',
    ];

    protected $casts = [
        'criteria' => 'array',
    ];

    public function station()
    {
        return $this->belongsTo(Station::class);
    }
}
