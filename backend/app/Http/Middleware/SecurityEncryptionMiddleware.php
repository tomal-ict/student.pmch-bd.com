<?php

namespace App\Http\Middleware;

use App\Services\CryptoService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityEncryptionMiddleware
{
    protected CryptoService $crypto;

    public function __construct(CryptoService $crypto)
    {
        $this->crypto = $crypto;
    }

    public function handle(Request $request, Closure $next): Response
    {
        // 1. Process incoming encrypted payloads if present
        $encryptedHeader = $request->header('X-Payload-Encrypted') === 'true';
        $payloadParam = $request->input('_payload');

        if ($encryptedHeader || $payloadParam) {
            try {
                $encryptedData = $payloadParam ?: $request->all();
                $decrypted = $this->crypto->decrypt($encryptedData);
                if (is_array($decrypted)) {
                    $request->merge($decrypted);
                }
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Secure communication error: ' . $e->getMessage()
                ], 400);
            }
        }

        /** @var Response $response */
        $response = $next($request);

        // 2. Add strong security headers to all responses
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // 3. Encrypt JSON response if requested by client
        $wantsEncryption = $request->header('X-Accept-Encrypted') === 'true' || $request->input('_wants_encrypted') === '1';

        if ($wantsEncryption && $response instanceof JsonResponse) {
            $originalData = $response->getData(true);
            $encryptedResponse = $this->crypto->encrypt($originalData);
            $response->setData([
                '_encrypted' => true,
                'payload' => $encryptedResponse
            ]);
            $response->headers->set('X-Response-Encrypted', 'true');
        }

        return $response;
    }
}
