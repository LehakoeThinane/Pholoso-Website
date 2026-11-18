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
];
