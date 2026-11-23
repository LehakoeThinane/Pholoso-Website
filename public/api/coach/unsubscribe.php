<?php
/* Pholoso Parent Coach - "stop these reminders", from the link in a reminder email. No sign-in.
 *   GET  ?token=…  the link: shows a "Stop reminders" button only (My coaching), so an email
 *                  scanner opening the link does not stop anyone's reminders
 *   POST token     the button: stops every pending reminder for that parent */

require dirname(__DIR__, 2) . '/lib/coach/coach-accounts.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
$c = coach_begin($method === 'POST' ? 'POST' : 'GET');
if ($method === 'GET') {
    $token = isset($_GET['token']) ? (string) $_GET['token'] : '';
    $ok = (bool) preg_match('/^[0-9a-f]{64}$/', $token);
    header('Location: /parent-coach/my-coaching/' . ($ok ? '?stop=' . $token : '?notice=unsubscribe-link'), true, 303);
    exit;
}
if ((!empty($_SERVER['HTTP_ORIGIN']) || !empty($_SERVER['HTTP_REFERER'])) && !coach_same_origin()) {
    http_response_code(403);
    exit('This can only be used from the Pholoso Afrika Foundation website.');
}
$ok = coach_unsubscribe(coach_db($c), isset($_POST['token']) ? (string) $_POST['token'] : '');
header('Location: /parent-coach/my-coaching/?notice=' . ($ok ? 'unsubscribed' : 'unsubscribe-link'), true, 303);
