<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Robust multi-environment token resolver for VPS, cPanel, aaPanel, Apache & Nginx
        Sanctum::getAccessTokenFromRequestUsing(function (Request $request) {
            // 1. Standard bearer token from Authorization header
            $token = $request->bearerToken();
            if (!empty($token)) {
                return $token;
            }

            // 2. Custom headers that proxies and Apache FastCGI/PHP-FPM never strip
            $headerKeys = [
                'X-Authorization',
                'X-Auth-Token',
                'X-Bearer-Token',
                'Authorization',
            ];
            foreach ($headerKeys as $key) {
                $val = $request->header($key);
                if (!empty($val)) {
                    if (str_starts_with($val, 'Bearer ')) {
                        return substr($val, 7);
                    }
                    return $val;
                }
            }

            // 3. Apache/FastCGI/PHP-FPM environment variables
            $serverKeys = [
                'HTTP_AUTHORIZATION',
                'REDIRECT_HTTP_AUTHORIZATION',
                'REDIRECT_REDIRECT_HTTP_AUTHORIZATION',
                'HTTP_X_AUTHORIZATION',
                'HTTP_X_AUTH_TOKEN',
            ];
            foreach ($serverKeys as $serverKey) {
                $val = $request->server($serverKey);
                if (!empty($val)) {
                    if (str_starts_with($val, 'Bearer ')) {
                        return substr($val, 7);
                    }
                    if (!str_contains($val, ' ')) {
                        return $val;
                    }
                }
            }

            // 4. Query / Body parameter fallback for edge cases
            if ($request->filled('auth_token')) {
                return $request->input('auth_token');
            }
            if ($request->filled('token')) {
                return $request->input('token');
            }

            return null;
        });
    }
}

