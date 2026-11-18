<?php
/* Pholoso Afrika Foundation - the single form endpoint (contact, newsletter, receipt).
 * Logic: lib/form-handler.php. Credentials live outside the web root
 * (config.example.php in the repository, docs/m365-setup.md).
 *
 * - Script submissions (Accept: application/json) get {ok, code, message, errors}.
 * - Plain form posts (no JavaScript) are redirected (303): to /thank-you/ on success, or
 *   back to the form with ?error=1#<form>-failed, which shows the failure notice. */

require __DIR__ . '/lib/form-handler.php';

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
header('X-Content-Type-Options: nosniff');

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=UTF-8');
    exit('Method not allowed');
}

$accept = isset($_SERVER['HTTP_ACCEPT']) ? (string) $_SERVER['HTTP_ACCEPT'] : '';
$wantsJson = strpos($accept, 'application/json') !== false;

if ($wantsJson && !paf_same_origin($_SERVER)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['ok' => false, 'code' => 'cross_origin', 'errors' => [],
        'message' => 'This form can only be sent from the Pholoso Afrika Foundation website.']);
    exit;
}

$ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
list($status, $payload) = paf_handle($_POST, $ip, paf_load_config());

if ($wantsJson) {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload);
    exit;
}

$formId = paf_field($_POST, 'form');
header('Location: ' . ($payload['ok'] ? '/thank-you/' : paf_error_location($_SERVER, $formId)), true, 303);
