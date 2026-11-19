<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class Student extends Model
{
    use HasApiTokens, HasFactory;

    protected $table = 'students';

    protected $fillable = [
        'reg_no',
        'student_name',
        'session_name',
        'phone',
        'father_name',
        'mother_name',
        'address',
    ];

    public function examResults(): HasMany
    {
        return $this->hasMany(ExamResult::class, 'student_id')->orderBy('id', 'desc');
    }

    public function admissions(): HasMany
    {
        return $this->hasMany(AdmissionApplication::class, 'reg_no', 'reg_no');
    }
}
