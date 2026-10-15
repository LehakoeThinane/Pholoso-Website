<?php
/* Checks the .htaccess "RedirectMatch 404" rules against real URL paths.
 * Apache and PHP both use PCRE, so the patterns behave the same way here.
 * Run from the site folder:  php tests/php/htaccess-test.php */

$rules = [];
foreach (file(dirname(__DIR__, 2) . '/.htaccess') as $line) {
    if (preg_match('/^\s*RedirectMatch\s+404\s+(\S+)\s*$/', $line, $m)) {
        $rules[] = '#' . str_replace('#', '\#', $m[1]) . '#';
    }
}

$blocked = [
    '/.git/HEAD', '/.git/config', '/.env', '/.gitignore', '/.htaccess', '/sub/.git/HEAD',
    '/docs/', '/docs/m365-setup.md', '/brand/', '/brand/PAF%20Logo%20File.pdf', '/tools/make-logo-png.py',
    '/tests/php/contact-test.php', '/lib/form-handler.php', '/var/x', '/node_modules/x', '/dist/index.html',
    '/config.php', '/config.example.php', '/CONFIG.PHP', '/README.md', '/DEPLOY.md', '/notes.markdown',
    '/package.json', '/package-lock.json', '/playwright.config.js', '/deploy-files.txt', '/x/error.log',
];
$public = [
    '/', '/index.html', '/404.html', '/contact.php', '/robots.txt', '/sitemap.xml', '/favicon.ico',
    '/logo.png', '/og-image.png', '/img-hero.jpg', '/.well-known/acme-challenge/token',
    '/documents.html', '/branding.png', '/library.jpg',
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
    if (!$hits($p)) { echo "  FAIL not blocked: $p\n"; $fail++; }
}
foreach ($public as $p) {
    if ($hits($p)) { echo "  FAIL wrongly blocked: $p\n"; $fail++; }
}
printf("%d rules, %d paths checked, %d failed\n", count($rules), count($blocked) + count($public), $fail);
exit($fail ? 1 : 0);
