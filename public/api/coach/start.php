<?php
/* Pholoso Parent Coach - start a session (from onboarding, or "Start a new conversation").
 * Scripts get {ok, id, url}; browsers without JavaScript are sent to the session page. */

require dirname(__DIR__, 2) . '/lib/coach/coach-engine.php';

$c = coach_begin('POST');
$in = coach_input();
if (!coach_rate_ok($c)) {
    coach_json(429, ['ok' => false, 'code' => 'rate_limited', 'message' => 'Please wait a little before starting another conversation.']);
}
$db = coach_db($c);
if (mt_rand(1, 20) === 1) {
    coach_purge_expired($db);
}

$restart = isset($in['restart_from']) ? (string) $in['restart_from'] : '';
if ($restart !== '') {
    $old = coach_session_load($db, $restart);
    if ($old === null) {
        coach_json(404, ['ok' => false, 'code' => 'not_found', 'message' => 'That conversation has ended or expired.']);
    }
    $profile = $old['profile'];
} else {
    // Onboarding answers. Without JavaScript there is one child (child_name, child_age, differences[]).
    $kids = isset($in['children']) && is_array($in['children']) ? $in['children'] : [];
    if (!$kids && isset($in['child_name'])) {
        $kids = [['name' => $in['child_name'], 'age' => $in['child_age'] ?? '', 'differences' => $in['differences'] ?? []]];
    }
    $children = [];
    foreach (array_slice($kids, 0, 6) as $k) {
        if (!is_array($k)) {
            continue;
        }
        $name = coach_clean((string) ($k['name'] ?? ''), 40);
        if ($name === '') {
            continue;
        }
        $age = preg_replace('/\D/', '', (string) ($k['age'] ?? ''));
        $diff = array_values(array_intersect(COACH_DIFFERENCES, array_map('strval', (array) ($k['differences'] ?? []))));
        $children[] = ['name' => $name, 'age' => substr((string) $age, 0, 2), 'differences' => $diff];
    }
    $profile = ['parent' => coach_clean((string) ($in['parent'] ?? ''), 40), 'children' => $children];
}

$s = [
    'uuid' => coach_uuid(),
    'topic' => 'screen-time',
    'stage' => count($profile['children']) > 1 ? 'pick_child' : 'ask',
    'profile' => $profile,
    'child_index' => 0,
    'memory' => [],
];
$first = coach_opening($s);
$s['choices'] = $first['choices'];
$s['placeholder'] = $first['placeholder'];
coach_session_create($db, $s);
coach_message_add($db, $s['uuid'], ['role' => 'coach', 'blocks' => $first['blocks']]);

$url = '/parent-coach/s/' . $s['uuid'] . '/';
if (coach_wants_json()) {
    coach_json(200, ['ok' => true, 'id' => $s['uuid'], 'url' => $url]);
}
header('Location: ' . $url, true, 303);
