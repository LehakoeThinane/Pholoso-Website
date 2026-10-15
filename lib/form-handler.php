<?php
/* Pholoso Afrika Foundation - contact and newsletter-request form handling.
 * Validates input, applies spam checks and rate limiting, and sends through
 * Microsoft 365. Success is reported only when Microsoft accepts the message.
 * Message bodies and personal data are never logged. */

require_once __DIR__ . '/graph-mailer.php';
require_once __DIR__ . '/rate-limiter.php';

const PAF_FALLBACK_EMAIL = 'know@pholoso.africa';

const PAF_ROLES = [
    'Parent or caregiver',
    'Person with autism or neurodivergent',
    'Educator or school',
    'Corporate or partner',
    'Donor or funder',
    'Researcher or specialist',
];

const PAF_LIMITS = ['name' => 100, 'email' => 254, 'message' => 5000];

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
        if (is_file($p)) {
            $cfg = include $p;
            if (!is_array($cfg)) {
                return null;
            }
            foreach (['tenant_id', 'client_id', 'client_secret', 'sender', 'recipient'] as $k) {
                if (empty($cfg[$k])) {
                    return null;
                }
            }
            return $cfg;
        }
    }
    return null;
}

function paf_len(string $s): int
{
    return (int) preg_match_all('/./us', $s);
}

/** One line of plain text: no control characters, so it is safe in a subject or header. */
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

/**
 * Handles one POST. Returns [httpStatus, payload] where payload has
 * ok (bool), code (string), message (string) and errors (field => message).
 */
function paf_handle(array $post, string $ip, ?array $cfg): array
{
    $fail = 'We couldn\'t send your message. Please email ' . PAF_FALLBACK_EMAIL . ' directly.';
    $kind = paf_field($post, 'kind') === 'newsletter' ? 'newsletter' : 'contact';

    // Honeypot: a hidden field people never see. Answer honestly, without detail.
    if (paf_field($post, 'website') !== '') {
        return [400, ['ok' => false, 'code' => 'blocked', 'message' => $fail, 'errors' => []]];
    }

    // Time-to-submit: the page's script records how long the form was open.
    $min     = isset($cfg['min_seconds']) ? (float) $cfg['min_seconds'] : 3.0;
    $elapsed = paf_field($post, 'elapsed');
    if (!is_numeric($elapsed) || (float) $elapsed < $min) {
        return [400, ['ok' => false, 'code' => 'too_fast', 'message' => $fail, 'errors' => []]];
    }

    $errors = [];
    $email  = paf_line(paf_field($post, 'email'));
    if ($email !== '' && (paf_len($email) > PAF_LIMITS['email'] || !filter_var($email, FILTER_VALIDATE_EMAIL))) {
        $errors['email'] = 'Please enter a valid email address, like name@example.com.';
    }

    if ($kind === 'newsletter') {
        if ($email === '') {
            $errors['email'] = 'Please enter your email address.';
        }
        if (paf_field($post, 'consent_updates') !== '1') {
            $errors['consent_updates'] = 'Please confirm you would like to receive updates.';
        }
    } else {
        $name    = paf_line(paf_field($post, 'name'));
        $role    = paf_line(paf_field($post, 'role'));
        $message = paf_text(paf_field($post, 'message'));
        if (paf_len($name) > PAF_LIMITS['name']) {
            $errors['name'] = 'Please keep your name under ' . PAF_LIMITS['name'] . ' characters.';
        }
        if ($role !== '' && !in_array($role, PAF_ROLES, true)) {
            $errors['role'] = 'Please choose an option from the list.';
        }
        if ($message === '') {
            $errors['message'] = 'Please write your message.';
        } elseif (paf_len($message) > PAF_LIMITS['message']) {
            $errors['message'] = 'Please keep your message under ' . PAF_LIMITS['message'] . ' characters.';
        }
        if (paf_field($post, 'consent_popia') !== '1') {
            $errors['consent_popia'] = 'Please confirm you understand how we handle your message.';
        }
        if (paf_field($post, 'consent_guardian') !== '1') {
            $errors['consent_guardian'] = 'Please confirm the statement about children.';
        }
    }

    if ($errors) {
        return [400, ['ok' => false, 'code' => 'invalid', 'message' => 'Please check the highlighted fields.', 'errors' => $errors]];
    }

    // Not set up yet (no Microsoft 365 credentials): fail honestly.
    if ($cfg === null) {
        error_log('pholoso contact: not configured');
        return [503, ['ok' => false, 'code' => 'not_configured', 'message' => $fail, 'errors' => []]];
    }

    $storage = isset($cfg['storage_dir']) ? rtrim((string) $cfg['storage_dir'], '/\\') : sys_get_temp_dir() . '/pholoso-contact';
    if (!is_dir($storage)) {
        @mkdir($storage, 0700, true);
    }
    $rl = isset($cfg['rate_limit']) && is_array($cfg['rate_limit']) ? $cfg['rate_limit'] : [];
    $limiter = new RateLimiter(
        $storage . '/ratelimit',
        (string) (isset($cfg['salt']) ? $cfg['salt'] : ''),
        (int) (isset($rl['max']) ? $rl['max'] : 5),
        (int) (isset($rl['window']) ? $rl['window'] : 3600)
    );
    if (!$limiter->allow($ip)) {
        return [429, ['ok' => false, 'code' => 'rate_limited', 'errors' => [],
            'message' => 'You have sent several messages in a short time. Please try again later, or email ' . PAF_FALLBACK_EMAIL . ' directly.']];
    }

    $when = gmdate('Y-m-d H:i') . ' UTC';
    if ($kind === 'newsletter') {
        $subject = 'Updates sign-up request from the website';
        $body    = "Please add this address to the Foundation's updates list.\n\n"
                 . "Email: $email\n"
                 . "Consent to receive updates: given on $when via the website footer.\n";
        $replyName = '';
    } else {
        $subject = 'Website enquiry from ' . ($name !== '' ? $name : 'a visitor');
        $body    = "Enquiry from the website contact form\n\n"
                 . 'Name: ' . ($name !== '' ? $name : '(not given)') . "\n"
                 . 'Email: ' . ($email !== '' ? $email : '(not given, so we cannot reply)') . "\n"
                 . 'I am a: ' . ($role !== '' ? $role : '(not chosen)') . "\n"
                 . "POPIA notice accepted: yes ($when)\n"
                 . "Guardian statement confirmed: yes\n\n"
                 . "Message:\n$message\n";
        $replyName = $name;
    }
    // Keep the subject short; it is built from plain one-line text only.
    if (paf_len($subject) > 150) {
        $subject = implode('', array_slice(preg_split('//u', $subject, -1, PREG_SPLIT_NO_EMPTY), 0, 147)) . '...';
    }

    $mailer = new GraphMailer($cfg, $storage);
    if (!$mailer->send((string) $cfg['recipient'], $subject, $body, $email, $replyName)) {
        return [502, ['ok' => false, 'code' => 'send_failed', 'message' => $fail, 'errors' => []]];
    }

    $done = $kind === 'newsletter'
        ? 'Thank you. We have received your request and will add you to our updates.'
        : 'Thank you. Your message has been sent. We will reply within a few working days.';
    return [200, ['ok' => true, 'code' => 'sent', 'message' => $done, 'errors' => []]];
}
