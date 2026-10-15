# Deploying pholoso.africa

The site is plain files on Apache + PHP shared hosting. There is no build step:
what is in the repository is what runs, but **only some of it is uploaded**.

## Never upload

These must never be on the web server:

| Path | Why |
|---|---|
| `.git/` | The full history of the repository. Anyone could download it. |
| `docs/` | Internal documentation. |
| `brand/` | Brand source files and a staff email signature (kept locally, never committed). |
| `config.php` | Microsoft 365 credentials. It lives **outside** the web root (see below). |
| any `*.md` file | Internal documentation (`README.md`, `DEPLOY.md`, …). |

Also never upload: `config.example.php`, `tools/`, `tests/`, `lib/` contents other than the three PHP files listed below, `node_modules/`, `.github/`, `.gitignore`, `package.json`, `package-lock.json`, `playwright.config.js`, `deploy-files.txt`.

As a backstop, `.htaccess` answers **404** for `/.git`, `/docs`, `/brand`, `/tools`, `/tests`, `/lib`, config files, Markdown files and the tooling files, in case any are uploaded by mistake. `tests/php/htaccess-test.php` checks those rules.

## What to upload

Exactly the files in [`deploy-files.txt`](deploy-files.txt), into the web root (usually `public_html/`):

```
index.html  404.html  .htaccess  contact.php
lib/form-handler.php  lib/graph-mailer.php  lib/rate-limiter.php
robots.txt  sitemap.xml  favicon.ico  logo.png  og-image.png
img-hero.jpg  img-classroom.jpg  img-ecosystem.jpg  img-family.jpg
```

`lib/` must be uploaded (contact.php needs it), but visitors cannot open it: `.htaccess` returns 404.

To get exactly this set in one folder, run `node tools/build-dist.mjs` and upload the **contents** of `dist/`. The script refuses to include anything private.

`.htaccess` starts with a dot, so many FTP clients and file managers hide it. Make sure it is uploaded.

## Automatic deployment (GitHub Actions)

`.github/workflows/deploy.yml` uploads `dist/` after CI passes on `main`, so **merging an approved pull request deploys it**. It can also be run by hand from the Actions tab ("Deploy" → "Run workflow").

It only adds and updates files. It never deletes anything on the server.

Until the secrets below are set, the workflow skips the upload and leaves a warning. Set them under **Settings → Environments → production** (create the environment if needed):

| Name | Kind | Value |
|---|---|---|
| `DEPLOY_HOST` | secret | The host's SFTP or FTP server name |
| `DEPLOY_USER` | secret | Hosting account username |
| `DEPLOY_PASSWORD` | secret | Its password |
| `DEPLOY_KNOWN_HOSTS` | secret | SFTP only: the server's public key line (see below) |
| `DEPLOY_PROTOCOL` | variable | `sftp` (preferred) or `ftps`. Plain FTP is refused because it sends the password unencrypted |
| `DEPLOY_PORT` | variable | Optional. Defaults to 22 for SFTP, 21 for FTPS |
| `DEPLOY_PATH` | variable | Optional. Remote web root, default `public_html` |
| `SITE_URL` | variable | Optional. Default `https://pholoso.africa` |

**`DEPLOY_KNOWN_HOSTS`** lets the workflow confirm it is talking to the real server. Generate it with `ssh-keyscan -p 22 your-sftp-host`, and check the fingerprint with the host's support or control panel before saving it.

**FTPS** needs the server name that matches the host's TLS certificate (often the hosting server's own name, not `pholoso.africa`).

After uploading, the workflow smoke-tests the live site: the homepage and logo load, `contact.php` refuses GET, unknown pages return 404, private paths return 404, and HTTP redirects to HTTPS. It warns if the old brand files are still on the server.

## Contact form configuration (once)

The form sends email through Microsoft 365. Until it is configured, it tells visitors honestly that their message was not sent and shows know@pholoso.africa as a link. That is safe to deploy.

1. The Foundation's Microsoft 365 admin follows [`docs/m365-setup.md`](docs/m365-setup.md) and sends the tenant ID, client ID and secret through a secure channel.
2. On the server, create a folder **beside** the web root, not inside it:
   ```
   /home/<account>/public_html/              <- the website
   /home/<account>/pholoso-private/          <- create this (permissions 700)
   /home/<account>/pholoso-private/config.php
   ```
3. Copy `config.example.php` to `pholoso-private/config.php` and fill it in. Set permissions to 600. Use a long random string for `salt`.
4. `storage_dir` (default `pholoso-private/storage`) must be writable by PHP. It holds rate-limit data and the cached access token.

If the host's folder layout is different, put the config anywhere outside the web root and add this line to `.htaccess`, with the real path:
`SetEnv PHOLOSO_CONFIG /full/path/to/config.php`

## One-time clean-up on the server

Delete these from the web root if they were uploaded before. The deploy never deletes files, so this must be done by hand:

- `PAF Logo File.pdf`
- `PAF_Brand_and_Boilerplate.docx`
- `milisa-braweni.png` (a staff email signature with personal contact details)
- `ATT15207.htaccess` (replaced by `.htaccess`)

## Check after every upload

1. **HTTPS:** `http://pholoso.africa/` redirects to `https://pholoso.africa/` (301).
2. **404 page:** `https://pholoso.africa/no-such-page` shows the green "Page not found" page, with status 404.
3. **Headers:** `curl -I https://pholoso.africa/` shows `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Content-Security-Policy`. Open the site with the browser console open and confirm there are no "Content Security Policy" errors.
4. **Private paths:** `/.git/HEAD`, `/docs/`, `/brand/`, `/lib/form-handler.php`, `/README.md` and `/config.php` all return 404.
5. **Test enquiry:** send one from the Contact page.
   - Before Microsoft 365 is set up: the form must say *"We couldn't send your message. Please email know@pholoso.africa directly."* with a working email link. It must not say "Thank you".
   - After setup: it says the message was sent, and the email arrives at know@pholoso.africa (check Junk too) with Reply-To set to the address you entered.
6. **Updates sign-up (footer "Join"):** without ticking the box it asks for consent. With it ticked: before setup it fails honestly as above; after setup, an "Updates sign-up request" email arrives at know@pholoso.africa. Nobody is added to a mailing list automatically: the team adds them by hand until a newsletter provider is chosen.
7. **Quick look:** open Comfort & access and try Calm, High contrast and Larger text; open the menu on a phone.
8. **HSTS (once HTTPS has worked for a week):** uncomment the `Strict-Transport-Security` line in `.htaccess` and upload it again.
9. **Search:** add the Search Console and Bing codes to the two verification tags in `index.html`, then submit `https://pholoso.africa/sitemap.xml` in both tools.

## Rolling back

Revert the bad commit on `main` (or merge a pull request that reverts it). CI runs and the Deploy workflow uploads the previous version. For an urgent manual rollback, check out the last good commit, run `node tools/build-dist.mjs` and upload `dist/`.
