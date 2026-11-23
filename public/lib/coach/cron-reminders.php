<?php
/* Pholoso Parent Coach - the daily job: sends the reminders that are due, deletes anonymous
 * conversations older than 30 days, and clears expired sign-in links and sign-ins.
 *
 * Run it from a cPanel cron job once a day (docs/DEPLOY.md), for example:
 *   php /home/ACCOUNT/public_html/lib/coach/cron-reminders.php
 * It lives in lib/, which the web server refuses to serve, and it only runs from the command
 * line. */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/coach-accounts.php';

$c = coach_config();
$why = coach_unavailable($c);
if ($why !== '') {
    fwrite(STDOUT, "Parent Coach not running ($why): nothing to do.\n");
    exit(0);
}
$done = coach_cron(coach_db($c), $c);
fwrite(STDOUT, "Parent Coach: {$done['reminders']} reminder(s) sent, {$done['sessions_deleted']} old conversation(s) deleted.\n");
