<?php
/* Pholoso Parent Coach - Stage 3: optional accounts, sign-in links, reminders, deletion.
 *
 * - No passwords. A parent signs in with a link sent by email (WCAG 3.3.8). A link works once,
 *   for 20 minutes. Links and sign-ins are stored only as SHA-256 hashes.
 * - Opening a link only shows a "Sign in" button; pressing it uses the link. Email scanners
 *   (Outlook Safe Links, Gmail) open links on their own, and must not use them up.
 * - Only the browser that started a conversation can save it to an account.
 * - Signing in keeps the parent signed in on that browser for 30 days (an HttpOnly cookie).
 * - A conversation saved to an account is kept until the parent deletes it; anonymous ones are
 *   still deleted after 30 days.
 * - Reminders are opt-in, sent by lib/coach/cron-reminders.php, each with an unsubscribe
 *   link that keeps working (one code per email). */

require_once __DIR__ . '/coach-lib.php';
require_once dirname(__DIR__) . '/mailer.php';
require_once dirname(__DIR__) . '/graph-mailer.php';

const COACH_LINK_MINUTES = 20;
const COACH_LOGIN_DAYS = 30;
const COACH_COOKIE = 'pholoso_coach';
const COACH_KEEP = 4102444800; // a saved conversation: kept until the parent deletes it (2100)

function coach_hash(string $token): string
{
    return hash('sha256', $token);
}

function coach_token(): string
{
    return bin2hex(random_bytes(32));
}

function coach_email(string $raw): string
{
    $e = strtolower(trim($raw));
    return (strlen($e) <= 254 && filter_var($e, FILTER_VALIDATE_EMAIL)) ? $e : '';
}

/** Sends a plain-text email through the site's mail transport (or the test capture file). */
function coach_send_mail(array $c, string $to, string $subject, string $text): bool
{
    if (!empty($c['mail_capture'])) {
        file_put_contents($c['mail_capture'], json_encode(compact('to', 'subject', 'text')) . "\n", FILE_APPEND);
        return true;
    }
    try {
        $file = isset($c['_file']) && is_array($c['_file']) ? $c['_file'] : [];
        return paf_mailer($file, (string) $c['storage_dir'])->send($to, $subject, $text);
    } catch (Throwable $e) {
        error_log('pholoso coach: email failed');
        return false;
    }
}

/* ---------- Sign-in links ---------- */

/** Sends a sign-in link. Says nothing about whether the address already has an account. */
function coach_magic_request(PDO $db, array $c, string $email, string $sessionId): bool
{
    $token = coach_token();
    $now = time();
    $session = coach_valid_id($sessionId) ? $sessionId : null;
    $db->prepare('INSERT INTO coach_magic_links (token_hash, email, session_uuid, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)')
        ->execute([coach_hash($token), $email, $session, $now, $now + COACH_LINK_MINUTES * 60]);
    $link = rtrim((string) $c['site_url'], '/') . '/api/coach/magic-link.php?token=' . $token;
    $text = "Hello,\n\nHere is your link to sign in to the Pholoso Parent Coach:\n\n$link\n\n"
        . 'It works once, for ' . COACH_LINK_MINUTES . " minutes. Signing in saves your coaching plan, so you can come back to it.\n\n"
        . "If you did not ask for this, you can ignore this email. Nothing happens unless the link is used.\n\n"
        . "Pholoso Afrika Foundation\nhttps://pholoso.africa";
    return coach_send_mail($c, $email, 'Your sign-in link for the Pholoso Parent Coach', $text);
}

/** Uses a sign-in link. Returns the parent's id, or null if the link is unknown, used or expired. */
function coach_magic_verify(PDO $db, string $token): ?int
{
    if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
        return null;
    }
    $now = time();
    // Use the link up in one statement: of two requests arriving together, only one succeeds
    $use = $db->prepare('UPDATE coach_magic_links SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at >= ?');
    $use->execute([$now, coach_hash($token), $now]);
    if ($use->rowCount() !== 1) {
        return null;
    }
    $q = $db->prepare('SELECT * FROM coach_magic_links WHERE token_hash = ?');
    $q->execute([coach_hash($token)]);
    $link = $q->fetch();
    if (!$link) {
        return null;
    }
    $p = $db->prepare('SELECT id FROM coach_parents WHERE email = ?');
    $p->execute([$link['email']]);
    $id = $p->fetchColumn();
    if ($id === false) {
        $db->prepare('INSERT INTO coach_parents (email, created_at) VALUES (?, ?)')->execute([$link['email'], time()]);
        $id = $db->lastInsertId();
    }
    $id = (int) $id;
    if ($link['session_uuid']) {
        // Save the conversation to the account (only if nobody else has saved it)
        $db->prepare('UPDATE coach_sessions SET parent_id = ?, expires_at = ? WHERE uuid = ? AND parent_id IS NULL AND expires_at > ?')
            ->execute([$id, COACH_KEEP, $link['session_uuid'], time()]);
    }
    return $id;
}

/* ---------- Signed-in browsers ---------- */

function coach_cookie(string $value, int $expires): void
{
    coach_set_cookie(COACH_COOKIE, $value, $expires);
}

function coach_login(PDO $db, int $parentId): void
{
    $token = coach_token();
    $until = time() + COACH_LOGIN_DAYS * 86400;
    $db->prepare('INSERT INTO coach_logins (token_hash, parent_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        ->execute([coach_hash($token), $parentId, time(), $until]);
    coach_cookie($token, $until);
}

/** The signed-in parent (id, email), or null. */
function coach_current_parent(PDO $db): ?array
{
    $token = isset($_COOKIE[COACH_COOKIE]) ? (string) $_COOKIE[COACH_COOKIE] : '';
    if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
        return null;
    }
    $q = $db->prepare('SELECT p.id, p.email FROM coach_logins l JOIN coach_parents p ON p.id = l.parent_id WHERE l.token_hash = ? AND l.expires_at > ?');
    $q->execute([coach_hash($token), time()]);
    $row = $q->fetch();
    return $row ? ['id' => (int) $row['id'], 'email' => (string) $row['email']] : null;
}

function coach_logout(PDO $db): void
{
    $token = isset($_COOKIE[COACH_COOKIE]) ? (string) $_COOKIE[COACH_COOKIE] : '';
    if ($token !== '') {
        $db->prepare('DELETE FROM coach_logins WHERE token_hash = ?')->execute([coach_hash($token)]);
    }
    coach_cookie('', time() - 3600);
}

/* ---------- A parent's own data ---------- */

/** The parent's saved conversations, newest first, with what the plan was. */
function coach_parent_sessions(PDO $db, int $parentId): array
{
    $q = $db->prepare('SELECT uuid, created_at, stage, ended, profile, child_index, memory FROM coach_sessions WHERE parent_id = ? ORDER BY created_at DESC');
    $q->execute([$parentId]);
    $out = [];
    foreach ($q->fetchAll() as $r) {
        $profile = json_decode((string) $r['profile'], true) ?: ['children' => []];
        $memory = json_decode((string) $r['memory'], true) ?: [];
        $rem = $db->prepare('SELECT COUNT(*) FROM coach_reminders WHERE session_uuid = ? AND sent_at IS NULL');
        $rem->execute([$r['uuid']]);
        $out[] = [
            'uuid' => (string) $r['uuid'],
            'created_at' => (int) $r['created_at'],
            'ended' => (bool) $r['ended'],
            'child' => (string) ($profile['children'][(int) $r['child_index']]['name'] ?? ''),
            'activity' => (string) ($memory['activity'] ?? ''),
            'place' => (string) ($memory['place'] ?? ''),
            'strategy' => (string) ($memory['strategy'] ?? ''),
            'reminder' => (int) $rem->fetchColumn() > 0,
        ];
    }
    return $out;
}

/** Does this saved conversation belong to this parent? */
function coach_owns(PDO $db, string $uuid, int $parentId): bool
{
    if (!coach_valid_id($uuid)) {
        return false;
    }
    $q = $db->prepare('SELECT 1 FROM coach_sessions WHERE uuid = ? AND parent_id = ?');
    $q->execute([$uuid, $parentId]);
    return (bool) $q->fetchColumn();
}

function coach_delete_session(PDO $db, string $uuid): void
{
    foreach (['coach_messages', 'coach_feedback', 'coach_reminders'] as $t) {
        $db->prepare("DELETE FROM $t WHERE session_uuid = ?")->execute([$uuid]);
    }
    $db->prepare('DELETE FROM coach_magic_links WHERE session_uuid = ?')->execute([$uuid]);
    $db->prepare('DELETE FROM coach_sessions WHERE uuid = ?')->execute([$uuid]);
}

/** Deletes everything about a parent: conversations, children, sign-ins, reminders, email. */
function coach_delete_account(PDO $db, int $parentId): void
{
    $q = $db->prepare('SELECT uuid FROM coach_sessions WHERE parent_id = ?');
    $q->execute([$parentId]);
    foreach (array_column($q->fetchAll(), 'uuid') as $uuid) {
        coach_delete_session($db, (string) $uuid);
    }
    $e = $db->prepare('SELECT email FROM coach_parents WHERE id = ?');
    $e->execute([$parentId]);
    $email = $e->fetchColumn();
    if ($email !== false) {
        $db->prepare('DELETE FROM coach_magic_links WHERE email = ?')->execute([$email]);
    }
    foreach (['coach_children', 'coach_logins', 'coach_reminders', 'coach_unsubscribe'] as $t) {
        $db->prepare("DELETE FROM $t WHERE parent_id = ?")->execute([$parentId]);
    }
    $db->prepare('DELETE FROM coach_parents WHERE id = ?')->execute([$parentId]);
}

/* ---------- Reminders ---------- */

function coach_reminder_set(PDO $db, array $c, string $uuid, int $parentId, bool $on): void
{
    $db->prepare('DELETE FROM coach_reminders WHERE session_uuid = ? AND sent_at IS NULL')->execute([$uuid]);
    if ($on) {
        $db->prepare('INSERT INTO coach_reminders (session_uuid, parent_id, send_at, sent_at) VALUES (?, ?, ?, NULL)')
            ->execute([$uuid, $parentId, time() + (int) $c['reminder_days'] * 86400]);
    }
}

/** A new unsubscribe secret for one email (only its hash is kept). Earlier ones keep working. */
function coach_unsubscribe_token(PDO $db, int $parentId): string
{
    $token = coach_token();
    $db->prepare('INSERT INTO coach_unsubscribe (token_hash, parent_id, created_at) VALUES (?, ?, ?)')
        ->execute([coach_hash($token), $parentId, time()]);
    return $token;
}

function coach_unsubscribe_forget(PDO $db, string $token): void
{
    $db->prepare('DELETE FROM coach_unsubscribe WHERE token_hash = ?')->execute([coach_hash($token)]);
}

/** Stops every reminder for the parent this secret belongs to. Returns true if it matched. */
function coach_unsubscribe(PDO $db, string $token): bool
{
    if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
        return false;
    }
    $q = $db->prepare('SELECT parent_id FROM coach_unsubscribe WHERE token_hash = ?');
    $q->execute([coach_hash($token)]);
    $pid = $q->fetchColumn();
    if ($pid === false) {
        return false;
    }
    $db->prepare('DELETE FROM coach_reminders WHERE parent_id = ? AND sent_at IS NULL')->execute([(int) $pid]);
    return true;
}

/** Sends the reminders that are due, and tidies up expired data. Returns counts. */
function coach_cron(PDO $db, array $c): array
{
    $now = time();
    $q = $db->prepare('SELECT r.id, r.session_uuid, r.parent_id, p.email FROM coach_reminders r JOIN coach_parents p ON p.id = r.parent_id WHERE r.sent_at IS NULL AND r.send_at <= ?');
    $q->execute([$now]);
    $sent = 0;
    $site = rtrim((string) $c['site_url'], '/');
    foreach ($q->fetchAll() as $r) {
        $unsub = coach_unsubscribe_token($db, (int) $r['parent_id']);
        $text = "Hello,\n\nHave you had a chance to try your plan? Come back and tell me how it went, and we can adjust it together:\n\n"
            . "$site/parent-coach/my-coaching/\n\n"
            . "To stop these reminders, use this link (one click, no sign-in needed):\n$site/api/coach/unsubscribe.php?token=$unsub\n\n"
            . "Pholoso Afrika Foundation\nhttps://pholoso.africa";
        if (coach_send_mail($c, (string) $r['email'], 'How did your plan go? (Pholoso Parent Coach)', $text)) {
            $db->prepare('UPDATE coach_reminders SET sent_at = ? WHERE id = ?')->execute([$now, $r['id']]);
            $sent++;
        } else {
            coach_unsubscribe_forget($db, $unsub); // never sent: its code is not needed
        }
    }
    // Unsubscribe codes older than about a year and a month
    $db->prepare('DELETE FROM coach_unsubscribe WHERE created_at < ?')->execute([$now - 400 * 86400]);
    $purged = coach_purge_expired($db);
    $db->prepare('DELETE FROM coach_magic_links WHERE expires_at < ?')->execute([$now - 86400]);
    $db->prepare('DELETE FROM coach_logins WHERE expires_at < ?')->execute([$now]);
    return ['reminders' => $sent, 'sessions_deleted' => $purged];
}
