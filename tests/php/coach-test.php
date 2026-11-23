<?php
/* Tests for the Parent Coach API (public/api/coach/, public/lib/coach/). Standard library only.
 * Run from the repository root:  php tests/php/coach-test.php
 * Uses a throwaway SQLite database and a mock of the AI provider (tests/php/mock-ai.php):
 * the real API is never called. Needs the pdo_sqlite and curl extensions. */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$root = dirname(__DIR__, 2);
$public = $root . '/public';
require $public . '/lib/coach/coach-engine.php';
require $public . '/lib/coach/coach-render.php';

$failures = 0;
$count = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures, $count;
    $count++;
    echo ($ok ? '  ok   ' : '  FAIL ') . $name . (!$ok && $detail !== '' ? " -- $detail" : '') . "\n";
    if (!$ok) {
        $failures++;
    }
}

foreach (['pdo_sqlite', 'curl'] as $ext) {
    if (!extension_loaded($ext)) {
        echo "  skip Parent Coach tests: the $ext extension is not available\n";
        exit(0);
    }
}

$tmp = sys_get_temp_dir() . '/pholoso-coach-test-' . bin2hex(random_bytes(4));
mkdir($tmp, 0700, true);
ini_set('log_errors', '1');
ini_set('error_log', $tmp . '/php-error.log');

/* ---------- Unit checks ---------- */
echo "Safety and checks\n";
check('ID numbers, phone numbers and emails are removed',
    coach_strip_personal('Call 082 555 1234 or +27 82 555 1234, mail me@example.com, ID 8001015009087')
    === 'Call [phone number removed] or [phone number removed], mail [email removed], ID [ID number removed]',
    coach_strip_personal('Call 082 555 1234 or +27 82 555 1234, mail me@example.com, ID 8001015009087'));
check('danger words are found', coach_is_crisis('I think he is NOT breathing') && coach_is_crisis('she wants to self harm') && coach_is_crisis('self-harm'));
check('ordinary words are not', !coach_is_crisis('He refuses to stop the game and shouts') && !coach_is_crisis('my child is not fitting in'));
// Without crisis-words.json (for example left out of an upload): a built-in list, never "every message"
$bare = sys_get_temp_dir() . '/pholoso-crisis-' . bin2hex(random_bytes(4));
mkdir($bare . '/lib/coach', 0700, true);
copy($public . '/lib/coach/coach-lib.php', $bare . '/lib/coach/coach-lib.php');
copy($public . '/lib/rate-limiter.php', $bare . '/lib/rate-limiter.php');
$probe = $bare . '/probe.php';
file_put_contents($probe, '<?php ini_set("log_errors", "0"); require __DIR__ . "/lib/coach/coach-lib.php"; echo json_encode([coach_is_crisis("He has a meltdown"), coach_is_crisis("he is unconscious")]);');
$ini0 = php_ini_loaded_file();
$out = shell_exec(escapeshellarg(PHP_BINARY) . ($ini0 ? ' -c ' . escapeshellarg($ini0) : '') . ' ' . escapeshellarg($probe));
check('a missing crisis word list falls back to a built-in list, not "everything is an emergency"', trim((string) $out) === '[false,true]', (string) $out);
$lib = ['next-up-activity' => ['id' => 'next-up-activity', 'title' => 'Next-up activity']];
$good = ['blocks' => [['type' => 'strategy', 'id' => 'next-up-activity', 'title' => 'Changed', 'text' => 'Try this.']], 'choices' => ['Yes'], 'placeholder' => 'x', 'next_stage' => 'offer', 'safety_flag' => 'none'];
$v = coach_validate_reply($good, 'validate', 'offer', $lib);
check('a library strategy is accepted, with the library title', $v !== null && $v['blocks'][0]['title'] === 'Next-up activity');
$bad = $good;
$bad['blocks'][0]['id'] = 'magic-trick';
check('an invented strategy is rejected', coach_validate_reply($bad, 'validate', 'offer', $lib) === null);
check('an unknown block type is rejected', coach_validate_reply(['blocks' => [['type' => 'script', 'text' => 'x']]] + $good, 'validate', 'offer', $lib) === null);
$jump = $good;
$jump['next_stage'] = 'pushback';
check('the arc cannot be skipped (next stage is fixed)', coach_validate_reply($jump, 'validate', 'offer', $lib)['next_stage'] === 'offer');
$schema = coach_schema(['next-up-activity']);
check('the reply schema lists only approved strategy ids', strpos(json_encode($schema), '"enum":["next-up-activity"]') !== false);

/* ---------- Database, strategies, config ---------- */
$dbFile = $tmp . '/coach.sqlite';
$sqlite = new PDO('sqlite:' . $dbFile);
$sql = (string) file_get_contents($root . '/server/migrations/001_coach.sql')
    . (string) file_get_contents($root . '/server/migrations/002_coach_accounts.sql');
$sql = preg_replace('/^--.*$/m', '', $sql);
$sql = str_replace(['INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY', ' UNSIGNED', 'MEDIUMTEXT'], ['INTEGER PRIMARY KEY AUTOINCREMENT', '', 'TEXT'], $sql);
$sql = preg_replace('/,\s*INDEX \([^)]*\)/', '', $sql);
$sql = preg_replace('/\)\s*ENGINE=[^;]*;/', ');', $sql);
$sqlite->exec($sql);
check('the migrations create the tables (as SQLite)', (int) $sqlite->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name LIKE 'coach_%'")->fetchColumn() === 9);
$mailFile = $tmp . '/mail.log';
touch($mailFile);
$mails = function () use ($mailFile) {
    return array_map(function ($l) {
        return json_decode($l, true);
    }, file($mailFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
};

$strategiesFile = $tmp . '/strategies.json';
file_put_contents($strategiesFile, json_encode(['topic' => 'screen-time', 'strategies' => [
    ['id' => 'next-up-activity', 'title' => 'Next-up activity', 'summary' => 'Have something ready.', 'status' => 'approved'],
    ['id' => 'draft-idea', 'title' => 'Draft idea', 'summary' => 'Not reviewed.', 'status' => 'draft'],
]]));
$modeFile = $tmp . '/mode.txt';
$aiLog = $tmp . '/ai.log';
file_put_contents($modeFile, 'normal');
touch($aiLog);
$mode = function (string $m) use ($modeFile) {
    file_put_contents($modeFile, $m);
};
$aiCalls = function () use ($aiLog) {
    return array_map(function ($l) {
        return json_decode($l, true);
    }, file($aiLog, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
};

function free_port(): int
{
    $s = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int) substr(strrchr(stream_socket_get_name($s, false), ':'), 1);
    fclose($s);
    return $port;
}
function start_server(array $cmd, string $cwd, array $env, int $port)
{
    $null = stripos(PHP_OS, 'WIN') === 0 ? 'NUL' : '/dev/null';
    $proc = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['file', $null, 'w'], 2 => ['file', $null, 'w']], $pipes, $cwd, $env);
    for ($i = 0; $i < 50; $i++) {
        $c = @fsockopen('127.0.0.1', $port, $e, $s, 0.1);
        if ($c) {
            fclose($c);
            return $proc;
        }
        usleep(100000);
    }
    throw new RuntimeException("server on port $port did not start");
}

$php = PHP_BINARY;
$ini = php_ini_loaded_file();
$phpCmd = $ini ? [$php, '-c', $ini] : [$php];
$aiPort = free_port();
$sitePort = free_port();
$base = "http://127.0.0.1:$sitePort";
$env = array_merge(getenv(), ['MOCK_AI_MODE_FILE' => $modeFile, 'MOCK_AI_LOG' => $aiLog]);
$config = function (array $coach) use ($tmp, $dbFile, $aiPort, $strategiesFile, $mailFile, $sitePort) {
    return ['salt' => 'test-salt', 'storage_dir' => $tmp . '/storage', 'coach' => $coach + [
        'enabled' => true,
        'db' => ['dsn' => 'sqlite:' . $dbFile, 'user' => '', 'password' => ''],
        'api_key' => 'test-secret-key-123',
        'api_url' => "http://127.0.0.1:$aiPort/v1/messages",
        'timeout' => 2,
        'rate_limit' => ['max' => 500, 'window' => 3600],
        'strategies_file' => $strategiesFile,
        'shell_file' => __DIR__ . '/fixtures/chat-shell.html',
        'my_shell_file' => __DIR__ . '/fixtures/my-shell.html',
        'mail_capture' => $mailFile,
        'site_url' => "http://127.0.0.1:$sitePort",
    ]];
};
$configFile = $tmp . '/config.php';
file_put_contents($configFile, '<?php return ' . var_export($config([]), true) . ';');

/** @return array{status:int, headers:array, body:string, json:mixed} */
function call(string $method, string $url, array $data = [], bool $json = true, array $headers = []): array
{
    global $base;
    $h = $json ? ['Content-Type: application/json', 'Accept: application/json'] : ['Content-Type: application/x-www-form-urlencoded'];
    // Scripts send their own Origin; a test may give another one (only one header is ever sent)
    if ($json && !preg_grep('/^Origin:/i', $headers)) {
        $h[] = "Origin: $base";
    }
    $ctx = stream_context_create(['http' => [
        'method' => $method, 'ignore_errors' => true, 'follow_location' => 0, 'timeout' => 30,
        'header' => implode("\r\n", array_merge($h, $headers)),
        'content' => $method === 'POST' ? ($json ? json_encode($data) : http_build_query($data)) : '',
    ]]);
    $body = (string) @file_get_contents($base . $url, false, $ctx);
    $status = isset($http_response_header[0]) && preg_match('#\s(\d{3})#', $http_response_header[0], $mm) ? (int) $mm[1] : 0;
    $location = '';
    $cookie = '';
    $jar = [];
    foreach ($http_response_header ?? [] as $line) {
        if (stripos($line, 'Location:') === 0) {
            $location = trim(substr($line, 9));
        }
        if (stripos($line, 'Set-Cookie:') === 0) {
            $cookie = trim(substr($line, 11));
            $jar[] = explode(';', $cookie)[0];
        }
    }
    // 'cookie': the last Set-Cookie line; 'jar': a ready "Cookie:" header with all of them
    return ['status' => $status, 'location' => $location, 'cookie' => $cookie, 'jar' => $jar ? 'Cookie: ' . implode('; ', $jar) : '',
        'body' => $body, 'json' => json_decode($body, true)];
}

$procs = [];
$procs[] = start_server(array_merge($phpCmd, ['-S', "127.0.0.1:$aiPort", __DIR__ . '/mock-ai.php']), __DIR__, $env, $aiPort);
$procs[] = start_server(array_merge($phpCmd, ['-S', "127.0.0.1:$sitePort", '-t', $public, __DIR__ . '/router.php']), $public, $env + ['PHOLOSO_CONFIG' => $configFile], $sitePort);

$responses = '';
try {
    echo "Requests\n";
    $r = call('GET', '/api/coach/turn.php');
    check('GET turn is refused (405)', $r['status'] === 405);
    $r = call('POST', '/api/coach/start.php', [], true, ['Origin: https://evil.example']);
    check('a script from another site is refused (403)', $r['status'] === 403, $r['body']);

    echo "The full arc (scripts)\n";
    $r = call('POST', '/api/coach/start.php', ['parent' => 'Sam', 'children' => [['name' => 'Luna', 'age' => '7', 'differences' => ['adhd', 'not-a-thing']]]]);
    $id = $r['json']['id'] ?? '';
    $responses .= $r['body'];
    check('start: a session with its own address', $r['status'] === 200 && coach_valid_id($id) && $r['json']['url'] === "/parent-coach/s/$id/", $r['body']);
    $r = call('GET', "/api/coach/session.php?id=$id&format=json");
    $st = $r['json']['session'] ?? [];
    check('the opening question names the child, with three answers', strpos(json_encode($st['messages'] ?? []), 'what usually happens with Luna') !== false && count($st['choices'] ?? []) === 3, $r['body']);
    $row = $sqlite->query("SELECT profile FROM coach_sessions WHERE uuid = '$id'")->fetchColumn();
    check('only known differences are stored', strpos((string) $row, 'not-a-thing') === false && strpos((string) $row, 'adhd') !== false);

    $stages = [];
    foreach (['Luna has a meltdown', 'Yes, show me', 'Yes, let’s try it', 'Building with blocks', 'The lounge', 'Get upset', 'I’m ready to try'] as $answer) {
        $r = call('POST', '/api/coach/turn.php', ['id' => $id, 'choice' => $answer]);
        $responses .= $r['body'];
        $types = array_column((array) ($r['json']['added'][1]['blocks'] ?? []), 'type');
        $stages[] = $r['status'] . ':' . implode(',', $types);
    }
    check('every stage replied (7 turns)', count(array_filter($stages, function ($s) {
        return strpos($s, '200:') === 0;
    })) === 7, implode(' | ', $stages));
    check('the strategy shown is the approved one, with its library title', strpos($responses, '"title":"Next-up activity"') !== false && strpos($responses, 'Whatever') === false);
    check('the plan stage has Say this, How to introduce it and the plan', strpos($stages[4], 'say_this,how_to_introduce,plan') !== false, $stages[4]);
    check('the last stage ends with Save your progress', substr($stages[6], -14) === 'account_prompt', $stages[6]);
    $mem = json_decode((string) $sqlite->query("SELECT memory FROM coach_sessions WHERE uuid = '$id'")->fetchColumn(), true);
    check('the child’s activity, place and strategy are remembered', ($mem['activity'] ?? '') === 'Building with blocks' && ($mem['place'] ?? '') === 'The lounge' && ($mem['strategy'] ?? '') === 'next-up-activity');

    $r = call('POST', '/api/coach/rating.php', ['id' => $id, 'rating' => 3]);
    $sqlite->exec("UPDATE coach_sessions SET busy_until = NULL WHERE uuid = '$id'");
    $r = call('POST', '/api/coach/turn.php', ['id' => $id, 'text' => 'thanks so much']);
    check('after the plan, a typed message gets the closing card and ends the conversation', $r['status'] === 200 && $r['json']['ended'] === true
        && ($r['json']['added'][1]['blocks'][0]['type'] ?? '') === 'closing', $r['body']);
    check('a rating is kept when a turn is saved later (saved on its own)', (int) $sqlite->query("SELECT rating FROM coach_sessions WHERE uuid = '$id'")->fetchColumn() === 3);
    $r = call('POST', '/api/coach/turn.php', ['id' => $id, 'text' => 'one more thing']);
    check('…and then takes no more messages, so no second closing card (409)', $r['status'] === 409, $r['body']);
    $sqlite->exec("UPDATE coach_sessions SET ended = 0, stage = 'close' WHERE uuid = '$id'");
    $r = call('POST', '/api/coach/turn.php', ['id' => $id, 'action' => 'skip']);
    check('Skip shows the closing card and ends the session', $r['json']['ended'] === true && ($r['json']['added'][0]['blocks'][0]['type'] ?? '') === 'closing');
    $r = call('POST', '/api/coach/turn.php', ['id' => $id, 'text' => 'hello again']);
    check('an ended session takes no more messages (409)', $r['status'] === 409);
    $r = call('POST', '/api/coach/rating.php', ['id' => $id, 'rating' => 4]);
    check('rating is saved', $r['status'] === 200 && (int) $sqlite->query("SELECT rating FROM coach_sessions WHERE uuid = '$id'")->fetchColumn() === 4);
    $r = call('POST', '/api/coach/rating.php', ['id' => $id, 'rating' => 9]);
    check('an impossible rating is refused', $r['status'] === 400);
    $r = call('POST', '/api/coach/feedback.php', ['id' => $id, 'message' => 2, 'value' => 'bad', 'reason' => 'It was hard to understand', 'note' => 'call me on 082 555 1234']);
    $fb = $sqlite->query("SELECT value, reason, note FROM coach_feedback WHERE session_uuid = '$id'")->fetch(PDO::FETCH_ASSOC);
    check('feedback is saved, without the phone number', $r['status'] === 200 && $fb['value'] === 'bad' && strpos($fb['note'], '082') === false, json_encode($fb));
    $r = call('POST', '/api/coach/start.php', ['restart_from' => $id]);
    $again = call('GET', '/api/coach/session.php?id=' . ($r['json']['id'] ?? '') . '&format=json');
    check('Start a new conversation keeps the names', ($again['json']['session']['child'] ?? '') === 'Luna' && ($again['json']['session']['parent'] ?? '') === 'Sam');

    echo "What is sent to the AI\n";
    $calls = $aiCalls();
    $first = $calls[0]['body'] ?? [];
    check('7 AI requests for 7 turns', count($calls) === 7, (string) count($calls));
    check('model and effort from config', ($first['model'] ?? '') === 'claude-opus-5-5' && ($first['output_config']['effort'] ?? '') === 'medium');
    check('the reply format is enforced (json_schema)', ($first['output_config']['format']['type'] ?? '') === 'json_schema');
    check('refusal fallback is on', ($first['fallbacks'] ?? '') === 'default' && $calls[0]['beta'] === 'server-side-fallback-2026-07-01');
    check('the system prompt and library are cached', ($first['system'][0]['cache_control']['type'] ?? '') === 'ephemeral');
    check('only approved strategies reach the AI', strpos($first['system'][0]['text'] ?? '', 'next-up-activity') !== false && strpos(json_encode($first), 'draft-idea') === false);
    check('the API key is sent only to the AI provider', $calls[0]['key'] === 'test-secret-key-123' && strpos($responses, 'test-secret-key-123') === false);

    echo "Privacy\n";
    $r = call('POST', '/api/coach/start.php', ['parent' => '', 'children' => [['name' => 'Ben']]]);
    $id2 = $r['json']['id'];
    $before = count($aiCalls());
    call('POST', '/api/coach/turn.php', ['id' => $id2, 'text' => 'He shouts. My number is 082 555 1234 and email sam@example.com']);
    $sent = json_encode(array_slice($aiCalls(), $before));
    $stored = (string) $sqlite->query("SELECT body FROM coach_messages WHERE session_uuid = '$id2' AND role = 'parent'")->fetchColumn();
    check('phone numbers and emails never reach the AI', strpos($sent, '555') === false && strpos($sent, 'sam@example.com') === false);
    check('…and are not stored', strpos($stored, '555') === false && strpos($stored, '[phone number removed]') !== false, $stored);

    echo "Safety\n";
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $id3 = $r['json']['id'];
    $before = count($aiCalls());
    $r = call('POST', '/api/coach/turn.php', ['id' => $id3, 'text' => 'he hit his head and is unconscious']);
    check('danger words end coaching with Need help now?, without asking the AI',
        !empty($r['json']['added'][1]['help']) && $r['json']['ended'] === true && count($aiCalls()) === $before, $r['body']);
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $id4 = $r['json']['id'];
    $mode('emergency');
    $r = call('POST', '/api/coach/turn.php', ['id' => $id4, 'text' => 'Something worrying happened']);
    check('the AI’s emergency flag also ends coaching', !empty($r['json']['added'][1]['help']) && $r['json']['ended'] === true, $r['body']);
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $id5 = $r['json']['id'];
    $mode('concern');
    $r = call('POST', '/api/coach/turn.php', ['id' => $id5, 'text' => 'Meltdowns for hours every day']);
    check('a concern adds a gentle "talk to a professional" note', strpos($r['body'], 'talk to a professional') !== false, $r['body']);

    echo "When things go wrong\n";
    foreach (['invalid' => 'a reply that is not JSON', 'invent' => 'an invented strategy', 'refusal' => 'a refusal', 'error' => 'a provider error', 'slow' => 'a timeout'] as $m => $label) {
        $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
        $sid = $r['json']['id'];
        if ($m === 'invent') {
            $mode('normal');
            call('POST', '/api/coach/turn.php', ['id' => $sid, 'text' => 'meltdown']);
        }
        $mode($m);
        $before = count($aiCalls());
        $r = call('POST', '/api/coach/turn.php', ['id' => $sid, 'text' => 'Yes, show me']);
        $tries = count($aiCalls()) - $before;
        check("$label: a friendly message, nothing shown or saved" . ($m === 'invalid' || $m === 'invent' || $m === 'refusal' ? ' (after one retry)' : ''),
            $r['status'] === 503 && ($r['json']['code'] ?? '') === 'busy' && strpos($r['body'], 'magic-trick') === false
            && (in_array($m, ['invalid', 'invent', 'refusal'], true) ? $tries === 2 : true), $r['status'] . ' ' . $r['body'] . " tries=$tries");
        $kept = (int) $sqlite->query("SELECT COUNT(*) FROM coach_messages WHERE session_uuid = '$sid' AND role = 'parent'")->fetchColumn();
        check("$label: the parent can simply try again", $kept === ($m === 'invent' ? 1 : 0));
    }
    $mode('normal');

    echo "One reply at a time\n";
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $idb = $r['json']['id'];
    $sqlite->exec("UPDATE coach_sessions SET busy_until = " . (time() + 100) . " WHERE uuid = '$idb'");
    $before = count($aiCalls());
    $r = call('POST', '/api/coach/turn.php', ['id' => $idb, 'choice' => 'Ben has a meltdown']);
    check('while a reply is being written, a second one is refused (409), without asking the AI', $r['status'] === 409 && ($r['json']['code'] ?? '') === 'still_replying'
        && count($aiCalls()) === $before, $r['body']);
    check('…and nothing is added to the conversation', (int) $sqlite->query("SELECT COUNT(*) FROM coach_messages WHERE session_uuid = '$idb'")->fetchColumn() === 1);
    $r = call('POST', '/api/coach/turn.php', ['id' => $idb, 'choice' => 'Ben has a meltdown'], false);
    check('without JavaScript, it says the coach is still answering', $r['location'] === "/parent-coach/s/$idb/?notice=still_replying#latest", $r['location']);
    $sqlite->exec("UPDATE coach_sessions SET busy_until = " . (time() - 1) . " WHERE uuid = '$idb'");
    $r = call('POST', '/api/coach/turn.php', ['id' => $idb, 'choice' => 'Ben has a meltdown']);
    check('a claim that has lapsed (a request that died) does not block the conversation', $r['status'] === 200, $r['body']);
    check('after a reply, the conversation is free again', $sqlite->query("SELECT busy_until FROM coach_sessions WHERE uuid = '$idb'")->fetchColumn() === null);
    $mode('error');
    call('POST', '/api/coach/turn.php', ['id' => $idb, 'choice' => 'Yes, show me']);
    $mode('normal');
    check('after an error reply too', $sqlite->query("SELECT busy_until FROM coach_sessions WHERE uuid = '$idb'")->fetchColumn() === null);

    echo "Limits\n";
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $id6 = $r['json']['id'];
    $sqlite->exec("UPDATE coach_sessions SET turns = 15 WHERE uuid = '$id6'");
    $r = call('POST', '/api/coach/turn.php', ['id' => $id6, 'text' => 'more please']);
    check('the turn limit closes kindly with Save your progress', strpos($r['body'], 'account_prompt') !== false && strpos($r['body'], 'covered a lot') !== false, $r['body']);
    @mkdir($tmp . '/storage', 0700, true);
    file_put_contents($tmp . '/storage/coach-budget-' . gmdate('Y-m-d') . '.json', json_encode(['usd' => 99, 'requests' => 1]));
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $id7 = $r['json']['id'];
    $before = count($aiCalls());
    $r = call('POST', '/api/coach/turn.php', ['id' => $id7, 'text' => 'meltdown']);
    check('the daily budget: "the coach is resting", no AI request', strpos($r['body'], 'resting for today') !== false && count($aiCalls()) === $before, $r['body']);
    unlink($tmp . '/storage/coach-budget-' . gmdate('Y-m-d') . '.json');
    $budget = $tmp . '/storage/coach-budget-' . gmdate('Y-m-d') . '.json';
    call('POST', '/api/coach/turn.php', ['id' => $id7, 'text' => 'meltdown']);
    $spent = json_decode((string) @file_get_contents($budget), true);
    check('spend is estimated from token counts', abs(($spent['usd'] ?? 0) - (1000 * 4 + 200 * 20 + 4000 * 0.2) / 1e6) < 1e-9, json_encode($spent));
    $rateFile = $tmp . '/storage/coach-rate/' . hash('sha256', 'test-salt|127.0.0.1') . '.json';
    file_put_contents($rateFile, json_encode(array_fill(0, 600, time())));
    $r = call('POST', '/api/coach/turn.php', ['id' => $id7, 'text' => 'hello']);
    check('the rate limit asks the parent to wait (429)', $r['status'] === 429 && strpos($r['body'], 'wait') !== false, $r['body']);
    unlink($rateFile);

    $budget = $tmp . '/storage/coach-budget-' . gmdate('Y-m-d') . '.json';
    @unlink($budget);
    $mode('slow');
    call('POST', '/api/coach/turn.php', ['id' => $id7, 'text' => 'meltdown']);
    $mode('normal');
    $spent = json_decode((string) @file_get_contents($budget), true);
    check('a timed-out request is counted at the most it could cost', ($spent['usd'] ?? 0) >= 16000 * 20 / 1e6, json_encode($spent));
    file_put_contents($budget, '{damaged');
    $before = count($aiCalls());
    $r = call('POST', '/api/coach/turn.php', ['id' => $id7, 'text' => 'meltdown']);
    check('a damaged spending file: the coach rests (fails closed), no AI request', strpos($r['body'], 'resting for today') !== false && count($aiCalls()) === $before, $r['body']);
    unlink($budget);
    $notDir = $tmp . '/not-a-folder';
    file_put_contents($notDir, 'x');
    check('a storage folder that cannot be written: the cap says no', coach_budget_ok(['storage_dir' => $notDir . '/inside', 'daily_budget_usd' => 5.0]) === false);

    echo "Without JavaScript\n";
    $r = call('POST', '/api/coach/start.php', ['parent' => 'Sam', 'child_name' => 'Luna', 'child_age' => '7', 'differences' => ['autism']], false);
    check('the onboarding form goes to the session page (303)', $r['status'] === 303 && preg_match('#^/parent-coach/s/[0-9a-f-]{36}/$#', $r['location']), $r['location']);
    $page = call('GET', $r['location'], [], false);
    $nid = substr($r['location'], 16, 36);
    check('the session page is drawn by the server', $page['status'] === 200 && strpos($page['body'], 'Welcome<span data-coach-greet>, Sam</span>!') !== false && strpos($page['body'], 'what usually happens with Luna') !== false, substr($page['body'], 0, 300));
    check('the first answers are plain form buttons', substr_count($page['body'], 'name="choice" value="Luna') === 3);
    check('the message box is shown, the "needs JavaScript" note is not', strpos($page['body'], 'data-coach-dock data-js-only') === false && strpos($page['body'], 'data-coach-nojs hidden') !== false
        && preg_match('#<input[^>]*value="' . $nid . '"[^>]*data-coach-id#', $page['body']) === 1);
    $r = call('POST', '/api/coach/turn.php', ['id' => $nid, 'choice' => 'Luna has a meltdown'], false);
    check('an answer goes back to the session page', $r['status'] === 303 && $r['location'] === "/parent-coach/s/$nid/#latest", $r['location']);
    $page = call('GET', "/parent-coach/s/$nid/", [], false);
    check('…which now shows the answer, the reply and chips', strpos($page['body'], 'Luna has a meltdown') !== false && strpos($page['body'], 'That sounds really hard.') !== false
        && strpos($page['body'], 'class="cchip" form="coach-composer"') !== false);
    $r = call('POST', '/api/coach/turn.php', ['id' => $nid, 'action' => 'skip'], false);
    $page = call('GET', "/parent-coach/s/$nid/", [], false);
    check('the closing card has a rating form and a new-conversation form', strpos($page['body'], 'action="/api/coach/rating.php"') !== false && strpos($page['body'], 'name="restart_from"') !== false
        && strpos($page['body'], 'data-coach-dock hidden') !== false);
    $r = call('POST', '/api/coach/rating.php', ['id' => $nid, 'rating' => '5'], false);
    $page = call('GET', $r['location'], [], false);
    check('rating without JavaScript says thank you', strpos($page['body'], 'Thank you for rating this session.') !== false && strpos($page['body'], 'value="5" checked') !== false);
    $r = call('POST', '/api/coach/start.php', ['parent' => 'Sam', 'children' => [['name' => 'Luna'], ['name' => 'Thabo']]]);
    $two = $r['json']['id'];
    $r = call('POST', '/api/coach/turn.php', ['id' => $two, 'choice' => 'Thabo']);
    check('two children: the coach asks which one first', strpos(json_encode($r['json']), 'what usually happens with Thabo') !== false, $r['body']);

    echo "Deleting old sessions\n";
    $sqlite->exec("UPDATE coach_sessions SET expires_at = 1 WHERE uuid = '$id'");
    $r = call('GET', "/api/coach/session.php?id=$id&format=json");
    check('an expired session cannot be opened', $r['status'] === 404);
    putenv('PHOLOSO_CONFIG=' . $configFile);
    $removed = coach_purge_expired(new PDO('sqlite:' . $dbFile));
    check('expired sessions are deleted with their messages and feedback', $removed === 1
        && (int) $sqlite->query("SELECT COUNT(*) FROM coach_messages WHERE session_uuid = '$id'")->fetchColumn() === 0
        && (int) $sqlite->query("SELECT COUNT(*) FROM coach_feedback WHERE session_uuid = '$id'")->fetchColumn() === 0);


    echo "Accounts (Stage 3)\n";
    putenv('PHOLOSO_CONFIG=' . $configFile);
    require_once $public . '/lib/coach/coach-accounts.php';
    $r = call('POST', '/api/coach/start.php', ['parent' => 'Sam', 'children' => [['name' => 'Luna']]]);
    $sid = $r['json']['id'];
    $owner = $r['jar'];
    check('starting a conversation marks this browser as its owner (HttpOnly cookie)', strpos($owner, 'pholoso_own=' . $sid . '.') !== false
        && stripos($r['cookie'], 'httponly') !== false, $r['cookie']);
    $before = count($mails());
    $r = call('POST', '/api/coach/magic-link.php', ['email' => 'Sam@Example.com', 'id' => $sid], true, [$owner]);
    $mail = $mails()[$before] ?? [];
    check('Save: a sign-in link is emailed', $r['status'] === 200 && ($mail['to'] ?? '') === 'sam@example.com'
        && preg_match('#/api/coach/magic-link\.php\?token=([0-9a-f]{64})#', $mail['text'] ?? '', $m) === 1, $r['body']);
    $token = $m[1] ?? '';
    $again = call('POST', '/api/coach/magic-link.php', ['email' => 'someone-new@example.com']);
    check('the reply never says whether an address has an account', $again['json']['message'] === $r['json']['message']);
    check('links are stored only as hashes', (int) $sqlite->query("SELECT COUNT(*) FROM coach_magic_links WHERE token_hash = '" . hash('sha256', $token) . "'")->fetchColumn() === 1
        && strpos(json_encode($sqlite->query('SELECT * FROM coach_magic_links')->fetchAll()), $token) === false);
    $bad = call('POST', '/api/coach/magic-link.php', ['email' => 'not an email']);
    check('a wrong email address is refused kindly', $bad['status'] === 422);
    call('POST', '/api/coach/magic-link.php', ['email' => 'busy@example.com']);
    call('POST', '/api/coach/magic-link.php', ['email' => 'busy@example.com']);
    call('POST', '/api/coach/magic-link.php', ['email' => 'busy@example.com']);
    $r4 = call('POST', '/api/coach/magic-link.php', ['email' => 'busy@example.com']);
    check('at most 3 links an hour per address', $r4['status'] === 429);

    $r = call('GET', '/api/coach/magic-link.php?token=' . $token, [], false);
    check('opening the link (as an email scanner would) only leads to a Sign in button', $r['status'] === 303 && $r['location'] === "/parent-coach/my-coaching/?signin=$token"
        && $sqlite->query("SELECT used_at FROM coach_magic_links WHERE token_hash = '" . hash('sha256', $token) . "'")->fetchColumn() === null && $r['cookie'] === '', $r['location']);
    $page = call('GET', $r['location'], [], false);
    check('…a page with one Sign in button that carries the link', strpos($page['body'], 'name="token" value="' . $token . '"') !== false && strpos($page['body'], '>Sign in</button>') !== false);
    $r = call('POST', '/api/coach/magic-link.php', ['token' => $token], false, ["Origin: $base"]);
    check('pressing it signs in and goes to My coaching', $r['status'] === 303 && $r['location'] === '/parent-coach/my-coaching/?notice=signed-in', $r['location']);
    check('the sign-in cookie is HttpOnly and SameSite=Lax', stripos($r['cookie'], 'pholoso_coach=') === 0 && stripos($r['cookie'], 'httponly') !== false && stripos($r['cookie'], 'samesite=lax') !== false, $r['cookie']);
    $cookie = 'Cookie: ' . explode(';', $r['cookie'])[0];
    $row = $sqlite->query("SELECT parent_id, expires_at FROM coach_sessions WHERE uuid = '$sid'")->fetch(PDO::FETCH_ASSOC);
    check('the conversation is saved to the account, and no longer expires after 30 days', (int) $row['parent_id'] > 0 && (int) $row['expires_at'] === COACH_KEEP);
    $r = call('POST', '/api/coach/magic-link.php', ['token' => $token], false, ["Origin: $base"]);
    check('a link works only once', $r['location'] === '/parent-coach/my-coaching/?notice=link');
    $twice = coach_token();
    $sqlite->exec("INSERT INTO coach_magic_links (token_hash, email, session_uuid, created_at, expires_at, used_at) VALUES ('" . hash('sha256', $twice) . "', 'twice@example.com', NULL, " . time() . ", " . (time() + 600) . ", NULL)");
    $p1 = coach_magic_verify($sqlite, $twice);
    check('using a link and checking it happen in one step: a second use finds nothing', $p1 !== null && coach_magic_verify($sqlite, $twice) === null);
    $old = coach_token();
    $sqlite->exec("INSERT INTO coach_magic_links (token_hash, email, session_uuid, created_at, expires_at, used_at) VALUES ('" . hash('sha256', $old) . "', 'old@example.com', NULL, 1, 2, NULL)");
    $r = call('POST', '/api/coach/magic-link.php', ['token' => $old], false, ["Origin: $base"]);
    check('an expired link does not work', $r['location'] === '/parent-coach/my-coaching/?notice=link');
    $r = call('POST', '/api/coach/magic-link.php', ['token' => $old], false, ['Origin: https://evil.example']);
    check('the Sign in button only works from this website', $r['status'] === 403);
    // Someone with only the conversation's address cannot save it to their own account
    $r = call('POST', '/api/coach/start.php', ['parent' => 'Thandi', 'children' => [['name' => 'Sipho']]]);
    $theirs = $r['json']['id'];
    $before = count($mails());
    call('POST', '/api/coach/magic-link.php', ['email' => 'stranger@example.com', 'id' => $theirs]);
    preg_match('#token=([0-9a-f]{64})#', $mails()[$before]['text'] ?? '', $sm);
    call('POST', '/api/coach/magic-link.php', ['token' => $sm[1] ?? ''], false, ["Origin: $base"]);
    check('without the starting browser’s cookie, a conversation cannot be claimed', $sqlite->query("SELECT parent_id FROM coach_sessions WHERE uuid = '$theirs'")->fetchColumn() === null);

    $page = call('GET', '/parent-coach/my-coaching/', [], false, [$cookie]);
    check('My coaching shows the account and the saved conversation', strpos($page['body'], 'sam@example.com') !== false
        && strpos($page['body'], "/parent-coach/s/$sid/") !== false && strpos($page['body'], ': Luna') !== false, substr($page['body'], 0, 400));
    $anon = call('GET', '/parent-coach/my-coaching/', [], false);
    check('signed out, it offers a sign-in link instead', strpos($anon['body'], 'Send me a sign-in link') !== false && strpos($anon['body'], 'sam@example.com') === false);
    $state = call('GET', "/api/coach/session.php?id=$sid&format=json");
    check('the conversation knows it is saved', ($state['json']['session']['saved'] ?? false) === true);
    $sqlite->exec("INSERT INTO coach_messages (session_uuid, role, body, created_at) VALUES ('$sid', 'coach', '" . json_encode(['blocks' => [['type' => 'account_prompt']]]) . "', 1)");
    $page = call('GET', "/parent-coach/s/$sid/", [], false);
    check('a saved conversation says so instead of asking again', strpos($page['body'], 'This conversation is saved') !== false && strpos($page['body'], 'Save: email me a link') === false);

    $form = function (array $data, array $headers = []) use ($cookie, $base) {
        return call('POST', '/parent-coach/my-coaching/', $data, false, array_merge([$cookie, "Origin: $base"], $headers));
    };
    $r = call('POST', '/parent-coach/my-coaching/', ['action' => 'remind', 'id' => $sid], false, [$cookie, 'Origin: https://evil.example']);
    check('actions from another website are refused', $r['status'] === 403);
    $r = $form(['action' => 'remind', 'id' => $sid]);
    $rem = $sqlite->query("SELECT send_at FROM coach_reminders WHERE session_uuid = '$sid' AND sent_at IS NULL")->fetchColumn();
    check('a reminder is set for 3 days later', $r['location'] === '/parent-coach/my-coaching/?notice=reminder' && abs((int) $rem - (time() + 3 * 86400)) < 60);
    $sqlite->exec("UPDATE coach_reminders SET send_at = 1 WHERE session_uuid = '$sid'");
    $before = count($mails());
    $done = coach_cron(new PDO('sqlite:' . $dbFile), coach_config());
    $mail = $mails()[$before] ?? [];
    check('the daily job sends the reminder, with a one-click unsubscribe link', $done['reminders'] === 1 && ($mail['to'] ?? '') === 'sam@example.com'
        && preg_match('#/api/coach/unsubscribe\.php\?token=([0-9a-f]{64})#', $mail['text'] ?? '', $um) === 1);
    $first = $um[1];
    // A second reminder email, with its own code
    $form(['action' => 'remind', 'id' => $sid]);
    $sqlite->exec("UPDATE coach_reminders SET send_at = 1 WHERE session_uuid = '$sid' AND sent_at IS NULL");
    $before = count($mails());
    coach_cron(new PDO('sqlite:' . $dbFile), coach_config());
    preg_match('#unsubscribe\.php\?token=([0-9a-f]{64})#', $mails()[$before]['text'] ?? '', $um2);
    check('each reminder email has its own unsubscribe code', ($um2[1] ?? '') !== '' && $um2[1] !== $first);
    $form(['action' => 'remind', 'id' => $sid]);
    $r = call('GET', '/api/coach/unsubscribe.php?token=' . $first, [], false);
    check('opening an unsubscribe link (as a scanner would) only leads to a Stop reminders button', $r['location'] === "/parent-coach/my-coaching/?stop=$first"
        && (int) $sqlite->query('SELECT COUNT(*) FROM coach_reminders WHERE sent_at IS NULL')->fetchColumn() === 1);
    $page = call('GET', $r['location'], [], false);
    check('…with one button that carries the code', strpos($page['body'], 'action="/api/coach/unsubscribe.php"') !== false && strpos($page['body'], 'value="' . $first . '"') !== false);
    $r = call('POST', '/api/coach/unsubscribe.php', ['token' => $first], false, ["Origin: $base"]);
    check('the link in the OLDER email still stops every pending reminder, no sign-in needed', $r['location'] === '/parent-coach/my-coaching/?notice=unsubscribed'
        && (int) $sqlite->query('SELECT COUNT(*) FROM coach_reminders WHERE sent_at IS NULL')->fetchColumn() === 0);

    $sqlite->exec("UPDATE coach_sessions SET memory = '" . json_encode(['activity' => 'Building with blocks', 'place' => 'The lounge', 'strategy' => 'next-up-activity']) . "' WHERE uuid = '$sid'");
    $r = $form(['action' => 'follow-up', 'id' => $sid]);
    check('a follow-up starts a new saved conversation', preg_match('#^/parent-coach/s/([0-9a-f-]{36})/$#', $r['location'], $fm) === 1);
    $fid = $fm[1] ?? '';
    $f = call('GET', "/api/coach/session.php?id=$fid&format=json");
    check('…from the saved plan', strpos(json_encode($f['json']), 'Last time we planned: screen time, then building with blocks in the lounge') !== false, json_encode($f['json']));
    $r = call('POST', '/api/coach/turn.php', ['id' => $fid, 'choice' => 'It was hard']);
    check('the coach suggests one adjustment', strpos($r['body'], 'One small change') !== false, $r['body']);

    $r = $form(['action' => 'delete', 'id' => $sid]);
    check('deleting asks for the box to be ticked first', $r['location'] === '/parent-coach/my-coaching/?notice=confirm' && coach_owns($sqlite, $sid, (int) $row['parent_id']));
    $r = $form(['action' => 'delete', 'id' => $sid, 'confirm' => 'yes']);
    check('a saved conversation can be deleted, with its messages', $r['location'] === '/parent-coach/my-coaching/?notice=deleted'
        && (int) $sqlite->query("SELECT COUNT(*) FROM coach_messages WHERE session_uuid = '$sid'")->fetchColumn() === 0);
    $r = $form(['action' => 'delete', 'id' => $fid, 'confirm' => 'yes'], []);
    $other = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    $r = $form(['action' => 'delete', 'id' => $other['json']['id'], 'confirm' => 'yes']);
    check('nobody can delete a conversation that is not theirs', $r['location'] === '/parent-coach/my-coaching/?notice=not-found');
    $r = $form(['action' => 'delete-account', 'confirm' => 'yes']);
    $pid = (int) $row['parent_id'];
    check('the whole account can be deleted, with everything in it', $r['location'] === '/parent-coach/my-coaching/?notice=account-deleted'
        && (int) $sqlite->query("SELECT COUNT(*) FROM coach_parents WHERE id = $pid")->fetchColumn() === 0
        && (int) $sqlite->query("SELECT COUNT(*) FROM coach_logins WHERE parent_id = $pid")->fetchColumn() === 0
        && (int) $sqlite->query("SELECT COUNT(*) FROM coach_magic_links WHERE email = 'sam@example.com'")->fetchColumn() === 0);
    $page = call('GET', '/parent-coach/my-coaching/', [], false, [$cookie]);
    check('…and the old sign-in no longer works', strpos($page['body'], 'Send me a sign-in link') !== false);
    $r = call('POST', '/api/coach/start.php', ['restart_from' => '00000000-0000-4000-8000-000000000000'], false);
    check('without JavaScript, "Start a new conversation" from an expired one goes to a page, not code', $r['status'] === 303 && $r['location'] === '/parent-coach/start/', $r['location']);
    $r = call('POST', '/api/coach/magic-link.php', ['email' => 'nojs@example.com', 'id' => ''], false);
    check('without JavaScript, the save form goes to My coaching', $r['status'] === 303 && $r['location'] === '/parent-coach/my-coaching/?notice=sent');
    check('the daily job cannot be reached from the web', !is_file($public . '/api/coach/cron-reminders.php')
        && strpos((string) file_get_contents($public . '/lib/coach/cron-reminders.php'), "PHP_SAPI !== 'cli'") !== false);

    echo "Switched off\n";
    // A separate server with its own settings file: PHP may cache a settings file it has already
    // read for a few seconds, so a running server would not notice a change at once.
    $offFile = $tmp . '/config-off.php';
    file_put_contents($offFile, '<?php return ' . var_export($config(['enabled' => false]), true) . ';');
    $offPort = free_port();
    $procs[] = start_server(array_merge($phpCmd, ['-S', "127.0.0.1:$offPort", '-t', $public, __DIR__ . '/router.php']), $public, $env + ['PHOLOSO_CONFIG' => $offFile], $offPort);
    $base = "http://127.0.0.1:$offPort";
    $r = call('POST', '/api/coach/start.php', ['children' => [['name' => 'Ben']]]);
    check('while switched off, the coach says it is not open (503)', $r['status'] === 503 && ($r['json']['code'] ?? '') === 'unavailable');
    $r = call('GET', '/api/coach/magic-link.php?token=' . str_repeat('a', 64), [], false);
    check('while switched off, a link from an email goes to the coach page, not code', $r['status'] === 303 && $r['location'] === '/parent-coach/', $r['status'] . ' ' . $r['location']);
    $r = call('GET', '/coach-health.php', [], false);
    check('the health check lists what is missing, without secrets', strpos($r['body'], 'NOT OK  Coach switched on') !== false && strpos($r['body'], 'test-secret') === false
        && strpos($r['body'], 'OK      Database connection') !== false, $r['body']);
} finally {
    foreach ($procs as $p) {
        proc_terminate($p);
    }
}

echo "\n$count checks, $failures failed\n";
exit($failures ? 1 : 0);
