<?php
/* Pholoso Afrika Foundation - contact form handler */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
if (!empty($_POST['website'])) { http_response_code(200); exit('OK'); } /* honeypot */
$name    = isset($_POST['name'])    ? trim($_POST['name'])    : '';
$email   = isset($_POST['email'])   ? trim($_POST['email'])   : '';
$role    = isset($_POST['role'])    ? trim($_POST['role'])    : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';
if ($message === '' || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) { http_response_code(400); exit('Invalid input'); }
$to      = 'know@pholoso.africa';
$subject = 'Website enquiry from ' . ($name !== '' ? $name : 'a visitor');
$body    = "Name: $name\nEmail: $email\nRole: $role\n\nMessage:\n$message\n";
$headers = "From: website@pholoso.africa\r\n";
if ($email !== '') { $headers .= 'Reply-To: ' . $email . "\r\n"; }
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
if (@mail($to, $subject, $body, $headers)) { http_response_code(200); echo 'OK'; }
else { http_response_code(500); echo 'Mail failed'; }
