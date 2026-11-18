<?php
/* Pholoso Afrika Foundation - how form emails are delivered.
 * The forms never know which transport is used. Choose one in the private config
 * ('transport' => 'graph' or 'mail'); add another (SMTP relay, an email API) by writing a
 * class that implements PafMailer and adding it to paf_mailer().
 * Compatible with PHP 7.4+. */

interface PafMailer
{
    /** Returns true only when the message was accepted for delivery. */
    public function send(string $to, string $subject, string $text, string $replyTo = '', string $replyName = ''): bool;
}

/**
 * PHP mail(), through the host's local mail system.
 * Note: on the current hosting, mail sent this way may be rejected or quarantined by the
 * domain's own SPF/DMARC policy (docs/m365-setup.md). Microsoft 365 is the default.
 */
final class PhpMailMailer implements PafMailer
{
    private $from;
    private $fromName;
    /** @var callable */
    private $mailFunction;

    /** @param callable|null $mailFunction replaces mail() in tests */
    public function __construct(string $from, string $fromName, ?callable $mailFunction = null)
    {
        $this->from = paf_header_value($from);
        $this->fromName = paf_header_value($fromName);
        $this->mailFunction = $mailFunction ?: 'mail';
    }

    public function send(string $to, string $subject, string $text, string $replyTo = '', string $replyName = ''): bool
    {
        $headers = [
            'From: ' . paf_address($this->from, $this->fromName),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];
        if ($replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers[] = 'Reply-To: ' . paf_address(paf_header_value($replyTo), paf_header_value($replyName));
        }
        $text = str_replace("\n", "\r\n", str_replace(["\r\n", "\r"], "\n", $text));
        $ok = (bool) call_user_func(
            $this->mailFunction,
            paf_header_value($to),
            paf_encode_header(paf_header_value($subject)),
            $text,
            implode("\r\n", $headers),
            '-f' . $this->from
        );
        if (!$ok) {
            error_log('pholoso contact: mail() refused the message');
        }
        return $ok;
    }
}

/** Removes anything that could start a new header line (header injection). */
function paf_header_value(string $s): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s));
}

/** RFC 2047 encoding for non-ASCII header text (subjects and display names). */
function paf_encode_header(string $s): string
{
    if (!preg_match('/[^\x20-\x7E]/', $s)) {
        return $s;
    }
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

function paf_address(string $email, string $name = ''): string
{
    if ($name === '') {
        return $email;
    }
    $display = preg_match('/[^\x20-\x7E]/', $name)
        ? paf_encode_header($name)
        : '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $name) . '"';
    return $display . ' <' . $email . '>';
}

/** Builds the configured transport. */
function paf_mailer(array $cfg, string $storageDir): PafMailer
{
    $transport = isset($cfg['transport']) ? (string) $cfg['transport'] : 'graph';
    if ($transport === 'mail') {
        return new PhpMailMailer((string) $cfg['sender'], 'Pholoso Afrika Foundation website');
    }
    return new GraphMailer($cfg, $storageDir);
}
