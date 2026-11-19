<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicSession extends Model
{
    use HasFactory;

    protected $table = 'academic_sessions';

    public $timestamps = false;

    protected $fillable = [
        'session_name',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
