<?php
/* Pholoso Parent Coach - the AI provider call (Messages API over HTTPS with cURL).
 * Non-streaming: shared hosting usually buffers output, so the page shows "thinking" instead.
 * The API key is read from the private config only and is never sent to the browser.
 * Tests point 'api_url' at a local mock (tests/php/mock-ai.php); CI never calls the real API. */

/**
 * Sends one request. Returns ['ok' => true, 'text' => '...', 'usage' => [...]] or
 * ['ok' => false, 'error' => 'timeout' | 'http' | 'refusal' | 'network' | 'format'].
 * 'maybe_charged' => true when the request reached the provider but no token counts came back
 * (a timeout, or the connection dropped mid-reply): the provider may still charge for it.
 */
function coach_ai_call(array $c, array $system, array $messages, array $schema): array
{
    $body = [
        'model'         => (string) $c['model'],
        'max_tokens'    => (int) $c['max_tokens'],
        'system'        => $system,
        'messages'      => $messages,
        'output_config' => [
            'effort' => (string) $c['effort'],
            // The reply must match the coach's message format exactly
            'format' => ['type' => 'json_schema', 'schema' => $schema],
        ],
    ];
    $headers = [
        'Content-Type: application/json',
        'x-api-key: ' . $c['api_key'],
        'anthropic-version: ' . $c['api_version'],
    ];
    if (!empty($c['fallbacks'])) {
        // If the model declines a request on safety grounds, the provider retries it on a
        // suitable model within the same call.
        $body['fallbacks'] = 'default';
        $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
    }
    $ch = curl_init((string) $c['api_url']);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => (int) $c['timeout'],
    ]);
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno === CURLE_OPERATION_TIMEDOUT) {
        return ['ok' => false, 'error' => 'timeout', 'maybe_charged' => true];
    }
    if ($raw === false || $errno !== 0) {
        error_log('pholoso coach: AI request failed (curl ' . $errno . ')');
        // Could not connect at all: nothing reached the provider. Otherwise it may have.
        $never = in_array($errno, [CURLE_COULDNT_RESOLVE_HOST, CURLE_COULDNT_CONNECT], true);
        return ['ok' => false, 'error' => 'network', 'maybe_charged' => !$never];
    }
    $data = json_decode((string) $raw, true);
    if ($status !== 200 || !is_array($data)) {
        $type = is_array($data) && isset($data['error']['type']) ? (string) $data['error']['type'] : 'unknown';
        error_log('pholoso coach: AI request returned HTTP ' . $status . ' (' . $type . ')');
        return ['ok' => false, 'error' => 'http'];
    }
    $usage = isset($data['usage']) && is_array($data['usage']) ? $data['usage'] : [];
    if (($data['stop_reason'] ?? '') === 'refusal') {
        return ['ok' => false, 'error' => 'refusal', 'usage' => $usage];
    }
    if (($data['stop_reason'] ?? '') === 'max_tokens') {
        return ['ok' => false, 'error' => 'format', 'usage' => $usage];
    }
    $text = '';
    foreach ((array) ($data['content'] ?? []) as $block) {
        if (is_array($block) && ($block['type'] ?? '') === 'text') {
            $text .= (string) $block['text'];
        }
    }
    return ['ok' => true, 'text' => $text, 'usage' => $usage];
}

/* ---------- Daily spending cap ---------- */

function coach_budget_file(array $c): string
{
    return rtrim((string) $c['storage_dir'], '/') . '/coach-budget-' . gmdate('Y-m-d') . '.json';
}

/**
 * True while today's estimated spend is under the cap. Fails closed: if today's spending
 * cannot be read or recorded (the storage folder or file is not writable, or the file is
 * damaged), the answer is no, so the cap can never silently stop working.
 */
function coach_budget_ok(array $c): bool
{
    $dir = (string) $c['storage_dir'];
    if ((!is_dir($dir) && !@mkdir($dir, 0700, true)) || !is_writable($dir)) {
        error_log('pholoso coach: budget storage not writable; the coach rests until it is fixed');
        return false;
    }
    $f = coach_budget_file($c);
    if (!is_file($f)) {
        return 0.0 < (float) $c['daily_budget_usd'];
    }
    $raw = @file_get_contents($f);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_writable($f) || ($raw !== '' && !(is_array($data) && isset($data['usd'])))) {
        error_log('pholoso coach: budget file unreadable or not writable; the coach rests until it is fixed');
        return false;
    }
    $spent = is_array($data) ? (float) $data['usd'] : 0.0;
    return $spent < (float) $c['daily_budget_usd'];
}

/** Estimated cost in US dollars of one request, from the token counts the provider reports. */
function coach_budget_cost(array $c, array $usage): float
{
    $p = $c['price_per_mtok'];
    return ((int) ($usage['input_tokens'] ?? 0) * (float) $p['input']
        + (int) ($usage['output_tokens'] ?? 0) * (float) $p['output']
        + (int) ($usage['cache_creation_input_tokens'] ?? 0) * (float) $p['cache_write']
        + (int) ($usage['cache_read_input_tokens'] ?? 0) * (float) $p['cache_read']) / 1000000;
}

/**
 * The most a request with no token counts could have cost: its input (about 4 characters a
 * token) plus every output token it was allowed. Counted in full, so the cap is never passed.
 */
function coach_budget_worst_case(array $c, string $requestBody): float
{
    $p = $c['price_per_mtok'];
    return ((strlen($requestBody) / 4) * (float) $p['input'] + (int) $c['max_tokens'] * (float) $p['output']) / 1000000;
}

/** Adds one request's estimated cost (token counts, or a dollar amount). False if not recorded. */
function coach_budget_add(array $c, $usage): bool
{
    $usd = is_array($usage) ? coach_budget_cost($c, $usage) : (float) $usage;
    $dir = (string) $c['storage_dir'];
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        error_log('pholoso coach: budget storage unavailable');
        return false;
    }
    $f = coach_budget_file($c);
    $fh = @fopen($f, 'c+');
    if ($fh === false || !flock($fh, LOCK_EX)) {
        error_log('pholoso coach: budget file unavailable');
        return false;
    }
    $data = json_decode((string) stream_get_contents($fh), true);
    $data = is_array($data) ? $data : ['usd' => 0.0, 'requests' => 0];
    $data['usd'] = round((float) $data['usd'] + $usd, 6);
    $data['requests'] = (int) $data['requests'] + 1;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, (string) json_encode($data));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return true;
}
