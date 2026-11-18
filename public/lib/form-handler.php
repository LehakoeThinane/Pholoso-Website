<?php
/* Pholoso Afrika Foundation - one handler for every website form.
 *   type=contact     the contact form (/contact/)
 *   type=newsletter  update sign-ups (footer, /resources/)
 *   type=receipt     Section 18A receipt requests (/donate/)
 *
 * The server is the source of truth: src/scripts/forms.ts mirrors these rules for quick
 * feedback, but everything is checked again here. Personal data is only emailed, never
 * stored on the web server and never logged. Compatible with PHP 7.4+.
 * Success is reported only when the mail transport accepted the message. */

require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/graph-mailer.php';
require_once __DIR__ . '/rate-limiter.php';

const PAF_FALLBACK_EMAIL = 'know@pholoso.africa';

const PAF_TOPICS = [
    'general'  => 'A general question',
    'story'    => 'Sharing my story',
    'support'  => 'Support for my child or family',
    'partner'  => 'Partnering as a company or funder',
    'school'   => 'A school or educator enquiry',
    'donation' => 'A donation',
    'media'    => 'Media',
];

const PAF_DONOR_TYPES = [
    'individual' => 'An individual',
    'company'    => 'A company',
    'trust'      => 'A trust',
    'other'      => 'Other',
];

const PAF_LISTS = ['footer-signup', 'resources-signup'];

/** Maximum length of every field, in characters. Keep in step with the forms. */
const PAF_LIMITS = [
    'name' => 100, 'email' => 254, 'message' => 5000,
    'donorName' => 150, 'tradingName' => 150, 'idNumber' => 40, 'taxNumber' => 20,
    'address' => 300, 'phone' => 30, 'amount' => 20, 'reference' => 60, 'notes' => 1000,
];

/** Loads the private config from outside the web root, or returns null if missing or incomplete. */
function paf_load_config(): ?array
{
    $paths = [];
    $env = getenv('PHOLOSO_CONFIG');
    if (is_string($env) && $env !== '') {
        $paths[] = $env;
    }
    // Default: a folder beside (not inside) the web root, e.g. /home/account/pholoso-private/
    $paths[] = dirname(__DIR__, 2) . '/pholoso-private/config.php';
    foreach ($paths as $p) {
        if (!is_file($p)) {
            continue;
        }
        $cfg = include $p;
        if (!is_array($cfg)) {
            return null;
        }
        $transport = isset($cfg['transport']) ? $cfg['transport'] : 'graph';
        $required = $transport === 'mail'
            ? ['sender', 'recipient', 'salt']
            : ['tenant_id', 'client_id', 'client_secret', 'sender', 'recipient', 'salt'];
        foreach ($required as $k) {
            if (!isset($cfg[$k]) || !is_string($cfg[$k]) || trim($cfg[$k]) === '') {
                error_log('pholoso contact: configuration incomplete');
                return null;
            }
        }
        return $cfg;
    }
    return null;
}

function paf_len(string $s): int
{
    return (int) preg_match_all('/./us', $s);
}

/** One line of plain text: no control characters or line breaks (safe in headers). */
function paf_line(string $s): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s));
}

/** Multi-line text: keeps line breaks and tabs, drops other control characters. */
function paf_text(string $s): string
{
    $s = str_replace(["\r\n", "\r"], "\n", $s);
    return trim(preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', '', $s));
}

function paf_field(array $post, string $key): string
{
    $v = isset($post[$key]) && is_string($post[$key]) ? $post[$key] : '';
    // Reject invalid UTF-8 outright instead of passing it on.
    return preg_match('//u', $v) ? $v : '';
}

function paf_too_long(string $field, string $value): bool
{
    return isset(PAF_LIMITS[$field]) && paf_len($value) > PAF_LIMITS[$field];
}

function paf_valid_email(string $email): bool
{
    return $email !== '' && !paf_too_long('email', $email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/** "R 1 250,50" or "1250.50" -> "1250.50"; '' if it is not a positive amount. */
function paf_amount(string $raw): string
{
    $s = preg_replace('/\s+/u', '', $raw);
    $s = preg_replace('/^R/i', '', $s);
    if (!preg_match('/^\d{1,9}([.,]\d{1,2})?$/', $s)) {
        return '';
    }
    $s = str_replace(',', '.', $s);
    return (float) $s > 0 ? number_format((float) $s, 2, '.', '') : '';
}

/** A real calendar date (YYYY-MM-DD) that is not in the future. */
function paf_valid_date(string $s): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
        return false;
    }
    return strtotime($s . ' 00:00:00 UTC') <= time() + 86400;
}

/** Validates and normalises one submission. Returns [fields, errors]. */
function paf_validate(string $type, array $post): array
{
    $f = [];
    $e = [];
    $f['email'] = paf_line(paf_field($post, 'email'));
    if ($f['email'] === '') {
        $e['email'] = 'Enter your email address.';
    } elseif (!paf_valid_email($f['email'])) {
        $e['email'] = 'Enter a valid email address, like name@example.com.';
    }
    $consent = paf_field($post, 'consent') === 'yes';

    if ($type === 'newsletter') {
        $list = paf_field($post, 'list');
        $f['list'] = in_array($list, PAF_LISTS, true) ? $list : 'footer-signup';
        if (!$consent) {
            $e['consent'] = 'Tick the box to agree to receive emails.';
        }
        return [$f, $e];
    }

    if ($type === 'contact') {
        $topic = paf_field($post, 'topic');
        $f['topic'] = isset(PAF_TOPICS[$topic]) ? $topic : '';
        $f['name'] = paf_line(paf_field($post, 'name'));
        $f['message'] = paf_text(paf_field($post, 'message'));
        $f['guardian'] = paf_field($post, 'guardian') === 'yes';
        if ($f['topic'] === '') {
            $e['topic'] = 'Choose what your message is about.';
        }
        if (paf_too_long('name', $f['name'])) {
            $e['name'] = 'Keep your name under ' . PAF_LIMITS['name'] . ' characters.';
        }
        if ($f['message'] === '') {
            $e['message'] = 'Write your message.';
        } elseif (paf_too_long('message', $f['message'])) {
            $e['message'] = 'Keep your message under ' . PAF_LIMITS['message'] . ' characters.';
        }
        if (!$consent) {
            $e['consent'] = 'Tick the box to agree that we may use your details to reply.';
        }
        return [$f, $e];
    }

    // Section 18A receipt request
    $donorType = paf_field($post, 'donorType');
    $f['donorType'] = isset(PAF_DONOR_TYPES[$donorType]) ? $donorType : '';
    foreach (['donorName', 'tradingName', 'idNumber', 'taxNumber', 'phone', 'reference'] as $k) {
        $f[$k] = paf_line(paf_field($post, $k));
    }
    $f['address'] = paf_text(paf_field($post, 'address'));
    $f['notes'] = paf_text(paf_field($post, 'notes'));
    $f['amount'] = paf_amount(paf_field($post, 'amount'));
    $f['datePaid'] = paf_line(paf_field($post, 'datePaid'));

    if ($f['donorType'] === '') {
        $e['donorType'] = 'Choose who made the donation.';
    }
    $required = [
        'donorName' => 'Enter the full or registered name.',
        'idNumber'  => 'Enter the ID, passport or registration number.',
        'address'   => 'Enter the address.',
        'phone'     => 'Enter a phone number.',
        'reference' => 'Enter the payment reference you used.',
    ];
    foreach ($required as $k => $msg) {
        if ($f[$k] === '') {
            $e[$k] = $msg;
        }
    }
    foreach (['donorName', 'tradingName', 'idNumber', 'taxNumber', 'address', 'phone', 'reference', 'notes'] as $k) {
        if (!isset($e[$k]) && paf_too_long($k, $f[$k])) {
            $e[$k] = 'Keep this under ' . PAF_LIMITS[$k] . ' characters.';
        }
    }
    if (!isset($e['phone']) && !preg_match('/^[0-9 +()\-]{7,30}$/', $f['phone'])) {
        $e['phone'] = 'Enter a phone number using numbers, spaces and + only.';
    }
    if ($f['taxNumber'] !== '' && !isset($e['taxNumber']) && !preg_match('/^[0-9 ]{1,20}$/', $f['taxNumber'])) {
        $e['taxNumber'] = 'Enter the income tax number using numbers only.';
    }
    if (paf_field($post, 'amount') === '') {
        $e['amount'] = 'Enter the amount you donated.';
    } elseif ($f['amount'] === '') {
        $e['amount'] = 'Enter the amount in rand, like 500 or 1250.50.';
    }
    if ($f['datePaid'] === '') {
        $e['datePaid'] = 'Enter the date you paid.';
    } elseif (!paf_valid_date($f['datePaid'])) {
        $e['datePaid'] = 'Enter a real date that is not in the future.';
    }
    if (!$consent) {
        $e['consent'] = 'Tick the box to agree that we may use these details for your receipt.';
    }
    return [$f, $e];
}

/** Builds [subject, body, replyName] for the Foundation's inbox. */
function paf_compose(string $type, array $f, string $when): array
{
    if ($type === 'newsletter') {
        $where = $f['list'] === 'resources-signup' ? 'the Resources page (notify me about guides)' : 'the website footer';
        return [
            'Updates sign-up from the website',
            "Please add this address to the Foundation's updates list.\n\n"
            . "Email: {$f['email']}\n"
            . "Signed up on: $where\n"
            . "Consent to receive updates: given on $when.\n",
            '',
        ];
    }
    if ($type === 'contact') {
        $topic = PAF_TOPICS[$f['topic']];
        return [
            'Website message: ' . $topic,
            "Message from the website contact form\n\n"
            . 'Topic: ' . $topic . "\n"
            . 'Name: ' . ($f['name'] !== '' ? $f['name'] : '(not given)') . "\n"
            . "Email: {$f['email']}\n"
            . "Consent to use these details to reply: given on $when\n"
            . 'Parent or guardian confirmation (if about a child): ' . ($f['guardian'] ? 'given' : 'not given') . "\n\n"
            . "Message:\n{$f['message']}\n",
            $f['name'],
        ];
    }
    $show = function (string $v): string {
        return $v !== '' ? $v : '(not given)';
    };
    return [
        'Section 18A receipt request: ' . $f['donorName'],
        "Section 18A receipt request from the website\n\n"
        . 'Donor type: ' . PAF_DONOR_TYPES[$f['donorType']] . "\n"
        . "Full or registered name: {$f['donorName']}\n"
        . 'Trading name: ' . $show($f['tradingName']) . "\n"
        . "ID, passport or registration number: {$f['idNumber']}\n"
        . 'Income tax number: ' . $show($f['taxNumber']) . "\n"
        . "Address:\n{$f['address']}\n"
        . "Email: {$f['email']}\n"
        . "Phone: {$f['phone']}\n"
        . "Amount: R {$f['amount']}\n"
        . "Date paid: {$f['datePaid']}\n"
        . "Payment reference: {$f['reference']}\n"
        . "Notes:\n" . $show($f['notes']) . "\n\n"
        . "Consent to issue the receipt and report it to SARS: given on $when\n\n"
        . "NEXT STEPS FOR STAFF\n"
        . "1. Match this request to the payment in the bank account.\n"
        . "2. Issue a Section 18A receipt with a unique receipt number.\n"
        . "3. Include the receipt in the next IT3(d) submission to SARS.\n",
        $f['donorName'],
    ];
}

/**
 * Handles one POST. Returns [httpStatus, payload], where payload has
 * ok (bool), code (string), message (string) and errors (field => message).
 *
 * @param callable|null $mailerFactory fn(array $cfg, string $storage): PafMailer (for tests)
 */
function paf_handle(array $post, string $ip, ?array $cfg, ?callable $mailerFactory = null): array
{
    $fail = 'We could not send your form. Please try again later, or email ' . PAF_FALLBACK_EMAIL . '.';
    $type = paf_field($post, 'type');
    if (!in_array($type, ['contact', 'newsletter', 'receipt'], true)) {
        return [400, ['ok' => false, 'code' => 'bad_request', 'message' => $fail, 'errors' => []]];
    }

    // Honeypot: a hidden field people never see. Answer without detail.
    if (paf_field($post, 'website') !== '') {
        return [400, ['ok' => false, 'code' => 'blocked', 'message' => $fail, 'errors' => []]];
    }
    // Sent by the form script: a submission faster than a person could type is a bot.
    $min = isset($cfg['min_seconds']) ? (float) $cfg['min_seconds'] : 3.0;
    $elapsed = paf_field($post, 'elapsed');
    if ($elapsed !== '' && (!is_numeric($elapsed) || (float) $elapsed < $min)) {
        return [400, ['ok' => false, 'code' => 'too_fast', 'message' => $fail, 'errors' => []]];
    }

    list($fields, $errors) = paf_validate($type, $post);
    if ($errors) {
        return [422, ['ok' => false, 'code' => 'invalid', 'message' => 'Please check your answers.', 'errors' => $errors]];
    }

    // Not set up yet: fail honestly.
    if ($cfg === null) {
        error_log('pholoso contact: not configured');
        return [503, ['ok' => false, 'code' => 'not_configured', 'message' => $fail, 'errors' => []]];
    }

    $storage = isset($cfg['storage_dir']) ? rtrim((string) $cfg['storage_dir'], '/\\') : sys_get_temp_dir() . '/pholoso-contact';
    if (!is_dir($storage) && !@mkdir($storage, 0700, true) && !is_dir($storage)) {
        error_log('pholoso contact: storage unavailable');
        return [503, ['ok' => false, 'code' => 'storage_unavailable', 'message' => $fail, 'errors' => []]];
    }
    $rl = isset($cfg['rate_limit']) && is_array($cfg['rate_limit']) ? $cfg['rate_limit'] : [];
    $limiter = new RateLimiter(
        $storage . '/ratelimit',
        (string) $cfg['salt'],
        (int) (isset($rl['max']) ? $rl['max'] : 5),
        (int) (isset($rl['window']) ? $rl['window'] : 600)
    );
    if (!$limiter->allow($ip)) {
        if (!$limiter->storageAvailable()) {
            return [503, ['ok' => false, 'code' => 'storage_unavailable', 'message' => $fail, 'errors' => []]];
        }
        return [429, ['ok' => false, 'code' => 'rate_limited', 'errors' => [],
            'message' => 'You have sent several forms in a short time. Please wait 10 minutes and try again, or email ' . PAF_FALLBACK_EMAIL . '.']];
    }

    // Deployment smoke test (tools/smoke-test.sh): everything above ran, nothing is sent.
    if (paf_field($post, 'test') === 'TEST') {
        return [200, ['ok' => true, 'code' => 'test', 'message' => 'Test received. Nothing was sent.', 'errors' => []]];
    }

    list($subject, $body, $replyName) = paf_compose($type, $fields, gmdate('Y-m-d H:i') . ' UTC');
    if (paf_len($subject) > 150) {
        $subject = implode('', array_slice(preg_split('//u', $subject, -1, PREG_SPLIT_NO_EMPTY), 0, 147)) . '...';
    }

    $mailer = $mailerFactory ? $mailerFactory($cfg, $storage) : paf_mailer($cfg, $storage);
    if (!$mailer->send((string) $cfg['recipient'], paf_line($subject), $body, $fields['email'], paf_line($replyName))) {
        return [502, ['ok' => false, 'code' => 'send_failed', 'message' => $fail, 'errors' => []]];
    }

    $done = [
        'contact'    => 'Thank you. Your message was sent. We will reply by email.',
        'newsletter' => 'Thank you. You are signed up for updates.',
        'receipt'    => 'Thank you. Your receipt request was sent. We will email your receipt once we have matched your payment.',
    ];
    return [200, ['ok' => true, 'code' => 'sent', 'message' => $done[$type], 'errors' => []]];
}

/**
 * Same-origin check for script (JSON) submissions: the Origin header, or failing that the
 * Referer, must name this site. Plain form posts from browsers without JavaScript are
 * still accepted; the honeypot and rate limit protect them.
 */
function paf_same_origin(array $server): bool
{
    $host = isset($server['HTTP_HOST']) ? strtolower((string) $server['HTTP_HOST']) : '';
    $source = '';
    if (!empty($server['HTTP_ORIGIN'])) {
        $source = (string) $server['HTTP_ORIGIN'];
    } elseif (!empty($server['HTTP_REFERER'])) {
        $source = (string) $server['HTTP_REFERER'];
    }
    if ($host === '' || $source === '') {
        return false;
    }
    $parts = parse_url($source);
    if (!is_array($parts) || empty($parts['host'])) {
        return false;
    }
    $origin = strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
    return $origin === $host;
}

/** Where to send a browser without JavaScript after a failed submit: back to the form. */
function paf_error_location(array $server, string $formId): string
{
    $path = '/contact/';
    $referer = isset($server['HTTP_REFERER']) ? (string) $server['HTTP_REFERER'] : '';
    $host = isset($server['HTTP_HOST']) ? strtolower((string) $server['HTTP_HOST']) : '';
    $parts = $referer !== '' ? parse_url($referer) : false;
    if (is_array($parts) && !empty($parts['host']) && isset($parts['path'])) {
        $origin = strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
        if ($origin === $host && preg_match('#^/[a-z0-9/_-]*$#i', $parts['path'])) {
            $path = $parts['path'];
        }
    }
    $fragment = preg_match('/^[a-z0-9-]{1,40}$/', $formId) ? '#' . $formId . '-failed' : '';
    return $path . '?error=1' . $fragment;
}
