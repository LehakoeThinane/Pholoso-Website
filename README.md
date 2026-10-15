# pholoso.africa

Website of the Pholoso Afrika Foundation: inclusive, neurodiversity-first education in South Africa.

This is the live static site, stabilised (Part A of the rebuild plan in [`docs/project-brief.md`](docs/project-brief.md)). It runs on Apache + PHP shared hosting, with no build step and no framework.

## What is where

| Path | What it is |
|---|---|
| `index.html` | The whole site. Its seven sections plus the privacy notice are `<section class="page" data-page="…">` blocks. CSS and JavaScript are inline. |
| `contact.php`, `lib/` | Contact form and updates sign-up. Sends through Microsoft 365 (Graph API). |
| `config.example.php` | Template for the private config file, which lives **outside** the web root. |
| `.htaccess` | HTTPS redirect, 404 page, caching, security headers, and 404s for private paths. |
| `deploy-files.txt` | The exact list of files uploaded to the server. |
| `tools/` | `build-dist.mjs` (builds the upload folder), `make-logo-png.py` (regenerates `logo.png`). |
| `tests/` | Static checks, PHP tests and browser tests. |
| `docs/` | Project brief summary, Comfort & access spec, Microsoft 365 setup, SEO notes, open questions. |
| `DEPLOY.md` | What to upload, what never to upload, and the post-upload checklist. |

## Working on it

Editing `index.html`:

- Colours, sizes and themes are CSS custom properties on `:root`. The Comfort & access themes (Calm, High contrast) redefine them near the end of the stylesheet. Use the tokens; don't hard-code colours.
- Font sizes are in `rem`, so "Larger text" scales everything.
- Each page is shown by setting `data-page` on `<html>`. Nav links are `<a href="#about" data-nav="about">`.
- Two very long lines (currently 729 and 1206) contain the header and footer logos as base64 image data. Don't edit them by hand; use a script if the logo changes.

Running locally (needs PHP 7.4 or later):

```bash
php -S 127.0.0.1:8000           # then open http://127.0.0.1:8000
```

Without the private config the forms fail honestly. That is expected.

## Tests

```bash
npm ci                          # once
node tests/check-site.mjs       # static checks (seconds)
php tests/php/contact-test.php  # contact form handler, against a local mock of Microsoft 365
php tests/php/htaccess-test.php # .htaccess private-path rules
npx playwright install chromium # once
npx playwright test             # browser tests: accessibility (axe), Comfort & access, forms
```

Set `PHP_BIN` if `php` is not on your PATH. Set `BROWSER_CHANNEL=msedge` or `chrome` to use an installed browser.

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every push and pull request: repository hygiene, static checks, the upload-set build, PHP tests on 7.4, 8.1 and 8.3, and the browser tests.
- **Deploy** (`.github/workflows/deploy.yml`) uploads to the host after CI passes on `main`, so merging an approved pull request deploys it. It skips the upload until the hosting secrets are set. See [`DEPLOY.md`](DEPLOY.md).

Branches: `main` matches what is live. Changes go through a pull request.
