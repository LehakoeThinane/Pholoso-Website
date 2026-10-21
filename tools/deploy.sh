#!/usr/bin/env bash
set -euo pipefail
# Restricted production secrets are passed as environment variables, never printed.
[[ "$HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || { echo 'Invalid host'; exit 1; }
[[ "$USER" =~ ^[a-zA-Z0-9_@.-]+$ ]] || { echo 'Invalid user'; exit 1; }
[[ "$REMOTE_DIR" =~ ^/?[a-zA-Z0-9_./-]+$ && "$REMOTE_DIR" != *..* && "$REMOTE_DIR" != / ]] || { echo 'Invalid remote directory'; exit 1; }
case "$PROTO" in
  sftp)
    test -n "$KNOWN_HOSTS"
    mkdir -p ~/.ssh
    printf '%s\n' "$KNOWN_HOSTS" > ~/.ssh/known_hosts
    chmod 600 ~/.ssh/known_hosts
    port="${PORT:-22}"
    settings='set sftp:auto-confirm no;'
    ;;
  ftps)
    port="${PORT:-21}"
    settings='set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate true;'
    ;;
  *) echo 'Use sftp or ftps'; exit 1 ;;
esac
[[ "$port" =~ ^[0-9]+$ ]] || exit 1
connect="set cmd:fail-exit yes; set net:max-retries 2; set net:timeout 30; $settings
open --env-password -u \"$USER\" -p $port $PROTO://$HOST;"
backup_dir=$(mktemp -d)
trap 'rm -rf -- "$backup_dir"' EXIT
# A failed or incomplete backup stops the release before the first write.
lftp -c "$connect mirror --verbose --no-perms --parallel=2 \"$REMOTE_DIR\" \"$backup_dir/live\""
tar -czf - -C "$backup_dir" live | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:BACKUP_PASSWORD -out release-backup.tar.gz.enc
test -s release-backup.tar.gz.enc
# Upload backing files first. Never delete existing remote files.
lftp -c "$connect mirror --reverse --verbose --no-perms --parallel=1 --exclude-glob index.html --exclude-glob version.txt dist/ \"$REMOTE_DIR\";
put dist/index.html -o \"$REMOTE_DIR/index.html\";
put dist/version.txt -o \"$REMOTE_DIR/version.txt\""
