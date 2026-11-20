<?php
/* Pholoso Parent Coach - shared helpers: configuration, HTTP replies, safety checks and the
 * database. PHP 7.4+. Never served directly (public/lib/.htaccess denies it).
 *
 * Configuration lives in the private config.php outside the web root (config.example.php,
 * key 'coach'). The coach stays switched off unless 'enabled' is true AND the database and
 * the AI key are configured. */

require_once dirname(__DIR__) . '/rate-limiter.php';

const COACH_STAGES = ['pick_child', 'ask', 'validate', 'offer', 'interests', 'logistics', 'plan', 'pushback', 'close', 'done'];
const COACH_DIFFERENCES = ['autism', 'adhd', 'dyslexia', 'dyscalculia', 'dysgraphia', 'other', 'suspected', 'none'];
const COACH_SESSION_DAYS = 30;

/** The whole private config file (or null), and the coach section with defaults filled in. */
function coach_config(): ?array
{
    static $cached = false;
    if ($cached !== false) {
        return $cached;
    }
    $paths = [];
    $env = getenv('PHOLOSO_CONFIG');
    if (is_string($env) && $env !== '') {
        $paths[] = $env;
    }
    $paths[] = dirname(__DIR__, 3) . '/pholoso-private/config.php';
    $file = null;
    foreach ($paths as $p) {
        if (is_file($p)) {
            $file = include $p;
            break;
        }
    }
    if (!is_array($file) || !isset($file['coach']) || !is_array($file['coach'])) {
        return $cached = null;
    }
    $public = dirname(__DIR__, 2);
    $c = array_merge([
        'enabled'          => false,
        'db'               => ['dsn' => '', 'user' => '', 'password' => ''],
        'api_key'          => '',
        'api_url'          => 'https://api.anthropic.com/v1/messages',
        'api_version'      => '2026-10-21',
        'model'            => 'claude-opus-5-5',
        'effort'           => 'medium',
        'fallbacks'        => true,
        'max_tokens'       => 16000,
        'timeout'          => 25,
        'max_turns'        => 15,
        'rate_limit'       => ['max' => 40, 'window' => 3600],
        'daily_budget_usd' => 5.0,
        'price_per_mtok'   => ['input' => 4.0, 'output' => 20.0, 'cache_write' => 5.0, 'cache_read' => 0.2],
        'strategies_file'  => $public . '/parent-coach/strategies.json',
        'shell_file'       => $public . '/parent-coach/chat/index.html',
        'prompt_file'      => __DIR__ . '/system-prompt.md',
    ], $file['coach']);
    $c['salt'] = isset($file['salt']) ? (string) $file['salt'] : '';
    $c['storage_dir'] = isset($file['storage_dir']) ? (string) $file['storage_dir'] : sys_get_temp_dir() . '/pholoso';
    return $cached = $c;
}

/** Why the coach cannot run, or '' when it can. Never includes secret values. */
function coach_unavailable(?array $c): string
{
    if ($c === null) {
        return 'not_configured';
    }
    if (empty($c['enabled'])) {
        return 'switched_off';
    }
    if (empty($c['db']['dsn'])) {
        return 'no_database';
    }
    if (trim((string) $c['api_key']) === '') {
        return 'no_api_key';
    }
    if (trim((string) $c['salt']) === '') {
        return 'no_salt';
    }
    return '';
}

/* ---------- HTTP ---------- */

function coach_wants_json(): bool
{
    $accept = isset($_SERVER['HTTP_ACCEPT']) ? (string) $_SERVER['HTTP_ACCEPT'] : '';
    $type = isset($_SERVER['CONTENT_TYPE']) ? (string) $_SERVER['CONTENT_TYPE'] : '';
    return strpos($accept, 'application/json') !== false || strpos($type, 'application/json') !== false;
}

/** Request fields: JSON body for scripts, form fields for browsers without JavaScript. */
function coach_input(): array
{
    if (coach_wants_json()) {
        $raw = (string) file_get_contents('php://input', false, null, 0, 65536);
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
    return $_POST;
}

function coach_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function coach_headers(): void
{
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    header('X-Content-Type-Options: nosniff');
}

/** Same-origin check for script requests (the Origin or Referer must name this site). */
function coach_same_origin(): bool
{
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string) $_SERVER['HTTP_HOST']) : '';
    $source = !empty($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN']
        : (!empty($_SERVER['HTTP_REFERER']) ? (string) $_SERVER['HTTP_REFERER'] : '');
    $p = $source !== '' ? parse_url($source) : false;
    if ($host === '' || !is_array($p) || empty($p['host'])) {
        return false;
    }
    return strtolower($p['host']) . (isset($p['port']) ? ':' . $p['port'] : '') === $host;
}

/** Common checks for every endpoint: method, origin for scripts, and the coach being on. */
function coach_begin(string $method): array
{
    coach_headers();
    if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== $method) {
        http_response_code(405);
        header('Allow: ' . $method);
        exit('Method not allowed');
    }
    if ($method === 'POST' && coach_wants_json() && !coach_same_origin()) {
        coach_json(403, ['ok' => false, 'code' => 'cross_origin', 'message' => 'This can only be used from the Pholoso Afrika Foundation website.']);
    }
    $c = coach_config();
    $why = coach_unavailable($c);
    if ($why !== '') {
        if (!coach_wants_json() && $method === 'POST') {
            header('Location: /parent-coach/', true, 303);
            exit;
        }
        coach_json(503, ['ok' => false, 'code' => 'unavailable', 'message' => 'The coach is not open at the moment. The written Parent Guide may help in the meantime.']);
    }
    return $c;
}

function coach_valid_id(string $id): bool
{
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id);
}

function coach_uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20);
}

function coach_rate_ok(array $c): bool
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $limiter = new RateLimiter($c['storage_dir'] . '/coach-rate', $c['salt'], (int) $c['rate_limit']['max'], (int) $c['rate_limit']['window']);
    return $limiter->allow($ip);
}

/* ---------- Safety and privacy ---------- */

/** Plain text: no control characters, trimmed, at most $max characters. */
function coach_clean(string $s, int $max): string
{
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
    $s = trim(is_string($s) ? $s : '');
    return function_exists('mb_substr') ? mb_substr($s, 0, $max, 'UTF-8') : substr($s, 0, $max);
}

/** Removes South African ID numbers, phone numbers and email addresses (POPIA). */
function coach_strip_personal(string $s): string
{
    $s = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[email removed]', $s);
    $s = preg_replace('/(?<!\d)\d{6}\s?\d{4}\s?\d{2}\s?\d(?!\d)/', '[ID number removed]', $s);
    $s = preg_replace('/(?<![\d+])(?:\+27|0027|0)[\s-]?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}(?!\d)/', '[phone number removed]', $s);
    return (string) $s;
}

/** True if the text contains a word that suggests danger or an emergency. */
function coach_is_crisis(string $text): bool
{
    static $pattern = null;
    if ($pattern === null) {
        $data = json_decode((string) file_get_contents(__DIR__ . '/crisis-words.json'), true);
        $words = isset($data['words']) && is_array($data['words']) ? $data['words'] : [];
        $parts = array_map(function ($w) {
            return str_replace('\-', '[- ]?', preg_quote((string) $w, '/'));
        }, $words);
        $pattern = '/(^|[^\p{L}])(' . implode('|', $parts) . ')([^\p{L}]|$)/iu';
    }
    return (bool) preg_match($pattern, $text);
}

/* ---------- Database ---------- */

function coach_db(array $c): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO((string) $c['db']['dsn'], (string) $c['db']['user'], (string) $c['db']['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function coach_session_load(PDO $db, string $id): ?array
{
    if (!coach_valid_id($id)) {
        return null;
    }
    $q = $db->prepare('SELECT * FROM coach_sessions WHERE uuid = ? AND expires_at > ?');
    $q->execute([$id, time()]);
    $row = $q->fetch();
    if (!$row) {
        return null;
    }
    $row['profile'] = json_decode((string) $row['profile'], true) ?: ['parent' => '', 'children' => []];
    $row['memory'] = json_decode((string) $row['memory'], true) ?: [];
    $row['choices'] = json_decode((string) $row['choices'], true) ?: [];
    $row['ended'] = (bool) $row['ended'];
    $row['rating'] = $row['rating'] === null ? null : (int) $row['rating'];
    $row['turns'] = (int) $row['turns'];
    $row['child_index'] = (int) $row['child_index'];
    $m = $db->prepare('SELECT role, body FROM coach_messages WHERE session_uuid = ? ORDER BY id');
    $m->execute([$id]);
    $row['messages'] = array_map(function ($r) {
        $body = json_decode((string) $r['body'], true);
        return ['role' => $r['role']] + (is_array($body) ? $body : []);
    }, $m->fetchAll());
    return $row;
}

function coach_session_create(PDO $db, array $s): void
{
    $now = time();
    $db->prepare('INSERT INTO coach_sessions (uuid, parent_id, topic, stage, profile, child_index, memory, choices, placeholder, ended, rating, turns, created_at, expires_at)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?, ?)')
        ->execute([$s['uuid'], $s['topic'], $s['stage'], json_encode($s['profile']), $s['child_index'],
            json_encode((object) $s['memory']), json_encode($s['choices']), $s['placeholder'], $now, $now + COACH_SESSION_DAYS * 86400]);
}

function coach_session_save(PDO $db, array $s): void
{
    $db->prepare('UPDATE coach_sessions SET stage = ?, child_index = ?, memory = ?, choices = ?, placeholder = ?, ended = ?, rating = ?, turns = ? WHERE uuid = ?')
        ->execute([$s['stage'], $s['child_index'], json_encode((object) $s['memory']), json_encode($s['choices']), $s['placeholder'],
            $s['ended'] ? 1 : 0, $s['rating'], $s['turns'], $s['uuid']]);
}

/** Adds a message: ['role' => 'coach', 'blocks' => [...]] or ['role' => 'parent', 'text' => '...'] or help. */
function coach_message_add(PDO $db, string $id, array $message): void
{
    $role = $message['role'];
    unset($message['role']);
    $db->prepare('INSERT INTO coach_messages (session_uuid, role, body, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$id, $role, json_encode($message, JSON_UNESCAPED_UNICODE), time()]);
}

/** Deletes anonymous sessions (and their messages and feedback) older than 30 days. */
function coach_purge_expired(PDO $db): int
{
    $q = $db->prepare('SELECT uuid FROM coach_sessions WHERE expires_at <= ? AND parent_id IS NULL');
    $q->execute([time()]);
    $ids = array_column($q->fetchAll(), 'uuid');
    foreach ($ids as $id) {
        $db->prepare('DELETE FROM coach_messages WHERE session_uuid = ?')->execute([$id]);
        $db->prepare('DELETE FROM coach_feedback WHERE session_uuid = ?')->execute([$id]);
        $db->prepare('DELETE FROM coach_sessions WHERE uuid = ?')->execute([$id]);
    }
    return count($ids);
}

/** What the browser may see of a session (no internal memory, no other ids). */
function coach_public_state(array $s): array
{
    $child = isset($s['profile']['children'][$s['child_index']]['name']) ? $s['profile']['children'][$s['child_index']]['name'] : '';
    return [
        'id'          => $s['uuid'],
        'parent'      => (string) $s['profile']['parent'],
        'child'       => (string) $child,
        'messages'    => $s['messages'],
        'choices'     => $s['choices'],
        'placeholder' => (string) $s['placeholder'],
        'ended'       => (bool) $s['ended'],
        'rating'      => $s['rating'],
    ];
}
