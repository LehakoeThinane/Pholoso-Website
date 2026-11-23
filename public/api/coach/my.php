<?php
/* Pholoso Parent Coach - "My coaching" (/parent-coach/my-coaching/, rewritten here by
 * .htaccess). Drawn by the server from the built page, so it works without JavaScript.
 *
 * From an email link: only a "Sign in" or "Stop reminders" button (?signin= / ?stop=), so an
 * email scanner opening the link changes nothing; pressing the button does.
 * Signed out: a form to get a sign-in link. Signed in: saved conversations with their plans;
 * start a follow-up; a reminder in a few days; delete a conversation; delete the account;
 * sign out. Every action is a plain form (POST, then back here). */

require dirname(__DIR__, 2) . '/lib/coach/coach-render.php';
require dirname(__DIR__, 2) . '/lib/coach/coach-engine.php';
require dirname(__DIR__, 2) . '/lib/coach/coach-accounts.php';

date_default_timezone_set('Africa/Johannesburg');
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
$c = coach_begin($method === 'POST' ? 'POST' : 'GET');
$db = coach_db($c);
$parent = coach_current_parent($db);

$back = function (string $notice) {
    header('Location: /parent-coach/my-coaching/?notice=' . $notice, true, 303);
    exit;
};

/* ---------- Actions ---------- */
if ($method === 'POST') {
    // Forms on this website only (browsers send Origin with form posts)
    if ((!empty($_SERVER['HTTP_ORIGIN']) || !empty($_SERVER['HTTP_REFERER'])) && !coach_same_origin()) {
        http_response_code(403);
        exit('This can only be used from the Pholoso Afrika Foundation website.');
    }
    if ($parent === null) {
        $back('signed-out');
    }
    $action = (string) ($_POST['action'] ?? '');
    $id = (string) ($_POST['id'] ?? '');
    $sure = ($_POST['confirm'] ?? '') === 'yes';
    if ($action === 'sign-out') {
        coach_logout($db);
        $back('signed-out');
    }
    if ($action === 'delete-account') {
        if (!$sure) {
            $back('confirm');
        }
        coach_delete_account($db, $parent['id']);
        coach_logout($db);
        $back('account-deleted');
    }
    if (!coach_owns($db, $id, $parent['id'])) {
        $back('not-found');
    }
    if ($action === 'delete') {
        if (!$sure) {
            $back('confirm');
        }
        coach_delete_session($db, $id);
        $back('deleted');
    }
    if ($action === 'remind' || $action === 'no-remind') {
        coach_reminder_set($db, $c, $id, $parent['id'], $action === 'remind');
        $back($action === 'remind' ? 'reminder' : 'no-reminder');
    }
    if ($action === 'follow-up') {
        if (!coach_rate_ok($c)) {
            $back('wait');
        }
        $new = coach_start_followup($db, coach_session_load($db, $id), $parent['id']);
        header('Location: /parent-coach/s/' . $new . '/', true, 303);
        exit;
    }
    $back('not-found');
}

/* ---------- The page ---------- */
$notices = [
    'sent' => 'Check your email: we have sent you a link to sign in. It works once, for 20 minutes.',
    'signed-in' => 'You are signed in. Your conversation is saved here.',
    'signed-out' => 'You are signed out.',
    'link' => 'That sign-in link has expired or has already been used. Please ask for a new one.',
    'email' => 'Please enter your email address, for example name@example.com.',
    'wait' => 'Please wait a little and try again.',
    'mail' => 'Sorry, the email could not be sent just now. Please try again later.',
    'confirm' => 'Please tick the box to confirm, then press the button again.',
    'deleted' => 'That conversation has been deleted.',
    'account-deleted' => 'Your account and everything in it have been deleted.',
    'reminder' => 'We will email you a reminder in ' . (int) $c['reminder_days'] . ' days.',
    'no-reminder' => 'The reminder is cancelled.',
    'unsubscribed' => 'You will not get any more reminders.',
    'unsubscribe-link' => 'That link does not work. To stop reminders, sign in and cancel them on this page.',
    'not-found' => 'That conversation could not be found.',
];
$notice = isset($_GET['notice'], $notices[$_GET['notice']]) ? $notices[$_GET['notice']] : '';

$e = 'coach_e';
$form = function (string $action, string $id, string $button, string $extra = '', string $class = 'cbutton') use ($e) {
    return '<form method="post" action="/parent-coach/my-coaching/" class="my__form">'
        . '<input type="hidden" name="action" value="' . $e($action) . '">'
        . ($id !== '' ? '<input type="hidden" name="id" value="' . $e($id) . '">' : '')
        . $extra . '<button type="submit" class="' . $class . '">' . $e($button) . '</button></form>';
};
$confirm = function (string $id, string $label) use ($e) {
    return '<label class="my__confirm"><input type="checkbox" name="confirm" value="yes" id="' . $e($id) . '"> ' . $e($label) . '</label>';
};

$html = $notice !== '' ? '<p class="my__notice" role="status">' . $e($notice) . '</p>' : '';
$signin = isset($_GET['signin']) && preg_match('/^[0-9a-f]{64}$/', (string) $_GET['signin']) ? (string) $_GET['signin'] : '';
$stop = isset($_GET['stop']) && preg_match('/^[0-9a-f]{64}$/', (string) $_GET['stop']) ? (string) $_GET['stop'] : '';
if ($signin !== '') {
    // The link from the email: one button, which uses the link
    $html .= '<h2>Sign in to the Parent Coach</h2>'
        . '<p>Press the button to sign in on this device. Your conversation will be saved here.</p>'
        . '<form method="post" action="/api/coach/magic-link.php" class="my__signin">'
        . '<input type="hidden" name="token" value="' . $e($signin) . '">'
        . '<button type="submit" class="cbutton">Sign in</button></form>';
} elseif ($stop !== '') {
    $html .= '<h2>Stop reminders</h2>'
        . '<p>Press the button and we will not send you any more reminder emails. Your saved coaching stays here.</p>'
        . '<form method="post" action="/api/coach/unsubscribe.php" class="my__signin">'
        . '<input type="hidden" name="token" value="' . $e($stop) . '">'
        . '<button type="submit" class="cbutton">Stop reminders</button></form>';
} elseif ($parent === null) {
    $html .= '<h2>Sign in to see your coaching</h2>'
        . '<p>We will email you a link. There is no password. The link works once, for 20 minutes.</p>'
        . '<form method="post" action="/api/coach/magic-link.php" class="my__signin">'
        . '<label class="onboard__label" for="my-email">Your email address</label>'
        . '<input class="onboard__input" id="my-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254">'
        . '<button type="submit" class="cbutton">Send me a sign-in link</button></form>'
        . '<p>New here? <a href="/parent-coach/start/">Start a coaching conversation</a>. You can save it at the end.</p>';
} else {
    $strategies = coach_strategies($c);
    $sessions = coach_parent_sessions($db, $parent['id']);
    $html .= '<p class="my__who">Signed in as <strong>' . $e($parent['email']) . '</strong>.</p>'
        . $form('sign-out', '', 'Sign out', '', 'cbutton cbutton--plain')
        . '<h2>Your saved coaching</h2>';
    if (!$sessions) {
        $html .= '<p>Nothing saved yet. <a href="/parent-coach/start/">Start a coaching conversation</a>, and choose to save it at the end.</p>';
    }
    foreach ($sessions as $i => $s) {
        $plan = $s['activity'] !== ''
            ? 'When screen time ends: ' . lcfirst($s['activity']) . ($s['place'] !== '' ? ', in ' . lcfirst($s['place']) : '') . '.'
            : 'The plan was not finished.';
        $title = isset($strategies[$s['strategy']]) ? (string) $strategies[$s['strategy']]['title'] : '';
        $html .= '<section class="my__card" aria-labelledby="my-s' . $i . '">'
            . '<h3 id="my-s' . $i . '">' . $e(date('j F Y', $s['created_at'])) . ($s['child'] !== '' ? ': ' . $e($s['child']) : '') . '</h3>'
            . ($title !== '' ? '<p><strong>Strategy:</strong> ' . $e($title) . '</p>' : '')
            . '<p><strong>Plan:</strong> ' . $e($plan) . '</p>'
            . '<p><a href="/parent-coach/s/' . $e($s['uuid']) . '/">Open this conversation</a></p>'
            . '<div class="my__actions">'
            . $form('follow-up', $s['uuid'], 'Tell me how it went (follow-up)')
            . ($s['reminder']
                ? $form('no-remind', $s['uuid'], 'Cancel the reminder', '', 'cbutton cbutton--plain')
                : $form('remind', $s['uuid'], 'Remind me in ' . (int) $c['reminder_days'] . ' days', '', 'cbutton cbutton--plain'))
            . '</div>'
            . $form('delete', $s['uuid'], 'Delete this conversation', $confirm('my-del' . $i, 'Yes, delete this conversation'), 'cbutton cbutton--plain my__danger')
            . '</section>';
    }
    $html .= '<h2>Delete your account</h2>'
        . '<p>This deletes your email address and every saved conversation, plan, rating and reminder. It cannot be undone.</p>'
        . $form('delete-account', '', 'Delete my account', $confirm('my-del-all', 'Yes, delete my account and everything in it'), 'cbutton cbutton--plain my__danger');
}

$shell = is_file($c['my_shell_file']) ? (string) file_get_contents($c['my_shell_file']) : '';
if (strpos($shell, 'data-coach-my') === false) {
    http_response_code(500);
    exit('The coach page is missing. Please upload the whole website again.');
}
$page = preg_replace_callback('#(<div\b[^>]*\bdata-coach-my\b[^>]*>)#', function ($m) use ($html) {
    return $m[1] . $html;
}, $shell, 1);
header('Content-Type: text/html; charset=UTF-8');
echo $page;
