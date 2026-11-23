<?php
/* Pholoso Parent Coach - can this hosting run the coach? Open /coach-health.php after
 * uploading. It lists checks as OK or NOT OK and never shows passwords, keys or paths.
 * Remove it, or leave it: it reveals nothing private. */

require __DIR__ . '/lib/coach/coach-engine.php';

header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$checks = [];
$add = function (string $name, bool $ok, string $hint = '') use (&$checks) {
    $checks[] = [$name, $ok, $hint];
};

$add('PHP 7.4 or newer', version_compare(PHP_VERSION, '7.4.0', '>='), 'Choose a newer PHP version in cPanel > Select PHP Version.');
$add('cURL (to reach the AI provider)', function_exists('curl_init'), 'Turn on the curl extension in cPanel > Select PHP Version > Extensions.');
$add('PDO MySQL (the database)', extension_loaded('pdo_mysql'), 'Turn on pdo_mysql in cPanel > Select PHP Version > Extensions.');
$add('mbstring', extension_loaded('mbstring'), 'Turn on mbstring in cPanel > Select PHP Version > Extensions.');

$c = coach_config();
$add('Private config file with a "coach" section', $c !== null, 'See config.example.php and docs/DEPLOY.md.');
if ($c !== null) {
    $add('Coach switched on (enabled = true)', !empty($c['enabled']), 'Set enabled to true only after the Foundation approves it.');
    $add('AI key present', trim((string) $c['api_key']) !== '', 'Add api_key to the private config.');
    $add('Salt present', trim((string) $c['salt']) !== '', 'Add a long random salt to the private config.');
    $dir = (string) $c['storage_dir'];
    $add('Storage folder writable', (is_dir($dir) || @mkdir($dir, 0700, true)) && is_writable($dir), 'Create the storage folder next to config.php and make it writable.');
    $db = null;
    try {
        $db = coach_db($c);
        $add('Database connection', true);
    } catch (Throwable $e) {
        $add('Database connection', false, 'Check the database name, user and password in the private config.');
    }
    if ($db !== null) {
        foreach (['coach_sessions', 'coach_messages', 'coach_feedback', 'coach_parents', 'coach_magic_links', 'coach_logins', 'coach_reminders', 'coach_unsubscribe'] as $t) {
            try {
                $db->query('SELECT 1 FROM ' . $t . ' LIMIT 1');
                $ok = true;
            } catch (Throwable $e) {
                $ok = false;
            }
            $add("Table $t", $ok, 'Run server/migrations/001_coach.sql and 002_coach_accounts.sql in phpMyAdmin.');
        }
    }
    $n = count(coach_strategies($c));
    $add("Approved strategies ($n)", $n > 0, 'A professional must approve at least one strategy (status: approved), then rebuild.');
    $add('Chat page present', is_file($c['shell_file']), 'Upload the whole dist folder.');
    $add('My coaching page present', is_file($c['my_shell_file']), 'Upload the whole dist folder.');
    $add('Site address for email links (site_url)', strpos((string) $c['site_url'], 'https://') === 0, 'Set site_url to https://pholoso.africa in the private config.');
}

$all = true;
foreach ($checks as $ch) {
    $all = $all && $ch[1];
    echo ($ch[1] ? 'OK      ' : 'NOT OK  ') . $ch[0] . ($ch[1] || $ch[2] === '' ? '' : "\n        " . $ch[2]) . "\n";
}
echo "\n" . ($all ? 'Everything the coach needs is in place.' : 'Fix the items marked NOT OK.') . "\n";
