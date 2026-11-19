<?php

namespace App\Services;

class CryptoService
{
    protected string $key;

    public function __construct()
    {
        $rawKey = config('app.payload_key', env('PAYLOAD_ENCRYPTION_KEY', 'SecuRe_AES256_Stud3nt_P0rtal_Key!'));
        $this->key = hash('sha256', (string) $rawKey, true); // exactly 32 bytes
    }

    public function encrypt(mixed $data): array
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $iv = random_bytes(16);
        $ciphertext = openssl_encrypt($json, 'AES-256-CBC', $this->key, OPENSSL_RAW_DATA, $iv);
        $mac = hash_hmac('sha256', $iv . $ciphertext, $this->key);

        return [
            'iv' => base64_encode($iv),
            'value' => base64_encode($ciphertext),
            'mac' => $mac,
        ];
    }

    public function decrypt(array|string $payload): mixed
    {
        if (is_string($payload)) {
            $payload = json_decode($payload, true);
        }

        if (!isset($payload['iv'], $payload['value'], $payload['mac'])) {
            throw new \InvalidArgumentException('Invalid encrypted payload format.');
        }

        $iv = base64_decode($payload['iv'], true);
        $ciphertext = base64_decode($payload['value'], true);

        if ($iv === false || $ciphertext === false || strlen($iv) !== 16) {
            throw new \InvalidArgumentException('Malformed IV or ciphertext.');
        }

        $calculatedMac = hash_hmac('sha256', $iv . $ciphertext, $this->key);
        if (!hash_equals($payload['mac'], $calculatedMac)) {
            throw new \SecurityException('Payload signature verification failed.');
        }

        $decrypted = openssl_decrypt($ciphertext, 'AES-256-CBC', $this->key, OPENSSL_RAW_DATA, $iv);
        if ($decrypted === false) {
            throw new \RuntimeException('Decryption failed.');
        }

        return json_decode($decrypted, true);
    }
}
