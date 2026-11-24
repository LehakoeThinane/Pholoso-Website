<?php
/* Checks the "RedirectMatch 404" rules in public/.htaccess against real URL paths.
 * Apache and PHP both use PCRE, so the patterns behave the same way here.
 * Also checks that every block that needs a module is wrapped in <IfModule>.
 * Run from the repository root:  php tests/php/htaccess-test.php */

$file = dirname(__DIR__, 2) . '/public/.htaccess';
$lines = file($file);
$rules = [];
foreach ($lines as $line) {
    if (preg_match('/^\s*RedirectMatch\s+404\s+(\S+)\s*$/', $line, $m)) {
        $rules[] = '#' . str_replace('#', '\#', $m[1]) . '#';
    }
}

$blocked = [
    '/.git/HEAD', '/.git/config', '/.env', '/.gitignore', '/.htaccess', '/sub/.git/HEAD',
    '/docs/', '/docs/m365-setup.md', '/brand/', '/tools/x.sh', '/tests/php/contact-test.php',
    '/lib/form-handler.php', '/LIB/mailer.php', '/var/x', '/node_modules/x', '/dist/index.html', '/src/config/site.ts',
    '/scripts/contrast.ts', '/pholoso-private/config.php', '/config.php', '/config.example.php', '/CONFIG.PHP',
    '/README.md', '/notes.markdown', '/package.json', '/pnpm-lock.yaml', '/astro.config.ts', '/tsconfig.json',
    '/x/error.log', '/backup.zip', '/php.ini',
    '/lib/coach/coach-lib.php', '/lib/coach/system-prompt.md', '/lib/coach/crisis-words.json', '/server/migrations/001_coach.sql',
];
$public = [
    '/', '/index.html', '/404.html', '/404.php', '/contact.php', '/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml',
    '/favicon.ico', '/logo.png', '/og-image.png', '/prefs.js', '/_astro/main.abc123.js', '/_astro/x.css',
    '/_astro/font.woff2', '/_astro/hero.avif', '/about/', '/resources/a-guide/', '/thank-you/',
    '/.well-known/acme-challenge/token', '/documents.html', '/library.jpg', '/branding.png',
    '/api/coach/start.php', '/api/coach/turn.php', '/coach-health.php', '/parent-coach/', '/parent-coach/strategies.json',
];

$fail = 0;
$hits = function ($path) use ($rules) {
    foreach ($rules as $r) {
        if (preg_match($r, $path)) {
            return true;
        }
    }
    return false;
};
foreach ($blocked as $p) {
    if (!$hits($p)) {
        echo "  FAIL not blocked: $p\n";
        $fail++;
    }
}
foreach ($public as $p) {
    if ($hits($p)) {
        echo "  FAIL wrongly blocked: $p\n";
        $fail++;
    }
}

// Directives from optional modules must sit inside <IfModule> (a missing module would be a 500).
$depth = 0;
$needsModule = '/^\s*(RedirectMatch|Redirect|RewriteEngine|RewriteCond|RewriteRule|Header|ExpiresActive|ExpiresByType|AddOutputFilterByType|AddType|SetEnvIf)\b/i';
foreach ($lines as $n => $line) {
    if (preg_match('/^\s*<IfModule\b/i', $line)) {
        $depth++;
    } elseif (preg_match('/^\s*<\/IfModule>/i', $line)) {
        $depth--;
    } elseif ($depth === 0 && preg_match($needsModule, $line)) {
        echo '  FAIL not inside <IfModule> (line ' . ($n + 1) . '): ' . trim($line) . "\n";
        $fail++;
    }
}
$csp = '';
foreach ($lines as $line) {
    if (preg_match('/Content-Security-Policy "([^"]+)"/', $line, $m)) {
        $csp = $m[1];
    }
}
foreach (["default-src 'self'", "script-src 'self'", "style-src 'self'", "form-action 'self'", "frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"] as $d) {
    if (strpos($csp, $d) === false) {
        echo "  FAIL CSP is missing: $d\n";
        $fail++;
    }
}
if (strpos($csp, 'unsafe-inline') !== false || strpos($csp, 'unsafe-eval') !== false) {
    echo "  FAIL CSP must not allow unsafe-inline or unsafe-eval\n";
    $fail++;
}

printf("%d rules, %d paths checked, IfModule and CSP checked, %d failed\n", count($rules), count($blocked) + count($public), $fail);
exit($fail ? 1 : 0);
