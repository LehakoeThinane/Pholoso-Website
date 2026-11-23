<?php
/* Pholoso Parent Coach - sign in by email link (no passwords; WCAG 3.3.8).
 *   POST email (+ id: the conversation to save)  sends a link; the reply never says whether
 *                                                the address already has an account
 *   GET  ?token=…                                 uses the link: signs in, saves the
 *                                                conversation, goes to My coaching */

require dirname(__DIR__, 2) . '/lib/coach/coach-accounts.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
$c = coach_begin($method === 'GET' ? 'GET' : 'POST');
$db = coach_db($c);

if ($method === 'GET') {
    $pid = coach_magic_verify($db, isset($_GET['token']) ? (string) $_GET['token'] : '');
    if ($pid === null) {
        header('Location: /parent-coach/my-coaching/?notice=link', true, 303);
        exit;
    }
    coach_login($db, $pid);
    header('Location: /parent-coach/my-coaching/?notice=signed-in', true, 303);
    exit;
}

$in = coach_input();
$json = coach_wants_json();
$email = coach_email((string) ($in['email'] ?? ''));
if ($email === '') {
    if ($json) {
        coach_json(422, ['ok' => false, 'code' => 'email', 'message' => 'Please enter your email address, for example name@example.com.']);
    }
    header('Location: /parent-coach/my-coaching/?notice=email', true, 303);
    exit;
}
// Spam protection: per visitor, and at most 3 links an hour per address
$recent = $db->prepare('SELECT COUNT(*) FROM coach_magic_links WHERE email = ? AND created_at > ?');
$recent->execute([$email, time() - 3600]);
if (!coach_rate_ok($c) || (int) $recent->fetchColumn() >= 3) {
    if ($json) {
        coach_json(429, ['ok' => false, 'code' => 'rate_limited', 'message' => 'We have sent several links already. Please check your email, or try again in an hour.']);
    }
    header('Location: /parent-coach/my-coaching/?notice=wait', true, 303);
    exit;
}
$sent = coach_magic_request($db, $c, $email, (string) ($in['id'] ?? ''));
$message = $sent
    ? 'Check your email: we have sent you a link to sign in. It works once, for 20 minutes.'
    : 'Sorry, the email could not be sent just now. Please try again later.';
if ($json) {
    coach_json($sent ? 200 : 503, ['ok' => $sent, 'message' => $message]);
}
header('Location: /parent-coach/my-coaching/?notice=' . ($sent ? 'sent' : 'mail'), true, 303);
