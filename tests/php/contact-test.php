<?php
/* Tests for the form handler (public/contact.php and public/lib/). Standard library only.
 * Run from the repository root:  php tests/php/contact-test.php
 * Starts local PHP servers: a mock of Microsoft's endpoints, and public/ itself.
 * Exits non-zero on any failure. */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$root = dirname(__DIR__, 2);
$public = $root . '/public';
require $public . '/lib/form-handler.php';

$tmp = sys_get_temp_dir() . '/pholoso-test-' . bin2hex(random_bytes(4));
mkdir($tmp, 0700, true);
$graphLog = $tmp . '/graph-requests.log';
touch($graphLog);
ini_set('log_errors', '1');
ini_set('error_log', $tmp . '/php-error.log');
putenv('MOCK_GRAPH_LOG=' . $graphLog);

$failures = 0;
$count = 0;
$isWindows = stripos(PHP_OS, 'WIN') === 0;

function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures, $count;
    $count++;
    echo ($ok ? '  ok   ' : '  FAIL ') . $name . (!$ok && $detail !== '' ? " -- $detail" : '') . "\n";
    if (!$ok) {
        $failures++;
    }
}

/** Collects messages instead of sending them. */
final class CaptureMailer implements PafMailer
{
    public $sent = [];
    public $accept = true;

    public function send(string $to, string $subject, string $text, string $replyTo = '', string $replyName = ''): bool
    {
        $this->sent[] = compact('to', 'subject', 'text', 'replyTo', 'replyName');
        return $this->accept;
    }
}

$cfgFor = function (string $dir, array $over = []) {
    return array_merge([
        'transport' => 'graph', 'tenant_id' => 't', 'client_id' => 'c', 'client_secret' => 's',
        'sender' => 'website@pholoso.africa', 'recipient' => 'know@pholoso.africa',
        'storage_dir' => $dir, 'salt' => 'test-salt', 'rate_limit' => ['max' => 5, 'window' => 600],
    ], $over);
};

$contact = [
    'type' => 'contact', 'form' => 'contact-form', 'topic' => 'general', 'name' => 'Test Person',
    'email' => 'person@example.com', 'message' => "Hello\nSecond line", 'consent' => 'yes', 'website' => '',
];
$newsletter = ['type' => 'newsletter', 'form' => 'footer-signup', 'email' => 'reader@example.com', 'consent' => 'yes', 'list' => 'footer-signup'];
$receipt = [
    'type' => 'receipt', 'form' => 'receipt-form', 'donorType' => 'individual', 'donorName' => 'Test Donor',
    'tradingName' => '', 'idNumber' => '0000000000000', 'taxNumber' => '0123456789',
    'address' => "1 Example Street\nJohannesburg", 'email' => 'donor@example.com', 'phone' => '+27 11 000 0000',
    'amount' => 'R 1 250,50', 'datePaid' => gmdate('Y-m-d'), 'reference' => 'DONATE TESTDONOR', 'notes' => '', 'consent' => 'yes',
];

/** Runs the handler with a fresh storage folder and a capture mailer. */
$run = function (array $post, array $cfgOver = [], ?CaptureMailer $m = null, string $ip = '192.0.2.1') use ($tmp, $cfgFor) {
    $m = $m ?: new CaptureMailer();
    $dir = $tmp . '/s-' . bin2hex(random_bytes(3));
    $res = paf_handle($post, $ip, $cfgFor($dir, $cfgOver), function () use ($m) {
        return $m;
    });
    return [$res[0], $res[1], $m];
};

echo "Validation and spam protection\n";
list($s, $p) = $run(['type' => 'nonsense'] + $contact);
check('unknown form type is rejected', $s === 400 && $p['code'] === 'bad_request');
list($s, $p, $m) = $run(['website' => 'http://spam.example'] + $contact);
check('filled honeypot is rejected and nothing is sent', $s === 400 && $p['code'] === 'blocked' && !$m->sent);
list($s, $p, $m) = $run(['elapsed' => '0.4'] + $contact);
check('submission faster than a person is rejected', $s === 400 && $p['code'] === 'too_fast' && !$m->sent);
list($s, $p) = $run(['consent' => ''] + $contact);
check('contact: missing consent is rejected', $s === 422 && isset($p['errors']['consent']));
list($s, $p) = $run(['email' => 'not-an-email'] + $contact);
check('contact: bad email is rejected', $s === 422 && isset($p['errors']['email']));
list($s, $p) = $run(['email' => ''] + $contact);
check('contact: missing email is rejected', $s === 422 && isset($p['errors']['email']));
list($s, $p) = $run(['topic' => 'other'] + $contact);
check('contact: topic outside the list is rejected', $s === 422 && isset($p['errors']['topic']));
list($s, $p) = $run(['message' => str_repeat('a', 5001)] + $contact);
check('contact: over-long message is rejected', $s === 422 && isset($p['errors']['message']));
list($s, $p) = $run(['name' => str_repeat('é', 101)] + $contact);
check('contact: name limit counts characters, not bytes', $s === 422 && isset($p['errors']['name']));
list($s, $p) = $run(['name' => str_repeat('é', 100)] + $contact);
check('contact: 100 accented characters are allowed', $s === 200, json_encode($p));
list($s, $p) = $run(['consent' => ''] + $newsletter);
check('newsletter: missing consent is rejected', $s === 422 && isset($p['errors']['consent']));
list($s, $p) = $run(['email' => "a@b.com\r\nBcc: x@y.com"] + $newsletter);
check('newsletter: email with a line break is rejected', $s === 422 && isset($p['errors']['email']));

$bad = $run([
    'donorType' => 'robot', 'donorName' => '', 'idNumber' => '', 'address' => '', 'phone' => 'call me',
    'amount' => 'lots', 'datePaid' => '2999-01-01', 'reference' => '', 'taxNumber' => 'ABC', 'consent' => '',
] + $receipt);
$expect = ['donorType', 'donorName', 'idNumber', 'address', 'phone', 'amount', 'datePaid', 'reference', 'taxNumber', 'consent'];
check('receipt: every invalid field is reported', $bad[0] === 422 && !array_diff($expect, array_keys($bad[1]['errors'])),
    implode(',', array_keys($bad[1]['errors'])));
list($s, $p) = $run(['datePaid' => '2026-02-30'] + $receipt);
check('receipt: impossible date is rejected', $s === 422 && isset($p['errors']['datePaid']));
list($s, $p) = $run(['amount' => '0'] + $receipt);
check('receipt: zero amount is rejected', $s === 422 && isset($p['errors']['amount']));

echo "Sending\n";
list($s, $p, $m) = $run($contact);
$mail = $m->sent ? $m->sent[0] : [];
check('contact: valid message is sent', $s === 200 && $p['ok'] === true && count($m->sent) === 1);
check('contact: delivered to the Foundation, reply goes to the visitor',
    $mail && $mail['to'] === 'know@pholoso.africa' && $mail['replyTo'] === 'person@example.com' && $mail['replyName'] === 'Test Person');
check('contact: subject names the topic', $mail && $mail['subject'] === 'Website message: A general question');
check('contact: message keeps its line breaks', $mail && strpos($mail['text'], "Hello\nSecond line") !== false);

list($s, $p, $m) = $run(['name' => "Eve\r\nBcc: victim@example.com"] + $contact);
$mail = $m->sent ? $m->sent[0] : [];
check('header injection: line breaks are removed from the name',
    $mail && strpos($mail['replyName'], "\n") === false && strpos($mail['replyName'], "\r") === false);

list($s, $p, $m) = $run($receipt);
$text = $m->sent ? $m->sent[0]['text'] : '';
$fieldsShown = ['An individual', 'Test Donor', '0000000000000', '0123456789', '1 Example Street', 'donor@example.com',
    '+27 11 000 0000', 'R 1250.50', gmdate('Y-m-d'), 'DONATE TESTDONOR'];
$missing = array_filter($fieldsShown, function ($v) use ($text) {
    return strpos($text, $v) === false;
});
check('receipt: email lists every field (amount normalised)', $s === 200 && !$missing, implode(', ', $missing));
check('receipt: email reminds staff to match, issue and report (IT3(d))',
    strpos($text, 'Match this request to the payment') !== false && strpos($text, 'unique receipt number') !== false
    && strpos($text, 'IT3(d)') !== false);
check('receipt: subject names the donor', $m->sent && $m->sent[0]['subject'] === 'Section 18A receipt request: Test Donor');

list($s, $p, $m) = $run($newsletter);
check('newsletter: valid sign-up is sent', $s === 200 && count($m->sent) === 1 && strpos($m->sent[0]['text'], 'reader@example.com') !== false);

list($s, $p, $m) = $run(['test' => 'TEST'] + $contact);
check('TEST flag: accepted and nothing is sent', $s === 200 && $p['code'] === 'test' && !$m->sent);

$failing = new CaptureMailer();
$failing->accept = false;
list($s, $p) = $run($contact, [], $failing);
check('transport refusal is reported honestly', $s === 502 && $p['ok'] === false && strpos($p['message'], PAF_FALLBACK_EMAIL) !== false);

$res = paf_handle($contact, '192.0.2.1', null);
check('not configured: honest failure with the email address', $res[0] === 503 && $res[1]['code'] === 'not_configured');

echo "Rate limiting\n";
$dir = $tmp . '/rl';
$m = new CaptureMailer();
$statuses = [];
for ($i = 0; $i < 6; $i++) {
    $statuses[] = paf_handle($contact, '198.51.100.7', $cfgFor($dir), function () use ($m) {
        return $m;
    })[0];
}
check('5 submissions allowed, the 6th within 10 minutes is refused', $statuses === [200, 200, 200, 200, 200, 429], implode(',', $statuses));
$other = paf_handle($contact, '198.51.100.8', $cfgFor($dir), function () use ($m) {
    return $m;
})[0];
check('another visitor is not affected', $other === 200);
$files = glob($dir . '/ratelimit/*.json');
$stored = $files ? (string) file_get_contents($files[0]) : '';
check('rate-limit files never contain the IP address',
    $files && strpos(implode('', $files), '198.51.100') === false && strpos($stored, '198.51.100') === false);

echo "Helpers\n";
check('UTF-8 subjects are encoded', paf_encode_header('Thandi’s story') === '=?UTF-8?B?' . base64_encode('Thandi’s story') . '?=');
check('ASCII subjects are left alone', paf_encode_header('Hello') === 'Hello');
check('same origin: matching Origin accepted', paf_same_origin(['HTTP_HOST' => 'pholoso.africa', 'HTTP_ORIGIN' => 'https://pholoso.africa']));
check('same origin: other site refused', !paf_same_origin(['HTTP_HOST' => 'pholoso.africa', 'HTTP_ORIGIN' => 'https://evil.example']));
check('same origin: look-alike host refused', !paf_same_origin(['HTTP_HOST' => 'pholoso.africa', 'HTTP_ORIGIN' => 'https://pholoso.africa.evil.example']));
check('same origin: no Origin or Referer refused', !paf_same_origin(['HTTP_HOST' => 'pholoso.africa']));
check('error redirect: back to the referring page',
    paf_error_location(['HTTP_HOST' => 'pholoso.africa', 'HTTP_REFERER' => 'https://pholoso.africa/donate/'], 'receipt-form') === '/donate/?error=1#receipt-form-failed');
check('error redirect: foreign referer falls back to /contact/',
    paf_error_location(['HTTP_HOST' => 'pholoso.africa', 'HTTP_REFERER' => 'https://evil.example/x/'], 'contact-form') === '/contact/?error=1#contact-form-failed');
check('error redirect: odd form id gets no fragment',
    paf_error_location(['HTTP_HOST' => 'pholoso.africa'], '"><script>') === '/contact/?error=1');

$captured = [];
$pm = new PhpMailMailer('website@pholoso.africa', 'Pholoso Afrika Foundation website', function () use (&$captured) {
    $captured = func_get_args();
    return true;
});
$pm->send('know@pholoso.africa', "Subject\r\nBcc: x@y.com", 'Body', 'v@example.com', "Name\r\nBcc: z@y.com");
check('mail(): From, Reply-To and UTF-8 headers set',
    strpos($captured[3], 'From: "Pholoso Afrika Foundation website" <website@pholoso.africa>') !== false
    && strpos($captured[3], 'Reply-To: "Name Bcc: z@y.com" <v@example.com>') !== false
    && strpos($captured[3], 'charset=UTF-8') !== false);
check('mail(): no injected header lines', substr_count($captured[3], "\r\n") === 4 && strpos($captured[1], "\n") === false);

echo "Over HTTP (public/contact.php)\n";
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

/** @return array{status:int, headers:array, body:string} */
function request(string $url, string $method, array $post = [], array $headers = []): array
{
    $ctx = stream_context_create(['http' => [
        'method' => $method, 'ignore_errors' => true, 'follow_location' => 0, 'timeout' => 30,
        'header' => implode("\r\n", array_merge(['Content-Type: application/x-www-form-urlencoded'], $headers)),
        'content' => http_build_query($post),
    ]]);
    $body = (string) @file_get_contents($url, false, $ctx);
    $status = isset($http_response_header[0]) && preg_match('#\s(\d{3})#', $http_response_header[0], $mm) ? (int) $mm[1] : 0;
    return ['status' => $status, 'headers' => isset($http_response_header) ? $http_response_header : [], 'body' => $body];
}

function header_value(array $headers, string $name): string
{
    foreach ($headers as $h) {
        if (stripos($h, $name . ':') === 0) {
            return trim(substr($h, strlen($name) + 1));
        }
    }
    return '';
}

$php = PHP_BINARY;
$mockPort = free_port();
$sitePort = free_port();
$env = array_merge(getenv(), ['MOCK_GRAPH_LOG' => $graphLog]);
$procs = [];
$procs[] = start_server([$php, '-S', "127.0.0.1:$mockPort", __DIR__ . '/mock-graph.php'], __DIR__, $env, $mockPort);

$configFile = $tmp . '/config.php';
file_put_contents($configFile, '<?php return ' . var_export($cfgFor($tmp . '/http-storage', [
    'login_base' => "http://127.0.0.1:$mockPort", 'graph_base' => "http://127.0.0.1:$mockPort",
    'rate_limit' => ['max' => 50, 'window' => 600],
]), true) . ';');
$procs[] = start_server([$php, '-S', "127.0.0.1:$sitePort", '-t', $public], $public, $env + ['PHOLOSO_CONFIG' => $configFile], $sitePort);
$base = "http://127.0.0.1:$sitePort";
$host = "127.0.0.1:$sitePort";

try {
    $r = request("$base/contact.php", 'GET');
    check('GET is refused with 405', $r['status'] === 405);

    $before = count(file($graphLog, FILE_SKIP_EMPTY_LINES));
    $r = request("$base/contact.php", 'POST', $contact, ["Referer: $base/contact/"]);
    check('no JavaScript, valid: 303 to /thank-you/', $r['status'] === 303 && header_value($r['headers'], 'Location') === '/thank-you/',
        $r['status'] . ' ' . header_value($r['headers'], 'Location'));
    $lines = file($graphLog, FILE_SKIP_EMPTY_LINES);
    $sent = $lines ? json_decode(end($lines), true) : null;
    check('Microsoft 365 received the message (mock)', count($lines) === $before + 1 && $sent
        && $sent['sender'] === 'website@pholoso.africa'
        && $sent['body']['message']['replyTo'][0]['emailAddress']['address'] === 'person@example.com');

    $r = request("$base/contact.php", 'POST', ['consent' => ''] + $receipt, ["Referer: $base/donate/"]);
    check('no JavaScript, invalid: 303 back to the form with the error notice',
        $r['status'] === 303 && header_value($r['headers'], 'Location') === '/donate/?error=1#receipt-form-failed',
        header_value($r['headers'], 'Location'));

    $r = request("$base/contact.php", 'POST', $contact, ['Accept: application/json', 'Origin: https://evil.example']);
    check('script submission from another site: 403', $r['status'] === 403 && json_decode($r['body'], true)['code'] === 'cross_origin');

    $r = request("$base/contact.php", 'POST', $newsletter, ['Accept: application/json', "Origin: $base"]);
    $j = json_decode($r['body'], true);
    check('script submission, valid: JSON ok', $r['status'] === 200 && $j['ok'] === true, $r['body']);

    $r = request("$base/contact.php", 'POST', ['email' => 'x'] + $newsletter, ['Accept: application/json', "Origin: $base"]);
    $j = json_decode($r['body'], true);
    check('script submission, invalid: JSON field errors', $r['status'] === 422 && isset($j['errors']['email']));
    check('responses are not cached', stripos(header_value($r['headers'], 'Cache-Control'), 'no-store') !== false);
} finally {
    foreach ($procs as $p) {
        proc_terminate($p);
    }
}

if ($isWindows) {
    echo "  skip mail() through sendmail_path (not available on Windows; runs in CI)\n";
} else {
    $capture = $tmp . '/sendmail.txt';
    $mailCfg = $tmp . '/config-mail.php';
    file_put_contents($mailCfg, '<?php return ' . var_export($cfgFor($tmp . '/mail-storage', ['transport' => 'mail']), true) . ';');
    $port = free_port();
    $proc = start_server(
        [$php, '-d', 'sendmail_path=' . escapeshellarg($php) . ' ' . escapeshellarg(__DIR__ . '/sendmail-capture.php'), '-S', "127.0.0.1:$port", '-t', $public],
        $public, $env + ['PHOLOSO_CONFIG' => $mailCfg, 'SENDMAIL_CAPTURE' => $capture], $port
    );
    try {
        $r = request("http://127.0.0.1:$port/contact.php", 'POST', $contact, ['Accept: application/json', "Origin: http://127.0.0.1:$port"]);
        $raw = (string) @file_get_contents($capture);
        check('mail() transport: message handed to sendmail', $r['status'] === 200 && strpos($raw, 'Subject: Website message: A general question') !== false, $r['body']);
        check('mail() transport: Reply-To is the visitor', strpos($raw, 'Reply-To: "Test Person" <person@example.com>') !== false);
    } finally {
        proc_terminate($proc);
    }
}

echo "\n$count checks, $failures failed\n";
exit($failures ? 1 : 0);
