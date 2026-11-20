<?php
/* Pholoso Parent Coach - "Good response" / "Bad response" (with an optional reason and note)
 * for one coach message. Kept with the session and deleted with it. */

require dirname(__DIR__, 2) . '/lib/coach/coach-lib.php';

$c = coach_begin('POST');
$in = coach_input();
$db = coach_db($c);
$s = coach_session_load($db, isset($in['id']) ? (string) $in['id'] : '');
$value = isset($in['value']) ? (string) $in['value'] : '';
$index = isset($in['message']) ? (int) $in['message'] : -1;
if ($s === null || !in_array($value, ['good', 'bad', 'none'], true) || $index < 0 || $index >= count($s['messages'])) {
    coach_json(400, ['ok' => false, 'code' => 'invalid', 'message' => 'That feedback could not be saved.']);
}
if (!coach_rate_ok($c)) {
    coach_json(429, ['ok' => false, 'code' => 'rate_limited', 'message' => 'Please wait a few minutes and try again.']);
}
$db->prepare('INSERT INTO coach_feedback (session_uuid, message_index, value, reason, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([$s['uuid'], $index, $value, coach_clean((string) ($in['reason'] ?? ''), 80),
        coach_strip_personal(coach_clean((string) ($in['note'] ?? ''), 500)), time()]);
coach_json(200, ['ok' => true]);
