<?php
/* Pholoso Parent Coach - one-click "stop these reminders", from the link in a reminder email.
 * No sign-in needed. */

require dirname(__DIR__, 2) . '/lib/coach/coach-accounts.php';

$c = coach_begin('GET');
$ok = coach_unsubscribe(coach_db($c), isset($_GET['token']) ? (string) $_GET['token'] : '');
header('Location: /parent-coach/my-coaching/?notice=' . ($ok ? 'unsubscribed' : 'unsubscribe-link'), true, 303);
