<?php
/* Tests for the contact form handler. Standard library only.
 * Run from the site folder:  php tests/php/contact-test.php
 * Starts two local PHP servers: a mock of Microsoft's endpoints, and the site
 * itself (to test contact.php over HTTP). Exits non-zero on any failure. */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$root = dirname(__DIR__, 2);
require $root . '/lib/form-handler.php';

$tmp = sys_get_temp_dir() . '/pholoso-test-' . bin2hex(random_bytes(4));
mkdir($tmp, 0700, true);
$mailLog  = $tmp . '/graph-requests.log';
$errorLog = $tmp . '/php-error.log';
touch($mailLog);
ini_set('log_errors', '1');
ini_set('error_log', $errorLog);
putenv('MOCK_GRAPH_LOG=' . $mailLog);

$php = PHP_BINARY;
$failures = 0;
$count = 0;

function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures, $count;
    $count++;
    if ($ok) {
        echo "  ok   $name\n";
    } else {
        $failures++;
        echo "  FAIL $name" . ($detail !== '' ? " -- $detail" : '') . "\n";
    }
}

function free_port(): int
{
    $s = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int) substr(strrchr(stream_socket_get_name($s, false), ':'), 1);
    fclose($s);
    return $port;
}

function start_server(string $php, int $port, string $docroot, string $router, array $env)
{
    $cmd = [$php, '-S', "127.0.0.1:$port", '-t', $docroot];
    if ($router !== '') {
        $cmd[] = $router;
    }
    $null = stripos(PHP_OS, 'WIN') === 0 ? 'NUL' : '/dev/null';
    $proc = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['file', $null, 'w'], 2 => ['file', $null, 'w']], $pipes, $docroot, $env);
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

function last_mail(string $log): ?array
{
    $lines = array_filter(explode("\n", (string) file_get_contents($log)));
    return $lines ? json_decode(end($lines), true) : null;
}

function mail_count(string $log): int
{
    return count(array_filter(explode("\n", (string) file_get_contents($log))));
}

$mockPort = free_port();
$env = array_merge(getenv(), ['MOCK_GRAPH_LOG' => $mailLog]);
$mock = start_server($php, $mockPort, __DIR__, __DIR__ . '/mock-graph.php', $env);

$base = function (array $over = []) use ($tmp, $mockPort) {
    return array_merge([
        'tenant_id'     => 'test-tenant',
        'client_id'     => 'test-client',
        'client_secret' => 'test-secret',
        'sender'        => 'website@pholoso.africa',
        'recipient'     => 'know@pholoso.africa',
        'storage_dir'   => $tmp . '/storage-' . bin2hex(random_bytes(3)),
        'salt'          => 'test-salt',
        'rate_limit'    => ['max' => 5, 'window' => 3600],
        'min_seconds'   => 3,
        'login_base'    => "http://127.0.0.1:$mockPort",
        'graph_base'    => "http://127.0.0.1:$mockPort",
    ], $over);
};

$valid = [
    'name' => 'Thandi Test', 'email' => 'thandi@example.com', 'role' => 'Parent or caregiver',
    'message' => "Hello,\nI would like to know more. SECRET-BODY-MARKER",
    'consent_popia' => '1', 'consent_guardian' => '1', 'website' => '', 'elapsed' => '12.5',
];

try {
    echo "Validation and spam checks\n";
    list($st, $p) = paf_handle($valid, '203.0.113.5', null);
    check('no config: honest failure, 503', $st === 503 && $p['code'] === 'not_configured' && !$p['ok']);
    check('no config: message offers the email address', strpos($p['message'], 'know@pholoso.africa') !== false);

    list($st, $p) = paf_handle(array_merge($valid, ['website' => 'http://spam']), '203.0.113.5', $base());
    check('honeypot filled: blocked, not a fake success', $st === 400 && !$p['ok'] && $p['code'] === 'blocked');

    list($st, $p) = paf_handle(array_merge($valid, ['elapsed' => '1']), '203.0.113.5', $base());
    check('submitted too fast: blocked', $st === 400 && $p['code'] === 'too_fast');
    $noTime = $valid;
    unset($noTime['elapsed']);
    list($st, $p) = paf_handle($noTime, '203.0.113.5', $base());
    check('missing time-to-submit: blocked', $st === 400 && $p['code'] === 'too_fast');

    list($st, $p) = paf_handle(['elapsed' => '9'], '203.0.113.5', $base());
    check('empty form: message and both consents required',
        $p['code'] === 'invalid' && isset($p['errors']['message'], $p['errors']['consent_popia'], $p['errors']['consent_guardian']));

    list($st, $p) = paf_handle(array_merge($valid, ['consent_guardian' => '']), '203.0.113.5', $base());
    check('guardian consent enforced on the server', isset($p['errors']['consent_guardian']) && count($p['errors']) === 1);

    list($st, $p) = paf_handle(array_merge($valid, ['email' => "a@b.com\r\nBcc: victim@example.com"]), '203.0.113.5', $base());
    check('email with header injection rejected', isset($p['errors']['email']));

    list($st, $p) = paf_handle(array_merge($valid, ['role' => 'Hacker']), '203.0.113.5', $base());
    check('role outside the list rejected', isset($p['errors']['role']));

    list($st, $p) = paf_handle(array_merge($valid, ['message' => str_repeat('a', 5001)]), '203.0.113.5', $base());
    check('message over 5000 characters rejected', isset($p['errors']['message']));

    list($st, $p) = paf_handle(array_merge($valid, ['name' => str_repeat('n', 101)]), '203.0.113.5', $base());
    check('name over 100 characters rejected', isset($p['errors']['name']));

    list($st, $p) = paf_handle(array_merge($valid, ['message' => "bad \xC3\x28 utf8"]), '203.0.113.5', $base());
    check('invalid UTF-8 treated as empty', isset($p['errors']['message']));

    echo "Delivery through the Graph mock\n";
    $before = mail_count($mailLog);
    list($st, $p) = paf_handle(array_merge($valid, ['name' => "Bob\r\nBcc: victim@example.com"]), '203.0.113.6', $base());
    $m = last_mail($mailLog);
    check('valid enquiry: success only after Graph accepts it', $st === 200 && $p['ok'] && mail_count($mailLog) === $before + 1, json_encode($p));
    check('uses a bearer token, no password', $m && $m['auth'] === 'Bearer test-token');
    check('sent from the configured mailbox', $m && $m['sender'] === 'website@pholoso.africa');
    check('delivered to the recipient', $m && $m['body']['message']['toRecipients'][0]['emailAddress']['address'] === 'know@pholoso.africa');
    check('visitor email in Reply-To, not From', $m && $m['body']['message']['replyTo'][0]['emailAddress']['address'] === 'thandi@example.com' && !isset($m['body']['message']['from']));
    $subject = $m ? $m['body']['message']['subject'] : '';
    check('subject has no CR/LF (header injection stripped)', $subject !== '' && strpbrk($subject, "\r\n") === false, $subject);
    check('message body kept with line breaks', $m && strpos($m['body']['message']['body']['content'], "Hello,\nI would like") !== false);

    list($st, $p) = paf_handle(array_merge($valid, ['email' => '', 'name' => '']), '203.0.113.7', $base());
    $m = last_mail($mailLog);
    check('no email given: sends without Reply-To', $st === 200 && !isset($m['body']['message']['replyTo']));

    list($st, $p) = paf_handle($valid, '203.0.113.8', $base(['sender' => 'fail@pholoso.africa']));
    check('Graph error: honest failure, 502', $st === 502 && !$p['ok'] && $p['code'] === 'send_failed');

    list($st, $p) = paf_handle($valid, '203.0.113.9', $base(['tenant_id' => 'bad-tenant']));
    check('token refused: honest failure', $st === 502 && !$p['ok']);

    echo "Rate limiting\n";
    $cfg = $base(['rate_limit' => ['max' => 2, 'window' => 3600]]);
    $codes = [];
    for ($i = 0; $i < 3; $i++) {
        list($st) = paf_handle($valid, '198.51.100.1', $cfg);
        $codes[] = $st;
    }
    check('third message in the window is refused with 429', $codes === [200, 200, 429], implode(',', $codes));
    list($st) = paf_handle($valid, '198.51.100.2', $cfg);
    check('another visitor is not affected', $st === 200);
    $files = glob($cfg['storage_dir'] . '/ratelimit/*.json');
    $stored = implode('', array_map('file_get_contents', $files)) . implode('', $files);
    check('IP address is not stored in rate-limit files', strpos($stored, '198.51.100') === false && count($files) === 2);

    echo "Updates sign-up\n";
    list($st, $p) = paf_handle(['kind' => 'newsletter', 'email' => 'reader@example.com', 'consent_updates' => '1', 'elapsed' => '5'], '203.0.113.10', $base());
    $m = last_mail($mailLog);
    check('sign-up request is sent with consent noted', $st === 200 && strpos($m['body']['message']['body']['content'], 'Consent to receive updates: given') !== false);
    list($st, $p) = paf_handle(['kind' => 'newsletter', 'email' => 'reader@example.com', 'elapsed' => '5'], '203.0.113.10', $base());
    check('sign-up without consent is refused', isset($p['errors']['consent_updates']));
    list($st, $p) = paf_handle(['kind' => 'newsletter', 'consent_updates' => '1', 'elapsed' => '5'], '203.0.113.10', $base());
    check('sign-up without email is refused', isset($p['errors']['email']));

    echo "Logging\n";
    $logged = (string) @file_get_contents($errorLog);
    check('errors were logged (status codes only)', strpos($logged, 'HTTP 500') !== false);
    check('no message body or email address in the logs', strpos($logged, 'SECRET-BODY-MARKER') === false && strpos($logged, 'thandi@example.com') === false);

    echo "contact.php over HTTP\n";
    $cfgFile = $tmp . '/config.php';
    file_put_contents($cfgFile, '<?php return ' . var_export($base(), true) . ';');
    $sitePort = free_port();
    $site = start_server($php, $sitePort, $root, '', array_merge($env, ['PHOLOSO_CONFIG' => $cfgFile]));
    $post = function (array $fields, string $accept) use ($sitePort) {
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'ignore_errors' => true, 'timeout' => 15,
            'header' => "Content-Type: application/x-www-form-urlencoded\r\nAccept: $accept",
            'content' => http_build_query($fields),
        ]]);
        $body = file_get_contents("http://127.0.0.1:$sitePort/contact.php", false, $ctx);
        preg_match('#\s(\d{3})\s#', $http_response_header[0] . ' ', $mm);
        return [(int) $mm[1], $body, implode("\n", $http_response_header)];
    };
    list($st, $body) = $post($valid, 'application/json');
    $j = json_decode($body, true);
    check('JSON response for the page script', $st === 200 && $j && $j['ok'] === true, "$st $body");
    list($st, $body) = $post(array_merge($valid, ['message' => '']), 'text/html');
    check('plain HTML page without JavaScript', $st === 400 && strpos($body, 'Your message was not sent') !== false && strpos($body, 'mailto:know@pholoso.africa') !== false);
    list($st, $body, $hdrs) = $post(array_merge($valid, ['name' => '<script>alert(1)</script>', 'role' => '<b>x</b>']), 'text/html');
    check('HTML page escapes output', strpos($body, '<b>x</b>') === false && strpos($body, '<script>alert') === false);
    $get = @file_get_contents("http://127.0.0.1:$sitePort/contact.php", false, stream_context_create(['http' => ['ignore_errors' => true]]));
    check('GET is refused with 405', strpos($http_response_header[0], '405') !== false);
    check('responses are not cached or indexed', stripos($hdrs, 'Cache-Control: no-store') !== false && stripos($hdrs, 'X-Robots-Tag: noindex') !== false);
    proc_terminate($site);
} catch (Throwable $e) {
    $failures++;
    echo '  FAIL exception: ' . $e->getMessage() . "\n";
}

proc_terminate($mock);
echo "\n$count checks, $failures failed\n";
exit($failures === 0 ? 0 : 1);
