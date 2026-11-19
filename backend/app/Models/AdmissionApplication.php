<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdmissionApplication extends Model
{
    use HasFactory;

    protected $table = 'admission_applications';

    protected $fillable = [
        'serial_no',
        'reg_no',
        'session_name',
        'group_name',
        'college_code',
        'admission_roll_no',
        'merit_position',
        'merit_score',
        'candidate_name',
        'candidate_name_bn',
        'sex',
        'father_name',
        'father_name_bn',
        'father_occupation',
        'mother_name',
        'mother_name_bn',
        'mother_occupation',
        'guardian_name',
        'guardian_occupation',
        'date_of_birth',
        'religion',
        'identification_mark',
        'nationality',
        'home_district',
        'communication_address',
        'phone',
        'mobile',
        'email',
        'permanent_address',
        'academic_json',
        'activities_json',
        'declaration_json',
        'undertaking_json',
        'attachments_json',
        'photo_path',
        'status',
        'rejection_note',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'academic_json' => 'array',
        'activities_json' => 'array',
        'declaration_json' => 'array',
        'undertaking_json' => 'array',
        'attachments_json' => 'array',
        'approved_at' => 'datetime',
    ];

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
