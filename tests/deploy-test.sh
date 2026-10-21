#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/dist"
printf 'test\n' > "$fixture/dist/index.html"
printf 'commit\n' > "$fixture/dist/version.txt"
cat > "$fixture/bin/lftp" <<'MOCK'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$TRANSFER_LOG"
if [[ "$*" != *--reverse* ]]; then
  if [[ "${FAIL_BACKUP:-0}" = 1 ]]; then exit 1; fi
  destination=$(printf '%s' "$*" | sed -n 's/.*"\([^"]*\/live\)".*/\1/p')
  test -n "$destination"
  mkdir -p "$destination"
  printf 'previous home\n' > "$destination/index.html"
  printf 'previous config\n' > "$destination/.htaccess"
fi
MOCK
chmod +x "$fixture/bin/lftp"
export PATH="$fixture/bin:$PATH" TRANSFER_LOG="$fixture/transfers.log"
export HOST=example.test USER=release REMOTE_DIR=public_html PROTO=ftps PORT=21
export BACKUP_PASSWORD=test-only-password LFTP_PASSWORD=test-only-password
cd "$fixture"
bash "$root/tools/deploy.sh"
test -s release-backup.tar.gz.enc
test "$(grep -c -- --reverse "$TRANSFER_LOG")" = 1
grep -q -- '--exclude-glob index.html --exclude-glob version.txt' "$TRANSFER_LOG"
index_line=$(grep -n 'put dist/index.html' "$TRANSFER_LOG" | cut -d: -f1)
version_line=$(grep -n 'put dist/version.txt' "$TRANSFER_LOG" | cut -d: -f1)
test "$index_line" -lt "$version_line"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSWORD -in release-backup.tar.gz.enc -out restored.tar.gz
tar -xzf restored.tar.gz
test "$(cat live/index.html)" = 'previous home'
test "$(cat live/.htaccess)" = 'previous config'
: > "$TRANSFER_LOG"
export FAIL_BACKUP=1
if bash "$root/tools/deploy.sh"; then echo 'FAIL: backup failure allowed upload'; exit 1; fi
if grep -q -- --reverse "$TRANSFER_LOG"; then echo 'FAIL: uploaded after backup failure'; exit 1; fi
echo 'Backup restore, upload order and backup-failure checks passed'
