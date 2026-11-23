<?php
/* Serves a live-mode build of the site with the Parent Coach switched on, for the browser tests
 * in tests/e2e-live/ (playwright.live.config.ts starts it). Never uses the real AI: replies
 * come from tests/php/mock-ai.php, and the database is a throwaway SQLite file.
 *
 *   php tests/php/live-server.php <site folder> <port>
 * The site folder is a build made with COACH_MODE=live (pnpm build:live). */

$root = dirname(__DIR__, 2);
$site = realpath($argv[1] ?? $root . '/dist-live');
$port = (int) ($argv[2] ?? 4398);
if ($site === false || !is_file($site . '/parent-coach/chat/index.html')) {
    fwrite(STDERR, "Build the site in live mode first (pnpm build:live).\n");
    exit(1);
}

$tmp = sys_get_temp_dir() . '/pholoso-live-' . bin2hex(random_bytes(4));
mkdir($tmp, 0700, true);

// Database
$db = new PDO('sqlite:' . $tmp . '/coach.sqlite');
$sql = (string) file_get_contents($root . '/server/migrations/001_coach.sql')
    . (string) file_get_contents($root . '/server/migrations/002_coach_accounts.sql');
$sql = preg_replace('/^--.*$/m', '', $sql);
$sql = str_replace(['INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY', ' UNSIGNED', 'MEDIUMTEXT'], ['INTEGER PRIMARY KEY AUTOINCREMENT', '', 'TEXT'], $sql);
$sql = preg_replace('/,\s*INDEX \([^)]*\)/', '', $sql);
$sql = preg_replace('/\)\s*ENGINE=[^;]*;/', ');', $sql);
$db->exec($sql);

// The library as the build has it, with the drafts treated as approved (tests only)
$built = json_decode((string) file_get_contents($site . '/parent-coach/strategies.json'), true);
$library = $built['strategies'] ?? [];
if (!$library) {
    $library = [['id' => 'next-up-activity', 'title' => 'Next-up activity', 'summary' => 'Have something good ready.', 'status' => 'approved']];
}
foreach ($library as &$s) {
    $s['status'] = 'approved';
}
unset($s);
file_put_contents($tmp . '/strategies.json', json_encode(['strategies' => $library]));

@unlink(sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pholoso-live-mail.log');

// The mock AI
$s = stream_socket_server('tcp://127.0.0.1:0');
$aiPort = (int) substr(strrchr(stream_socket_get_name($s, false), ':'), 1);
fclose($s);
$ini = php_ini_loaded_file();
$php = $ini ? [PHP_BINARY, '-c', $ini] : [PHP_BINARY];
$null = stripos(PHP_OS, 'WIN') === 0 ? 'NUL' : '/dev/null';
$env = array_merge(getenv(), ['MOCK_AI_MODE_FILE' => $tmp . '/mode.txt']);
$mock = proc_open(array_merge($php, ['-S', "127.0.0.1:$aiPort", __DIR__ . '/mock-ai.php']), [0 => ['pipe', 'r'], 1 => ['file', $null, 'w'], 2 => ['file', $null, 'w']], $pipes, __DIR__, $env);

file_put_contents($tmp . '/config.php', '<?php return ' . var_export([
    'salt' => 'live-test-salt',
    'storage_dir' => $tmp . '/storage',
    'coach' => [
        'enabled' => true,
        'db' => ['dsn' => 'sqlite:' . $tmp . '/coach.sqlite', 'user' => '', 'password' => ''],
        'api_key' => 'live-test-key',
        'api_url' => "http://127.0.0.1:$aiPort/v1/messages",
        'rate_limit' => ['max' => 5000, 'window' => 3600],
        'strategies_file' => $tmp . '/strategies.json',
        // Emails go to a file the browser tests read (never sent)
        'mail_capture' => sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pholoso-live-mail.log',
        'site_url' => "http://127.0.0.1:$port",
    ],
], true) . ';');

echo "Parent Coach (live mode, mock AI) on http://127.0.0.1:$port\n";
$server = proc_open(array_merge($php, ['-S', "127.0.0.1:$port", '-t', $site, __DIR__ . '/router.php']), [0 => ['pipe', 'r'], 1 => STDOUT, 2 => STDERR], $p2, $site, $env + ['PHOLOSO_CONFIG' => $tmp . '/config.php']);
register_shutdown_function(function () use ($mock, $server) {
    proc_terminate($mock);
    proc_terminate($server);
});
while (proc_get_status($server)['running']) {
    usleep(500000);
}
