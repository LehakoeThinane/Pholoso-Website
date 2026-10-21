# Part A release and rollback

Production is Apache/PHP shared hosting. Only `deploy-files.txt` plus the generated
`version.txt` are uploaded. Build with `node tools/build-dist.mjs`; never upload
the repository, brand sources, tooling, tests or private credentials.

## Approval and release gates

This release must stop at the pull request for the owner's explicit approval.
Do not deploy or enable the workflow as part of preparing the PR. Merging does
not deploy. Deploy is manual and refuses branches other than `main`.

Before enabling or running Deploy:

- Obtain approval of the exact release commit and checklist in `docs/release-checklist.md`.
- Require reviewers on the GitHub `production` environment and restrict deployment
  branches to `main`. Verify these settings in GitHub; a YAML file cannot enforce them.
- Check current `main` has a successful **push CI** run for its exact commit.
  Deploy checks this again and refuses a stale commit.
- Confirm GoDaddy/cPanel access, a certificate covering apex and `www`, PHP 8.1+
  (code remains compatible with 7.4), backups, and SFTP or FTPS access.
- Ask the host to disable the injected monitoring script. If it remains, retain
  the interim privacy wording and verify CSP does not break essential functions.
- Confirm the email fallback is monitored. Microsoft 365 setup may follow later:
  without valid configuration, the form must fail honestly and link to email.

## Production configuration

Store secrets in the protected `production` environment:

| Name | Type | Purpose |
|---|---|---|
| DEPLOY_HOST | secret | Hosting transfer server |
| DEPLOY_USER | secret | Transfer username |
| DEPLOY_PASSWORD | secret | Transfer password |
| DEPLOY_KNOWN_HOSTS | secret | Independently verified SFTP host key line |
| DEPLOY_BACKUP_PASSWORD | secret | Strong password for encrypted backup archives |
| DEPLOY_PROTOCOL | variable | `sftp` (preferred) or `ftps`; no plain FTP |
| DEPLOY_PORT | variable | Optional; defaults to 22/21 |
| DEPLOY_PATH | variable | Web root, normally `public_html` |

Keep a copy of the backup password in the owner's password manager; losing it
makes backups unusable. FTPS must use a hostname matching its TLS certificate.
Run Deploy from Actions **on main**, only after approval. Never print secrets.

`tools/deploy.sh` first downloads every accessible file in the web root, including
hidden files, into a private temporary directory. It stops if this fails. It then
creates an encrypted archive (AES-256-CBC, PBKDF2, 200,000 iterations), uploads the
supporting files, uploads `index.html` last among site files, then writes the
commit to `version.txt`. It never deletes remote files. Files outside the web
root, such as private mail configuration, need the host's separate backup.

The encrypted archive is retained as `production-backup-<run id>` in Actions for
30 days, even if a later step fails. The temporary plaintext backup is removed.
Download the encrypted archive to the owner's backup storage before expiry.
Test a restore in a separate location before the first production release.

## Mail setup and handling

Use `docs/m365-setup.md` after checking whether the tenant is GoDaddy-managed.
Credentials belong in `/home/<account>/pholoso-private/config.php`, **beside** the
web root, permissions 600, with its directory at 700. Copy `config.example.php`,
fill the mailbox IDs/secret and a nonempty random `salt`, and set writable private
storage. An alternative path can be set with `PHOLOSO_CONFIG`.

Microsoft Graph HTTP 202 means **accepted for delivery**, not confirmed arrival.
After configuration, confirm arrival in the monitored mailbox and check Junk.
Updates requests are emails for manual processing, not automatic subscriptions.
No message bodies or visitor email addresses should be logged. An uncertain send
is logged without personal data and is not retried automatically. Explicit 429
responses are retried once only when `Retry-After` is valid and at most 5 seconds;
longer waits return an honest failure. cURL retries a definite DNS/connect failure
once; the streams fallback cannot prove pre-send failure, so does not retry it.
An empty timing field supports forms without JavaScript. Child-related enquiries
require guardian confirmation; general enquiries do not.

Rate-limit storage/locking/write failures are logged and refuse sending. Expired
timestamps stop counting after the configured window. Cleanup is probabilistic,
so files may remain longer; the privacy notice describes this explicitly.

## Post-release verification

`tools/check-live.sh` checks HTTP statuses, canonical redirects, required security
headers and the exact `version.txt` commit. Also complete the manual checklist:

- HTTPS apex works; HTTP and HTTPS `www` redirect to apex in one 301.
- Unknown pages return the branded 404. Private paths stay inaccessible.
- Confirm `.htaccess` actually applies CSP, Permissions-Policy and other headers.
  If the host gives `.git/HEAD` a 403 before these rules, access is blocked, but
  investigate the mismatch before accepting a failed smoke test.
- A real enquiry reaches the mailbox if configured; otherwise it explicitly
  fails and offers `know@pholoso.africa`. Check missing consent is rejected.
- Test newsletter request, JavaScript-off submission, keyboard menu/dialog use,
  Comfort & access themes, phone layout, and no unexpected CSP errors.
- Inspect and manually remove any legacy brand PDF, Word file or staff signature
  left on the host. Automated deploy intentionally never deletes remote files.
- Record deployed commit, date, approval and workflow run in README.

Leave HSTS **off** in this release. Only after HTTPS and `www` redirects are
verified, propose a separate short trial such as `max-age=300`. Do not add
`includeSubDomains` or preload without a separate domain-wide review.

## Rollback

1. Stop further deployments. Note the failed run, deployed commit and time.
2. Download its encrypted pre-release archive and retrieve the backup password
   securely. Decrypt with OpenSSL using password prompting (never a command-line
   password):
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in release-backup.tar.gz.enc -out restore.tar.gz`
3. Extract into a private local folder, inspect it, and use verified SFTP/FTPS to
   restore supporting files first and the backed-up `index.html` last. Restore
   the previous `version.txt` if present. If absent, remove only the newly added
   version marker after confirming the target, so it cannot misidentify the site.
4. Inventory newly introduced files; remove only those confirmed absent from the
   backup and unsafe to retain. Never delete unrelated hosting or private data.
5. Repeat redirects, headers, fallback-form and accessibility smoke checks.
6. Record the rollback and actual resulting version in README. Revert the release
   through a PR before the next deployment; reverting Git alone does not restore
   production because deployments are manual.

If reverting a later release to a known good commit instead, merge a revert PR
to main, wait for its CI, obtain release approval, back up again, and deploy it.
