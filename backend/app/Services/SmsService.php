<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send SMS via REVE SMS Gateway (or configured gateway)
     *
     * @param string $toUser Destination phone number (e.g. 017XXXXXXXX)
     * @param string $message Text message
     * @return array [success => bool, response => string, phone => string]
     */
    public static function sendSms(string $toUser, string $message): array
    {
        $enabled = Setting::get('sms_enabled', '1');
        if ($enabled !== '1') {
            Log::info("SMS Gateway is disabled in settings. Skipping sending SMS to {$toUser}");
            return [
                'success' => false,
                'message' => 'SMS Gateway is currently disabled in system settings.',
            ];
        }

        $gatewayUrl = Setting::get('sms_gateway_url', 'https://smpp.revesms.com:7790/sendtext');
        $apiKey = Setting::get('sms_api_key', 'da897b03922028b9');
        $secretKey = Setting::get('sms_secret_key', '3de63a78');
        $callerId = Setting::get('sms_caller_id', 'POPULAR DCL');

        // Clean phone number: keep only digits
        $cleanPhone = preg_replace('/[^\d]/', '', $toUser);

        // Normalize Bangladeshi phone to 11 digits starting with 01
        if (str_starts_with($cleanPhone, '8801')) {
            $cleanPhone = substr($cleanPhone, 2);
        }

        // Build URL parameters
        $params = [
            'apikey' => $apiKey,
            'secretkey' => $secretKey,
            'callerID' => $callerId,
            'toUser' => $cleanPhone,
            'messageContent' => $message,
        ];

        $requestUrl = $gatewayUrl . '?' . http_build_query($params);

        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $requestUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            Log::info("REVE SMS Gateway Response for {$cleanPhone}: HTTP {$httpCode} - {$response}");

            if ($curlError) {
                Log::error("REVE SMS cURL Error: {$curlError}");
                return [
                    'success' => false,
                    'error' => $curlError,
                    'phone' => $cleanPhone,
                ];
            }

            // REVE SMS responses often return JSON, XML, or numeric status codes like "STATUS: 200" or {"status": "SUCCESS"}
            $isSuccess = ($httpCode >= 200 && $httpCode < 300);

            return [
                'success' => $isSuccess,
                'http_code' => $httpCode,
                'response' => $response,
                'phone' => $cleanPhone,
            ];
        } catch (\Throwable $e) {
            Log::error("SMS Gateway Exception: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'phone' => $cleanPhone,
            ];
        }
    }
}
