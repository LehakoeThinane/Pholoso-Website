<?php
/* For PHP's built-in server only: does what public/.htaccess does for the Parent Coach, so
 * tests can open /parent-coach/s/<id>/. Run: php -S 127.0.0.1:<port> -t <site> tests/php/router.php
 * Everything else is served as usual (folders get their index.html). */

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/parent-coach/s/([0-9a-f-]{36})/?$#', (string) $path, $m)) {
    $_GET['id'] = $m[1];
    require $_SERVER['DOCUMENT_ROOT'] . '/api/coach/session.php';
    return true;
}
$file = $_SERVER['DOCUMENT_ROOT'] . $path;
if (substr((string) $path, -1) === '/' && is_file($file . 'index.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($file . 'index.html');
    return true;
}
return false;
