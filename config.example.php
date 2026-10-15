<?php
/* Pholoso Afrika Foundation - contact form configuration (EXAMPLE).
 *
 * Copy this file to a folder OUTSIDE the web root and name it config.php, e.g.
 *   /home/<account>/public_html/            <- the website
 *   /home/<account>/pholoso-private/config.php   <- this file, filled in
 * contact.php looks there by default. To use another path, set the
 * PHOLOSO_CONFIG environment variable to the file's full path.
 *
 * The values come from the Microsoft 365 app registration: docs/m365-setup.md.
 * Never commit or upload the filled-in file. Until it exists, the form tells
 * visitors honestly that their message was not sent and shows the email address. */

return [
    // Microsoft Entra ID app registration
    'tenant_id'     => '',
    'client_id'     => '',
    'client_secret' => '',   // Note the expiry date and renew it before then.

    // The mailbox the app sends from. It must exist in Microsoft 365 (a shared
    // mailbox works) and be the only mailbox the app may use (docs/m365-setup.md).
    'sender'        => '',
    // Where enquiries are delivered.
    'recipient'     => 'know@pholoso.africa',

    // Writable folder for rate-limit data and the cached access token.
    // Keep it outside the web root, next to this file.
    'storage_dir'   => __DIR__ . '/storage',

    // Long random string, used to hash visitor IP addresses for rate limiting.
    'salt'          => '',

    // Spam protection
    'rate_limit'    => ['max' => 5, 'window' => 3600],  // per visitor, per hour
    'min_seconds'   => 3,                               // minimum time to fill in the form
];
