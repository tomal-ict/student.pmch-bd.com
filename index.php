<?php
declare(strict_types=1);

/**
 * Popular Medical College - Student & Result Management Portal
 * Standalone Production Entry Point
 * 
 * Zero Node.js / Zero CMD required!
 * Just host this folder, connect MySQL database in backend/.env, and enjoy!
 */

$distHtml = file_exists(__DIR__ . '/frontend/dist/index.html')
    ? __DIR__ . '/frontend/dist/index.html'
    : (file_exists(__DIR__ . '/index.html') ? __DIR__ . '/index.html' : null);

if (!$distHtml || !file_exists($distHtml)) {
    http_response_code(500);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;">';
    echo '<h1 style="color:#b91c1c;">Frontend Build Missing</h1>';
    echo '<p>Neither frontend/dist/index.html nor root index.html was found. Please upload the production assets.</p>';
    echo '</body></html>';
    exit;
}

$html = file_get_contents($distHtml);

// Detect if admin route is requested via URL or query
$uri = $_SERVER['REQUEST_URI'] ?? '';
$isAdmin = str_contains(strtolower($uri), 'myadmin') || (isset($_GET['page']) && $_GET['page'] === 'myadmin');

// Calculate base web path dynamically so assets & favicons load reliably from any folder or subfolder
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
$baseHref = ($scriptDir === '' || $scriptDir === '/') ? '/' : $scriptDir . '/';
$apiUrl = rtrim($baseHref, '/') . '/backend/public/api';

// Ensure proper favicon & logo icon paths even when deep linked or accessed via subfolder
$html = str_replace(
    ['href="./logo.png"', 'href="./favicon.ico"'],
    ['href="' . htmlspecialchars($baseHref) . 'logo.png"', 'href="' . htmlspecialchars($baseHref) . 'favicon.ico"'],
    $html
);

// Inject runtime configuration so Vite/React always knows the exact API URL and admin state
$injectScript = '<script>';
$injectScript .= 'window.__BASE_HREF__ = ' . json_encode($baseHref) . ';';
$injectScript .= 'window.__API_URL__ = ' . json_encode($apiUrl) . ';';
if ($isAdmin) {
    $injectScript .= 'window.__IS_ADMIN__ = true;';
}
$injectScript .= '</script></head>';
$html = str_replace('</head>', $injectScript, $html);

// Serve directly with modern security and clean encoding
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

echo $html;
exit;
