<?php
/* Pholoso Parent Coach - a saved session.
 *   /parent-coach/s/<id>/        (rewritten here by .htaccess) the page, drawn on the server
 *   ?id=<id>&format=json         the session for the chat script */

require dirname(__DIR__, 2) . '/lib/coach/coach-render.php';
require dirname(__DIR__, 2) . '/lib/coach/coach-engine.php';

$c = coach_begin('GET');
$id = isset($_GET['id']) ? (string) $_GET['id'] : '';
$s = coach_session_load(coach_db($c), $id);
$json = isset($_GET['format']) && $_GET['format'] === 'json';

if ($s === null) {
    if ($json) {
        coach_json(404, ['ok' => false, 'code' => 'not_found', 'message' => 'That conversation has ended or expired.']);
    }
    header('Location: /parent-coach/', true, 303);
    exit;
}
if ($json) {
    coach_json(200, ['ok' => true, 'session' => coach_public_state($s)]);
}

$notices = [
    'busy' => 'The coach could not reply just now. Please try again in a moment.',
    'rate_limited' => 'You are sending messages very quickly. Please wait a few minutes and try again.',
    'empty' => 'Please type a message or choose an answer.',
    'ended' => 'This conversation has finished. You can start a new one.',
    'unavailable' => 'The coach is not available just now. The written Parent Guide may help in the meantime.',
    'rated' => 'Thank you for rating this session.',
];
$notice = isset($_GET['notice'], $notices[$_GET['notice']]) ? $notices[$_GET['notice']] : '';
$page = coach_render_page($c, $s, $notice);
if ($page === '') {
    http_response_code(500);
    exit('The coach page is missing. Please upload the whole website again.');
}
header('Content-Type: text/html; charset=UTF-8');
echo $page;
