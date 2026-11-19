<?php
/* Pholoso Parent Coach - draws a session as HTML for browsers without JavaScript.
 * The page itself is the built chat page (parent-coach/chat/index.html, the "shell"): this
 * fills in the conversation and turns the message box and answers into plain forms.
 * The markup mirrors src/scripts/coach/blocks.ts, so the same styles apply. */

function coach_e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** **bold** and *italic*, everything else escaped. */
function coach_rich(string $s): string
{
    $out = '';
    foreach (preg_split('/(\*\*[^*]+\*\*|\*[^*]+\*)/', $s, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) as $p) {
        if (substr($p, 0, 2) === '**' && strlen($p) > 4) {
            $out .= '<strong>' . coach_e(substr($p, 2, -2)) . '</strong>';
        } elseif ($p[0] === '*' && strlen($p) > 2) {
            $out .= '<em>' . coach_e(substr($p, 1, -1)) . '</em>';
        } else {
            $out .= coach_e($p);
        }
    }
    return $out;
}

/** A small form that posts to the coach (no JavaScript needed). */
function coach_form(string $action, string $id, string $inner, string $class = ''): string
{
    return '<form method="post" action="/api/coach/' . $action . '.php"' . ($class ? ' class="' . $class . '"' : '') . '>'
        . '<input type="hidden" name="id" value="' . coach_e($id) . '">' . $inner . '</form>';
}

function coach_render_block(array $b, string $id, ?int $rating, callable $art): string
{
    $label = function ($t) {
        return '<p class="cblock__label">' . coach_e($t) . '</p>';
    };
    switch ($b['type']) {
        case 'validation':
            return '<div class="cblock cblock--validation"><span class="cblock__icon" aria-hidden="true">' . ($b['icon'] === 'heart' ? '♥' : '☁') . '</span><p>' . coach_rich($b['text']) . '</p></div>';
        case 'text':
            return '<p class="cblock cblock--text">' . coach_rich($b['text']) . '</p>';
        case 'strategy':
            $pic = $art($b['id']);
            return '<div class="cblock cblock--strategy">' . ($pic !== '' ? '<div class="cblock__art">' . $pic . '</div>' : '')
                . $label('A strategy to try') . '<p class="cblock__title">' . coach_e($b['title']) . '</p><p>' . coach_rich($b['text']) . '</p></div>';
        case 'say_this':
            return '<div class="cblock cblock--say">' . $label('Say this') . '<p class="cblock__quote">“' . coach_e($b['text']) . '”</p></div>';
        case 'how_to_introduce':
            return '<div class="cblock cblock--say">' . $label('How to introduce it') . '<p>' . coach_rich($b['text']) . '</p></div>';
        case 'plan':
            $steps = '';
            foreach ($b['steps'] as $st) {
                $steps .= '<li><strong>' . coach_e($st['label']) . '</strong><span>' . coach_rich($st['text']) . '</span></li>';
            }
            return '<div class="cblock cblock--plan"><p class="cblock__title">' . coach_e($b['title']) . '</p><ol class="cblock__steps">' . $steps . '</ol></div>';
        case 'tip':
            return '<div class="cblock cblock--tip"><span class="cblock__icon" aria-hidden="true">★</span><div><p class="cblock__title">' . coach_e($b['title']) . '</p><p>' . coach_rich($b['text']) . '</p></div></div>';
        case 'account_prompt':
            return '<div class="cblock cblock--card"><p class="cblock__title">Save your progress</p><p>Soon you will be able to create an account, save this plan and come back to adjust it with me.</p>'
                . coach_form('turn', $id, '<button type="submit" name="action" value="skip" class="cbutton cbutton--plain">Skip: I’ll start over when I come back</button>') . '</div>';
        case 'closing':
            $stars = '';
            for ($i = 1; $i <= 5; $i++) {
                $stars .= '<label class="cblock__star"><input type="radio" name="rating" value="' . $i . '"' . ($rating === $i ? ' checked' : '') . '>'
                    . '<span aria-hidden="true">★</span><span class="visually-hidden">' . ($i === 1 ? '1 star' : $i . ' stars') . '</span></label>';
            }
            return '<div class="cblock cblock--card cblock--closing"><p class="cblock__title">' . coach_e($b['title']) . '</p><p>' . coach_rich($b['text']) . '</p>'
                . coach_form('rating', $id, '<fieldset class="cblock__rating"><legend>How did this session go?</legend>' . $stars . '</fieldset><button type="submit" class="cbutton cbutton--plain">Send rating</button>')
                . coach_form('start', $id, '<input type="hidden" name="restart_from" value="' . coach_e($id) . '"><button type="submit" class="cbutton">Start a new conversation</button>')
                . '</div>';
    }
    return '';
}

/** The conversation, as HTML. */
function coach_render_log(array $s, string $help, callable $art): string
{
    $html = '';
    $n = 0;
    foreach ($s['messages'] as $m) {
        if ($m['role'] === 'parent') {
            $html .= '<div class="cmsg cmsg--parent"><p class="visually-hidden">You:</p><p>' . coach_e((string) $m['text']) . '</p></div>';
        } elseif (!empty($m['help'])) {
            $html .= $help;
        } else {
            $n++;
            $inner = '';
            foreach ((array) ($m['blocks'] ?? []) as $b) {
                $inner .= coach_render_block($b, $s['uuid'], $s['rating'], $art);
            }
            $html .= '<div class="cmsg cmsg--coach" id="coach-msg-' . $n . '" data-msg><p class="visually-hidden">Coach:</p><div class="cmsg__body">' . $inner . '</div></div>';
        }
    }
    // The first answers are big buttons in the conversation
    if (!$s['ended'] && count($s['messages']) === 1 && $s['choices']) {
        $buttons = '';
        foreach ($s['choices'] as $c) {
            $buttons .= '<li><button type="submit" name="choice" value="' . coach_e($c) . '" class="cbig__button">' . coach_e($c) . '</button></li>';
        }
        $html .= coach_form('turn', $s['uuid'], '<ul class="cbig" aria-label="Suggested answers">' . $buttons . '</ul>');
    }
    return $html . '<span id="latest"></span>';
}

/** The whole page: the built chat page with this session filled in. */
function coach_render_page(array $c, array $s, string $notice = ''): string
{
    $shell = is_file($c['shell_file']) ? (string) file_get_contents($c['shell_file']) : '';
    if ($shell === '' || strpos($shell, 'data-coach-log') === false) {
        return '';
    }
    // Pieces the page already has, used again here
    $help = preg_match('#<template data-coach-help>(.*?)</template>#s', $shell, $m) ? $m[1] : '';
    $art = function (string $id) use ($shell) {
        return preg_match('#<template data-coach-art="' . preg_quote($id, '#') . '">(.*?)</template>#s', $shell, $m) ? $m[1] : '';
    };

    $log = ($notice !== '' ? '<p class="cmsg__thanks" role="status">' . coach_e($notice) . '</p>' : '') . coach_render_log($s, $help, $art);
    $html = preg_replace_callback('#(<div\b[^>]*\bdata-coach-log\b[^>]*>)#', function ($m) use ($log) {
        return $m[1] . $log;
    }, $shell, 1);

    if ($s['profile']['parent'] !== '') {
        $html = preg_replace('#(<span\b[^>]*\bdata-coach-greet\b[^>]*>)#', '$1' . coach_e(', ' . $s['profile']['parent']), $html, 1);
    }
    // The session id for the message box, and the page's own address
    $uuid = coach_e($s['uuid']);
    $html = preg_replace_callback('#<input\b[^>]*\bdata-coach-id\b[^>]*>#', function ($m) use ($uuid) {
        return preg_replace('#\bvalue="[^"]*"#', 'value="' . $uuid . '"', $m[0], 1);
    }, $html, 1);
    $html = preg_replace('#(<div\b[^>]*\bdata-coach\b)#', '$1 data-session="' . coach_e($s['uuid']) . '"', $html, 1);
    // Without JavaScript: show the message box and suggestions, hide the "needs JavaScript" note
    $html = preg_replace('#(<div\b[^>]*\bdata-coach-dock\b[^>]*?)\s+data-js-only(=""|\b)#', '$1', $html, 1);
    $html = preg_replace('#(<div\b[^>]*\bdata-coach-nojs\b)#', '$1 hidden', $html, 1);
    if ($s['ended']) {
        $html = preg_replace('#(<div\b[^>]*\bdata-coach-dock\b)#', '$1 hidden', $html, 1);
    } elseif (count($s['messages']) > 1 && $s['choices']) {
        $chips = '';
        foreach ($s['choices'] as $ch) {
            $chips .= '<li><button type="submit" name="choice" value="' . coach_e($ch) . '" class="cchip" form="coach-composer">' . coach_e($ch) . '</button></li>';
        }
        $html = preg_replace_callback('#<ul\b([^>]*\bdata-coach-chips\b[^>]*?)\s+hidden(=""|)([^>]*)>#', function ($m) use ($chips) {
            return '<ul' . $m[1] . $m[3] . '>' . $chips;
        }, $html, 1);
    }
    if ($s['placeholder'] !== '') {
        $html = preg_replace('#(<textarea\b[^>]*\bid="coach-input")#', '$1 placeholder="' . coach_e($s['placeholder']) . '"', $html, 1);
    }
    return (string) $html;
}
