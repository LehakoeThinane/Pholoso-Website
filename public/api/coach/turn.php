<?php
/* Pholoso Parent Coach - one turn: the parent's answer (typed or tapped), or "skip" at the end.
 * Scripts get {ok, added: [messages], choices, placeholder, ended}; browsers without
 * JavaScript are sent back to the session page. */

require dirname(__DIR__, 2) . '/lib/coach/coach-engine.php';

$c = coach_begin('POST');
$in = coach_input();
$json = coach_wants_json();
$id = isset($in['id']) ? (string) $in['id'] : '';

$back = function (string $notice = '') use ($id) {
    header('Location: /parent-coach/s/' . rawurlencode($id) . '/' . ($notice !== '' ? '?notice=' . $notice : '') . '#latest', true, 303);
    exit;
};
$fail = function (int $status, string $code, string $message) use ($json, $back) {
    if ($json) {
        coach_json($status, ['ok' => false, 'code' => $code, 'message' => $message]);
    }
    $back($code);
};

$db = coach_db($c);
$s = coach_session_load($db, $id);
if ($s === null) {
    if ($json) {
        coach_json(404, ['ok' => false, 'code' => 'not_found', 'message' => 'That conversation has ended or expired.']);
    }
    header('Location: /parent-coach/', true, 303);
    exit;
}
if ($s['ended']) {
    $fail(409, 'ended', 'This conversation has finished. You can start a new one.');
}
if (!coach_rate_ok($c)) {
    $fail(429, 'rate_limited', 'You are sending messages very quickly. Please wait a few minutes and try again.');
}

$added = [];
$action = isset($in['action']) ? (string) $in['action'] : '';
if ($action === 'skip') {
    $r = coach_closing($s);
    $s['stage'] = 'done';
    $s['ended'] = true;
    $s['choices'] = [];
    $added[] = ['role' => 'coach', 'blocks' => $r['blocks']];
} else {
    $raw = isset($in['choice']) && (string) $in['choice'] !== '' ? (string) $in['choice'] : (string) ($in['message'] ?? $in['text'] ?? '');
    $text = coach_strip_personal(coach_clean($raw, 1000));
    if ($text === '') {
        $fail(400, 'empty', 'Please type a message or choose an answer.');
    }
    $added[] = ['role' => 'parent', 'text' => $text];

    if (coach_is_crisis($text)) {
        $result = ['emergency' => true];
    } else {
        $result = coach_turn($c, $s, $text);
    }
    if (isset($result['error'])) {
        $fail(503, $result['error'], 'The coach could not reply just now. Please try again in a moment.');
    }
    if (!empty($result['emergency'])) {
        // Stop coaching and show where to get help now
        $added[] = ['role' => 'coach', 'help' => true];
        $s['ended'] = true;
        $s['choices'] = [];
    } else {
        $r = $result['reply'];
        $s['stage'] = $r['next_stage'];
        $s['choices'] = $r['choices'];
        $s['placeholder'] = $r['placeholder'];
        $added[] = ['role' => 'coach', 'blocks' => $r['blocks']];
    }
}

foreach ($added as $m) {
    coach_message_add($db, $s['uuid'], $m);
}
coach_session_save($db, $s);

if ($json) {
    coach_json(200, ['ok' => true, 'added' => $added, 'choices' => $s['choices'], 'placeholder' => $s['placeholder'], 'ended' => $s['ended']]);
}
$back();
