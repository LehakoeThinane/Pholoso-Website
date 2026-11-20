<?php
/* A stand-in for the AI provider's Messages API, for tests only (never the real API).
 * Run with: php -S 127.0.0.1:<port> tests/php/mock-ai.php
 *
 * It reads which stage the coach asked for and returns a reply in the coach's format.
 * MOCK_AI_MODE_FILE (a file holding one word) switches behaviour for the next requests:
 *   normal | invalid (not JSON) | invent (an unknown strategy) | refusal | slow (timeout)
 *   | emergency | concern | error (HTTP 500)
 * MOCK_AI_LOG records every request body, one JSON per line. */

$raw = (string) file_get_contents('php://input');
$req = json_decode($raw, true);
$log = getenv('MOCK_AI_LOG');
if ($log) {
    file_put_contents($log, json_encode(['body' => $req, 'key' => $_SERVER['HTTP_X_API_KEY'] ?? '', 'beta' => $_SERVER['HTTP_ANTHROPIC_BETA'] ?? '']) . "\n", FILE_APPEND);
}
$modeFile = getenv('MOCK_AI_MODE_FILE');
$mode = $modeFile && is_file($modeFile) ? trim((string) file_get_contents($modeFile)) : 'normal';

header('Content-Type: application/json');
if (($_SERVER['HTTP_X_API_KEY'] ?? '') === '' || !is_array($req)) {
    http_response_code(401);
    exit(json_encode(['type' => 'error', 'error' => ['type' => 'authentication_error', 'message' => 'missing key']]));
}
if ($mode === 'error') {
    http_response_code(500);
    exit(json_encode(['type' => 'error', 'error' => ['type' => 'api_error', 'message' => 'test']]));
}
if ($mode === 'slow') {
    sleep(4);
}

$context = (string) ($req['system'][1]['text'] ?? '');
$next = preg_match('/next stage: (\w+)/', $context, $m) ? $m[1] : 'close';
$enum = $req['output_config']['format']['schema']['properties']['blocks']['items']['anyOf'] ?? [];
$strategy = 'next-up-activity';
foreach ($enum as $b) {
    if (($b['properties']['type']['const'] ?? '') === 'strategy') {
        $strategy = $b['properties']['id']['enum'][0];
    }
}

$t = function ($s) {
    return ['type' => 'text', 'text' => $s];
};
$replies = [
    'validate' => [[['type' => 'validation', 'icon' => 'struggle', 'text' => 'That sounds really hard.'], $t('Stopping is a big switch.'), $t('Would you like to hear what has helped other families?')], ['Yes, show me', 'We’ve tried everything already']],
    'offer' => [[$t('Here is one idea.'), ['type' => 'strategy', 'id' => $mode === 'invent' ? 'magic-trick' : $strategy, 'title' => 'Whatever', 'text' => 'Have something good ready.'], $t('Would you like to try it?')], ['Yes, let’s try it']],
    'interests' => [[$t('What does your child enjoy?')], ['Building with blocks', 'Drawing']],
    'logistics' => [[$t('Where could it be ready?')], ['The lounge']],
    'plan' => [[$t('Here is a plan.'), ['type' => 'say_this', 'text' => 'Screen time is finished.'], ['type' => 'how_to_introduce', 'text' => 'At a calm time, explain.'],
        ['type' => 'plan', 'title' => 'Your plan', 'steps' => [['label' => 'When it’s calm', 'text' => 'Set it up.'], ['label' => 'When screen time ends', 'text' => 'Say it.'], ['label' => 'Right after', 'text' => 'Join in.']]],
        $t('What will happen the first time?')], ['Get upset']],
    'pushback' => [[['type' => 'validation', 'icon' => 'heart', 'text' => 'Pushback is normal.'], ['type' => 'tip', 'title' => 'Get them on board', 'text' => 'Offer a choice.'], $t('How does that feel?')], ['I’m ready to try']],
    'close' => [[$t('You took a real step today.')], []],
];
list($blocks, $choices) = isset($replies[$next]) ? $replies[$next] : $replies['close'];
$reply = ['blocks' => $blocks, 'choices' => $choices, 'placeholder' => "Answer for {$next}…", 'next_stage' => $next,
    'safety_flag' => $mode === 'emergency' ? 'emergency' : ($mode === 'concern' ? 'concern' : 'none')];

$text = $mode === 'invalid' ? 'Sorry, here is some text that is not JSON.' : json_encode($reply);
echo json_encode([
    'id' => 'msg_test', 'type' => 'message', 'role' => 'assistant', 'model' => $req['model'] ?? '',
    'content' => [['type' => 'thinking', 'thinking' => ''], ['type' => 'text', 'text' => $text]],
    'stop_reason' => $mode === 'refusal' ? 'refusal' : 'end_turn',
    'usage' => ['input_tokens' => 1000, 'output_tokens' => 200, 'cache_read_input_tokens' => 4000, 'cache_creation_input_tokens' => 0],
]);
