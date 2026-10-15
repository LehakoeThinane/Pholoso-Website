<?php
/* Pholoso Afrika Foundation - contact and updates sign-up form endpoint.
 * The logic lives in lib/form-handler.php. Credentials live outside the web root
 * (see config.example.php and docs/m365-setup.md). */

require __DIR__ . '/lib/form-handler.php';

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=UTF-8');
    exit('Method not allowed');
}

$ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
list($status, $payload) = paf_handle($_POST, $ip, paf_load_config());
http_response_code($status);

$accept = isset($_SERVER['HTTP_ACCEPT']) ? (string) $_SERVER['HTTP_ACCEPT'] : '';
if (strpos($accept, 'application/json') !== false) {
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload);
    exit;
}

// Plain page for a submission made without JavaScript.
$h = function ($s) {
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
};
header('Content-Type: text/html; charset=UTF-8');
?><!DOCTYPE html>
<html lang="en-ZA"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title><?= $payload['ok'] ? 'Message sent' : 'Message not sent' ?> | Pholoso Afrika Foundation</title>
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#FBF9F4;color:#16241F;line-height:1.6;padding:40px 20px}main{max-width:620px;margin:0 auto}h1{color:#0E3A33}a{color:#1C5C52;font-weight:700}li{margin:6px 0}</style></head>
<body><main>
<h1><?= $payload['ok'] ? 'Message sent' : 'Your message was not sent' ?></h1>
<p><?= $h($payload['message']) ?></p>
<?php if ($payload['errors']) : ?><ul><?php foreach ($payload['errors'] as $msg) : ?><li><?= $h($msg) ?></li><?php endforeach; ?></ul><?php endif; ?>
<?php if (!$payload['ok']) : ?><p><a href="mailto:<?= PAF_FALLBACK_EMAIL ?>"><?= PAF_FALLBACK_EMAIL ?></a></p><?php endif; ?>
<p><a href="/#contact">Back to the website</a></p>
</main></body></html>
