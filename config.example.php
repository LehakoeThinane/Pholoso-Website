<?php
/* Pholoso Afrika Foundation - form handler configuration (EXAMPLE, no real values).
 *
 * Copy this file to a folder OUTSIDE the web root and name it config.php, e.g.
 *   /home/<account>/public_html/                  <- the website (contents of dist/)
 *   /home/<account>/pholoso-private/config.php    <- this file, filled in
 * contact.php looks there by default. To use another path, set the PHOLOSO_CONFIG
 * environment variable to the file's full path.
 *
 * Never commit or upload the filled-in file. Until it exists, the forms tell visitors
 * honestly that nothing was sent and show the email address instead. */

return [
    // How emails are delivered: 'graph' (Microsoft 365, recommended) or 'mail' (PHP mail()).
    // mail() from shared hosting is often rejected or quarantined by the domain's
    // SPF/DMARC policy; see docs/m365-setup.md.
    'transport'     => 'graph',

    // Microsoft Entra ID app registration (only for 'graph'; docs/m365-setup.md)
    'tenant_id'     => '',
    'client_id'     => '',
    'client_secret' => '',   // Note the expiry date and renew it before then.

    // The mailbox emails are sent FROM. For 'graph' it must exist in Microsoft 365 and be
    // the only mailbox the app may use. For 'mail' it must be an address on pholoso.africa.
    'sender'        => '',
    // Where form emails are delivered.
    'recipient'     => 'know@pholoso.africa',

    // Writable folder for rate-limit data and the cached access token.
    // Keep it outside the web root, next to this file.
    'storage_dir'   => __DIR__ . '/storage',

    // Long random string, used to scramble visitor IP addresses for rate limiting.
    'salt'          => '',

    // Spam protection: at most 5 submissions per visitor per 10 minutes.
    'rate_limit'    => ['max' => 5, 'window' => 600],
    'min_seconds'   => 3,   // checked only when the form script supplies the timing

    // Pholoso Parent Coach (docs/DEPLOY.md, "Parent Coach"). Leave 'enabled' => false until the
    // Foundation has approved the strategies, the helplines, the privacy notice and a budget.
    // The website must also be built with COACH_MODE=live for the pages to use it.
    'coach' => [
        'enabled'          => false,
        // The MySQL database from cPanel > MySQL Databases (run server/migrations/001_coach.sql)
        'db'               => [
            'dsn'      => 'mysql:host=localhost;dbname=ACCOUNT_coach;charset=utf8mb4',
            'user'     => '',
            'password' => '',
        ],
        // The AI provider's API key (from its console). Never put it anywhere else.
        'api_key'          => '',
        // The model and how hard it thinks. The model must support structured outputs.
        'model'            => 'claude-opus-5-5',
        'effort'           => 'medium',   // low | medium | high
        'fallbacks'        => true,       // retry declined requests on a suitable model
        'timeout'          => 45,         // seconds before "please try again" (the AI thinks first)
        'max_turns'        => 15,         // per conversation
        'rate_limit'       => ['max' => 40, 'window' => 3600],   // per visitor per hour
        // Daily spending cap in US dollars. When reached, the coach "rests" until tomorrow
        // (UTC) and points to the written Parent Guide. Prices: USD per million tokens for the
        // model above; check the provider's pricing page when changing the model.
        'daily_budget_usd' => 5.0,
        'price_per_mtok'   => ['input' => 4.0, 'output' => 20.0, 'cache_write' => 5.0, 'cache_read' => 0.2],
        // Saving and follow-ups (Stage 3). Sign-in links and reminders are sent with the same
        // mail settings as the forms above.
        'site_url'         => 'https://pholoso.africa',   // start of every link in coach emails
        'reminder_days'    => 3,                          // "Remind me" sends one email after this many days
    ],
];
