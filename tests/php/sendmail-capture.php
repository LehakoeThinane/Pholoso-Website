<?php
/* Stand-in for sendmail in tests (Linux/macOS): php.ini sendmail_path points here.
 * Appends each message PHP's mail() hands over to the file in SENDMAIL_CAPTURE. */
$out = getenv('SENDMAIL_CAPTURE');
if (is_string($out) && $out !== '') {
    file_put_contents($out, stream_get_contents(STDIN) . "\n=====END=====\n", FILE_APPEND);
}
exit(0);
