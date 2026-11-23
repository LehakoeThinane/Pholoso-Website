<?php
/* Pholoso Parent Coach - "How did this session go?" (1 to 5 stars). */

require dirname(__DIR__, 2) . '/lib/coach/coach-lib.php';

$c = coach_begin('POST');
$in = coach_input();
$id = isset($in['id']) ? (string) $in['id'] : '';
$rating = isset($in['rating']) ? (int) $in['rating'] : 0;
$db = coach_db($c);
$s = coach_session_load($db, $id);
if ($s === null || $rating < 1 || $rating > 5) {
    if (coach_wants_json()) {
        coach_json(400, ['ok' => false, 'code' => 'invalid', 'message' => 'Please choose from 1 to 5 stars.']);
    }
    header('Location: ' . ($s ? '/parent-coach/s/' . $id . '/#latest' : '/parent-coach/'), true, 303);
    exit;
}
// Only the rating is written, so it cannot overwrite (or be overwritten by) a reply in progress
coach_session_rate($db, $s['uuid'], $rating);
if (coach_wants_json()) {
    coach_json(200, ['ok' => true]);
}
header('Location: /parent-coach/s/' . $id . '/?notice=rated#latest', true, 303);
