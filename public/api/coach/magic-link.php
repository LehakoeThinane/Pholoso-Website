<?php
/* Pholoso Parent Coach - sign in by email link (no passwords; WCAG 3.3.8).
 *   POST email (+ id: the conversation to save)  sends a link; the reply never says whether
 *                                                the address already has an account
 *   GET  ?token=…                                 the link in the email: shows a "Sign in"
 *                                                button only (My coaching), so an email
 *                                                scanner opening the link does not use it up
 *   POST token                                    the button: uses the link, signs in, saves
 *                                                the conversation, goes to My coaching */

require dirname(__DIR__, 2) . '/lib/coach/coach-accounts.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
$c = coach_begin($method === 'GET' ? 'GET' : 'POST');
$db = coach_db($c);
$valid = function (string $t): bool {
    return (bool) preg_match('/^[0-9a-f]{64}$/', $t);
};

if ($method === 'GET') {
    $token = isset($_GET['token']) ? (string) $_GET['token'] : '';
    header('Location: /parent-coach/my-coaching/' . ($valid($token) ? '?signin=' . $token : '?notice=link'), true, 303);
    exit;
}

$in = coach_input();
if (isset($in['token'])) {
    // The "Sign in" button on this website (a form here can only come from our own page)
    if ((!empty($_SERVER['HTTP_ORIGIN']) || !empty($_SERVER['HTTP_REFERER'])) && !coach_same_origin()) {
        http_response_code(403);
        exit('This can only be used from the Pholoso Afrika Foundation website.');
    }
    $pid = coach_magic_verify($db, (string) $in['token']);
    if ($pid === null) {
        header('Location: /parent-coach/my-coaching/?notice=link', true, 303);
        exit;
    }
    coach_login($db, $pid);
    header('Location: /parent-coach/my-coaching/?notice=signed-in', true, 303);
    exit;
}

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
// Only the browser that started a conversation can save it (someone who only has its web
// address cannot claim it). Otherwise the link still signs in, without saving anything.
$id = (string) ($in['id'] ?? '');
$sent = coach_magic_request($db, $c, $email, coach_owner_ok($c, $id) ? $id : '');
$message = $sent
    ? 'Check your email: we have sent you a link to sign in. It works once, for 20 minutes.'
    : 'Sorry, the email could not be sent just now. Please try again later.';
if ($json) {
    coach_json($sent ? 200 : 503, ['ok' => $sent, 'message' => $message]);
}
header('Location: /parent-coach/my-coaching/?notice=' . ($sent ? 'sent' : 'mail'), true, 303);
