<?php
/* Contact form config for the browser tests: sends to the local Microsoft mock. */
$tmp = getenv('E2E_TMP') ?: sys_get_temp_dir() . '/pholoso-e2e';
return [
    'tenant_id'     => 'test-tenant',
    'client_id'     => 'test-client',
    'client_secret' => 'test-secret',
    'sender'        => 'website@pholoso.africa',
    'recipient'     => 'know@pholoso.africa',
    'storage_dir'   => $tmp . '/storage',
    'salt'          => 'e2e-salt',
    'rate_limit'    => ['max' => 100, 'window' => 3600],
    'min_seconds'   => 1,
    'login_base'    => 'http://127.0.0.1:8091',
    'graph_base'    => 'http://127.0.0.1:8091',
];
