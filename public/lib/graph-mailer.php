<?php
/* Pholoso Afrika Foundation - send mail through Microsoft 365 (Microsoft Graph sendMail).
 * The default transport (see mailer.php).
 * Uses the OAuth client-credentials flow, so no mailbox password is stored.
 * Setup for the Microsoft 365 admin: docs/m365-setup.md
 * Compatible with PHP 7.4+. Uses cURL when available, otherwise PHP streams. */

final class GraphMailer implements PafMailer
{
    private $tenantId;
    private $clientId;
    private $clientSecret;
    private $sender;
    private $tokenCacheFile;
    private $loginBase;
    private $graphBase;

    public function __construct(array $cfg, string $storageDir)
    {
        $this->tenantId       = (string) $cfg['tenant_id'];
        $this->clientId       = (string) $cfg['client_id'];
        $this->clientSecret   = (string) $cfg['client_secret'];
        $this->sender         = (string) $cfg['sender'];
        $this->tokenCacheFile = $storageDir . '/graph-token.json';
        // Overridable only so the automated tests can point at a local mock.
        $this->loginBase = rtrim(isset($cfg['login_base']) ? $cfg['login_base'] : 'https://login.microsoftonline.com', '/');
        $this->graphBase = rtrim(isset($cfg['graph_base']) ? $cfg['graph_base'] : 'https://graph.microsoft.com', '/');
    }

    /** Returns true only when Microsoft Graph accepted the message (HTTP 202). */
    public function send(string $to, string $subject, string $text, string $replyTo = '', string $replyName = ''): bool
    {
        $token = $this->token();
        if ($token === '') {
            return false;
        }
        $message = [
            'subject'      => $subject,
            'body'         => ['contentType' => 'Text', 'content' => $text],
            'toRecipients' => [['emailAddress' => ['address' => $to]]],
        ];
        if ($replyTo !== '') {
            $addr = ['address' => $replyTo];
            if ($replyName !== '') {
                $addr['name'] = $replyName;
            }
            $message['replyTo'] = [['emailAddress' => $addr]];
        }
        $url  = $this->graphBase . '/v1.0/users/' . rawurlencode($this->sender) . '/sendMail';
        $body = json_encode(['message' => $message, 'saveToSentItems' => false]);

        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $res = self::http('POST', $url, $body, [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ]);
            if ($res['status'] === 202) {
                return true;
            }
            // A transport failure after sending may already have queued the message.
            // Only retry a definite pre-send connection failure or explicit throttling.
            if ($attempt === 1 && ($res['pre_send_failure'] || $res['status'] === 429)) {
                $delay = $res['status'] === 429 ? self::retryDelay($res['headers']) : 0;
                if ($delay !== null) {
                    if ($delay > 0) sleep($delay);
                    continue;
                }
            }
            if ($res['status'] === 0 || $res['status'] >= 500) {
                error_log('pholoso contact: send outcome uncertain; not retried');
            }
            if ($res['status'] === 401) @unlink($this->tokenCacheFile);
            break;
        }
        // Status only: never log message content or personal data.
        error_log('pholoso contact: Graph sendMail failed with HTTP ' . $res['status']);
        return false;
    }

    private function token(): string
    {
        $cached = @json_decode((string) @file_get_contents($this->tokenCacheFile), true);
        if (is_array($cached) && isset($cached['token'], $cached['expires']) && $cached['expires'] > time() + 60) {
            return (string) $cached['token'];
        }
        $res = self::http(
            'POST',
            $this->loginBase . '/' . rawurlencode($this->tenantId) . '/oauth2/v2.0/token',
            http_build_query([
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'scope'         => 'https://graph.microsoft.com/.default',
                'grant_type'    => 'client_credentials',
            ]),
            ['Content-Type: application/x-www-form-urlencoded']
        );
        $data = json_decode($res['body'], true);
        if ($res['status'] !== 200 || !is_array($data) || empty($data['access_token'])) {
            error_log('pholoso contact: token request failed with HTTP ' . $res['status']);
            return '';
        }
        $expires = time() + (int) (isset($data['expires_in']) ? $data['expires_in'] : 3600);
        if (@file_put_contents($this->tokenCacheFile, json_encode(['token' => $data['access_token'], 'expires' => $expires]), LOCK_EX) !== false) {
            @chmod($this->tokenCacheFile, 0600);
        }
        return (string) $data['access_token'];
    }

    /** Retry only short waits here; leave long waits to a later visitor attempt. */
    private static function retryDelay(array $headers): ?int
    {
        foreach ($headers as $line) {
            if (stripos($line, 'Retry-After:') !== 0) continue;
            $value = trim(substr($line, 12));
            if (ctype_digit($value)) $seconds = (float) $value;
            else {
                $date = strtotime($value);
                if ($date === false) return null;
                $seconds = max(0, $date - time());
            }
            return $seconds <= 5 ? (int) $seconds : null;
        }
        return null; // No server-provided delay: do not guess.
    }

    /** @return array{status:int, body:string, headers:array, pre_send_failure:bool} */
    private static function http(string $method, string $url, string $body, array $headers): array
    {
        if (function_exists('curl_init')) {
            $responseHeaders = [];
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_CUSTOMREQUEST  => $method,
                CURLOPT_POSTFIELDS     => $body,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT        => 20,
                CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$responseHeaders) {
                    if (stripos($line, 'HTTP/') === 0) $responseHeaders = [];
                    $responseHeaders[] = trim($line);
                    return strlen($line);
                },
            ]);
            $out    = curl_exec($ch);
            $status = $out === false ? 0 : (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            // DNS and connect failures happen before a request can be sent.
            // Timeouts and all other errors are deliberately treated as uncertain.
            $preSend = $out === false && in_array(curl_errno($ch), [CURLE_COULDNT_RESOLVE_PROXY, CURLE_COULDNT_RESOLVE_HOST, CURLE_COULDNT_CONNECT], true);
            curl_close($ch);
            return ['status' => $status, 'body' => $out === false ? '' : (string) $out,
                'headers' => $responseHeaders, 'pre_send_failure' => $preSend];
        }
        $ctx = stream_context_create(['http' => [
            'method'        => $method,
            'header'        => implode("\r\n", $headers),
            'content'       => $body,
            'timeout'       => 20,
            'ignore_errors' => true,
            'follow_location' => 0,
        ]]);
        $out    = @file_get_contents($url, false, $ctx);
        $status = 0;
        if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0] . ' ', $m)) {
            $status = (int) $m[1];
        }
        // Streams cannot reliably distinguish pre-send failures from uncertain sends.
        return ['status' => $status, 'body' => $out === false ? '' : (string) $out,
            'headers' => isset($http_response_header) ? $http_response_header : [], 'pre_send_failure' => false];
    }
}
