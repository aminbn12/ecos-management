<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Helper to get setting value with 60-second cache.
     */
    public static function getValue(string $key, $default = null)
    {
        return Cache::remember("setting_{$key}", 60, function () use ($key, $default) {
            $setting = self::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }
}
