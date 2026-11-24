<?php
/* Pholoso Afrika Foundation - the "page not found" answer.
 * .htaccess sends every address that is not a file or folder here. Some hosting (the live
 * GoDaddy server, 24 November 2026) ignores "ErrorDocument 404 /404.html" and answers with a
 * bare "404 Not Found"; this file gives the site's own 404 page instead, with the right status
 * so search engines do not index it. */

http_response_code(404);
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
readfile(__DIR__ . '/404.html');
