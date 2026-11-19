<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermissionMiddleware
{
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account is inactive. Contact the administrator.'
            ], 403);
        }

        if ($permission && !$user->hasPermission($permission)) {
            return response()->json([
                'success' => false,
                'message' => "Forbidden: You do not have permission for '{$permission}'."
            ], 403);
        }

        return $next($request);
    }
}
