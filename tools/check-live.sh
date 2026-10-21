#!/usr/bin/env bash
set -euo pipefail
status() { curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }
expect() { test "$(status "$2")" = "$1" || { echo "Unexpected status: $2"; exit 1; }; }
expect 200 "$SITE_URL/"
expect 200 "$SITE_URL/logo.png"
expect 405 "$SITE_URL/contact.php"
for path in no-such-page .git/HEAD docs/ lib/form-handler.php README.md; do expect 404 "$SITE_URL/$path"; done
for url in "http://pholoso.africa/" "https://www.pholoso.africa/"; do
  expect 301 "$url"
  test "$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 20 "$url")" = "$SITE_URL/"
done
headers=$(curl -sSI --max-time 20 "$SITE_URL/")
for header in Content-Security-Policy Permissions-Policy X-Content-Type-Options X-Frame-Options Referrer-Policy; do
  printf '%s\n' "$headers" | grep -qi "^$header:"
done
test "$(curl -fsS --max-time 20 "$SITE_URL/version.txt")" = "$GITHUB_SHA"
echo "Verified release $GITHUB_SHA"
