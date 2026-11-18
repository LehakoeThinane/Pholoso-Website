<?php
/* Test double for the Microsoft login and Graph endpoints, run with PHP's built-in server.
 * Records each sendMail request to MOCK_GRAPH_LOG so the tests can inspect it.
 *   tenant "bad-tenant"   -> token request is refused (401)
 *   sender "fail@..."     -> sendMail answers 500 */

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
header('Content-Type: application/json');

if ($path === '/healthz') {
    echo '{"ok":true}';
    return;
}

if (preg_match('#^/([^/]+)/oauth2/v2\.0/token$#', $path, $m)) {
    if ($m[1] === 'bad-tenant') {
        http_response_code(401);
        echo json_encode(['error' => 'invalid_client']);
        return;
    }
    echo json_encode(['access_token' => 'test-token', 'expires_in' => 3600, 'token_type' => 'Bearer']);
    return;
}

if (preg_match('#^/v1\.0/users/([^/]+)/sendMail$#', $path, $m)) {
    $sender = rawurldecode($m[1]);
    $previous = (string) @file_get_contents(getenv('MOCK_GRAPH_LOG'));
    file_put_contents(getenv('MOCK_GRAPH_LOG'), json_encode([
        'sender' => $sender,
        'auth'   => isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '',
        'body'   => json_decode(file_get_contents('php://input'), true),
    ]) . "\n", FILE_APPEND);
    if (strpos($sender, 'timeout@') === 0) {
        sleep(22); // Accepted request, response arrives after the client's timeout.
        http_response_code(202);
        return;
    }
    if (strpos($sender, 'long-throttle@') === 0 || (strpos($sender, 'throttle@') === 0 && strpos($previous, 'throttle@') === false)) {
        header('Retry-After: ' . (strpos($sender, 'long-throttle@') === 0 ? '120' : '1'));
        http_response_code(429);
    } else {
        http_response_code(strpos($sender, 'fail@') === 0 ? 500 : 202);
    }
    return;
}

http_response_code(404);
echo '{}';
