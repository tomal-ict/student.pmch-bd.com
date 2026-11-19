<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    public $timestamps = false;

    protected $fillable = [
        'username',
        'display_name',
        'role_name',
        'permissions_json',
        'is_active',
        'password_hash',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'permissions_json' => 'array',
        'created_at' => 'datetime',
    ];

    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role_name === 'super_admin';
    }

    public function hasPermission(string $perm): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $perms = $this->permissions_json;
        if (is_string($perms)) {
            $perms = json_decode($perms, true) ?? [];
        }

        return is_array($perms) && in_array($perm, $perms, true);
    }
}
