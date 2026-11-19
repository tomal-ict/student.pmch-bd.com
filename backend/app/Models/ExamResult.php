<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamResult extends Model
{
    use HasFactory;

    protected $table = 'exam_results';

    protected $fillable = [
        'student_id',
        'exam_type',
        'exam_month',
        'exam_year',
        'exam_date_value',
        'roll_no',
        'grand_total',
        'total_hidden',
        'result_status',
        'failed_subjects',
        'remarks',
    ];

    protected $casts = [
        'total_hidden' => 'boolean',
        'grand_total' => 'float',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function marks(): HasMany
    {
        return $this->hasMany(ResultMark::class, 'exam_result_id');
    }
}
