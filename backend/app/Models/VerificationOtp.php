<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VerificationOtp extends Model
{
    use HasFactory;

    protected $table = 'verification_otps';

    protected $fillable = [
        'reg_no',
        'session_name',
        'phone',
        'otp_code',
        'expires_at',
        'attempts',
        'is_verified',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_verified' => 'boolean',
    ];
}
