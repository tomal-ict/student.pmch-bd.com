<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResultMark extends Model
{
    use HasFactory;

    protected $table = 'result_marks';

    public $timestamps = false;

    protected $fillable = [
        'exam_result_id',
        'subject_name',
        'full_marks',
        'obtained_marks',
    ];

    protected $casts = [
        'full_marks' => 'float',
        'obtained_marks' => 'float',
        'created_at' => 'datetime',
    ];

    public function examResult(): BelongsTo
    {
        return $this->belongsTo(ExamResult::class, 'exam_result_id');
    }
}
