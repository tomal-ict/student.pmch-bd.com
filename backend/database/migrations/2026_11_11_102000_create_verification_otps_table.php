<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_otps', function (Blueprint $table) {
            $table->id();
            $table->string('reg_no', 50)->index();
            $table->string('session_name', 100)->nullable();
            $table->string('phone', 30);
            $table->string('otp_code', 10);
            $table->timestamp('expires_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_otps');
    }
};
