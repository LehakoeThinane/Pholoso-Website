# pholoso.africa

Website of the **Pholoso Afrika Foundation**: inclusive, adaptive education for neurodivergent
children in South Africa and Africa. A happy, child-centred site: **Kids' World** for children,
and calm, trustworthy pages for parents, donors, companies and schools.

Static pages built with [Astro](https://astro.build/), plus one PHP form handler, hosted on
GoDaddy shared hosting. No database, no tracking, no third-party requests.

**Start here:** this README (developers) · [docs/DEPLOY.md](docs/DEPLOY.md) (putting it online,
no programming) · [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md) (writing and editing) ·
[docs/DECISIONS.md](docs/DECISIONS.md) (why it is built this way) ·
[docs/HANDOVER.md](docs/HANDOVER.md) (status and what is left) ·
[docs/CHANGELOG.md](docs/CHANGELOG.md) (every update).

---

## Requirements

- Node.js 22.23.4 or later (CI uses 24) and pnpm 9 (`corepack enable`, or `npx pnpm@9.15.9`)
- PHP 7.4 or later, only for the form handler tests (set `PHP_BIN` if `php` is not on your PATH)
- For browser tests: Playwright's Chromium (`pnpm exec playwright install chromium`), or an
  installed Chrome or Edge (`PW_CHANNEL=msedge`)

## Quick start

```bash
pnpm install
pnpm dev               # http://localhost:4321 (live reload)
pnpm build:preview     # build into dist/, allowing TODO placeholders
pnpm preview           # serve dist/
```

## Commands

| Command                | What it does                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm dev`             | Development server                                                                                    |
| `pnpm build`           | **Production** build. Stops while any `TODO:` placeholder remains in `src/config/site.ts`.            |
| `pnpm build:preview`   | Build that allows placeholders (shown as "To be confirmed"). Used by CI and the tests.                |
| `pnpm preview`         | Serve `dist/`                                                                                         |
| `pnpm lint`            | ESLint and Prettier (`pnpm format` fixes formatting)                                                  |
| `pnpm check`           | `astro check` (TypeScript, strict)                                                                    |
| `pnpm check:contrast`  | Contrast of every colour pair, in every theme, read from `src/styles/tokens.css`                      |
| `pnpm check:dist`      | Built HTML: no inline scripts/styles, no third parties, one `<h1>`, Kids' World safety rules, budgets |
| `pnpm check:html`      | HTML validation (html-validate)                                                                       |
| `pnpm check:links`     | Every internal link and `#anchor` resolves (offline)                                                  |
| `pnpm test:e2e`        | Playwright + axe at 390×844 and 1280×900 (needs a build in `dist/`)                                   |
| `pnpm test:lighthouse` | Lighthouse CI with the performance budgets (needs a build; `CHROME_PATH` for another browser)         |
| `pnpm test:php`        | PHP syntax, form handler tests, `.htaccess` tests                                                     |
| `pnpm make:printables` | Regenerate the Kids' World PDFs in `public/printables/`                                               |
| `pnpm smoke [url]`     | Post-deploy check of the live site (sends no email)                                                   |

Everything CI runs, in order: `pnpm lint && pnpm check && pnpm check:contrast && pnpm build:preview && pnpm check:dist && pnpm check:html && pnpm check:links && pnpm test:e2e && pnpm test:lighthouse && pnpm test:php`

## How it fits together

```
src/
  config/        site.ts (facts: the single source of truth, Zod-validated), strings.ts
                 (interface words, menus, mascot name), sources.ts (statistics), terms.ts
                 (person-first / identity-first pairs), kids-links.ts (allowed external links)
  content/       Markdown and YAML content, checked against schemas in content.config.ts
  pages/         One file per page. kids/ is Kids' World.
  layouts/       BaseLayout (every page), KidsLayout (Kids' World)
  components/    Components, each documented at the top. kids/ for Kids' World.
  scripts/       Small browser scripts, bundled as external files. kids/ for Kids' World.
  styles/        tokens.css (design tokens and themes), global.css, kids.css, print.css
  assets/        Photos, logo, illustrations (see assets/illustrations/README.md)
  integrations/  todo-guard.ts: stops production builds while placeholders remain
public/
  contact.php    The form handler (logic in lib/, which is never served)
  .htaccess      HTTPS, redirects, security headers, caching, compression
  prefs.js       Applies Comfort & access settings before the page draws
  printables/    Kids' World PDFs
scripts/         Build-output checks, contrast, printables, smoke test
tests/e2e/       Playwright + axe browser tests
tests/php/       Form handler and .htaccess tests
```

**Pages** are static HTML. **Scripts** only enhance: every page, link and form works without
JavaScript. **Forms** post to `/contact.php`, which emails the result (Microsoft 365 or
`mail()`); see [docs/DECISIONS.md](docs/DECISIONS.md) §3 and [docs/m365-setup.md](docs/m365-setup.md).

The `/styleguide/` page (not indexed) shows every component and state. Start there.

## Conventions

- **Content-Security-Policy:** no inline `<script>` or `<style>`, no `style=""`, no `on…=`
  handlers. Use plain `<script>` blocks (Astro bundles them) and component `<style>` blocks.
  `pnpm check:dist` enforces it.
- **Colours:** use the semantic tokens (`--color-text`, `--kids-sky` …), never raw hex values.
  Brand colours are fixed. Gold is never text on a light background. Add any new colour pair
  to `scripts/contrast.ts`.
- **Facts** live in `src/config/site.ts`; unknown values start with `TODO:`.
- **Autism wording** always uses `<Term>` (see the content guide).
- **External links** use `<ExternalLink>` (visible ↗, same tab). In Kids' World, use
  `<GrownUpLink>` only (it goes through the "Ask a grown-up" page).
- **JavaScript-only controls** use `data-js-only` (or `data-js-hide`, `data-speech-only`,
  `data-copy-only`) instead of `hidden`, so they never make the page jump. See DECISIONS §8.
- **Motion:** only after a person's action, under one second, never flashing, and off under
  reduced motion, Calm colours or Simplified page.
- **Illustrations in a component:** size them with `:global(.your-class)`. Astro's scoping
  does not reach inside inlined SVGs.
- **Commits:** conventional style (`feat:`, `fix:`, `docs:` …) with a body explaining why.
  No tool or vendor names anywhere in the repository (CI checks files and history).

## How to …

**Add a page.** Create `src/pages/my-page.astro` (served at `/my-page/`):

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PageHero from '../components/PageHero.astro';
import Section from '../components/Section.astro';
---

<BaseLayout title="My page" description="One plain sentence, about 150 characters.">
  <PageHero title="My page" lead="What this page is for." />
  <Section labelledby="first-title">
    <h2 id="first-title">First section</h2>
    <p>…</p>
  </Section>
</BaseLayout>
```

Add it to the menus in `src/config/strings.ts` if needed. It is added to the sitemap and the
browser tests (every sitemap page is tested) automatically.

**Add a Kids' World page.** Same, with `KidsLayout` and `KidsHero` (see `src/pages/kids/`),
and add it to `kidsNav` in `strings.ts`. The safety checks apply automatically.

**Add a story, FAQ, resource or interest.** Copy a file in the matching `src/content/` folder
and edit it. See the content guide, section 4.

**Add a statistic.** Add the source and the figure to `src/config/sources.ts`, then use
`<Stat {...stats.myFigure} />`. See the content guide, section 5.

**Change a fact** (bank details, address, Information Officer): edit `src/config/site.ts`.

**Replace an illustration:** see `src/assets/illustrations/README.md`.

## Branches and releases

- `dev`: work in progress. Every push runs CI.
- `main`: approved code, merged from `dev` by pull request.
- Going live is a separate, approved step: [docs/DEPLOY.md](docs/DEPLOY.md).
- Every change gets an entry in [docs/CHANGELOG.md](docs/CHANGELOG.md).

## Troubleshooting

| Problem                                                    | Fix                                                                                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Production build blocked: … placeholder(s)`               | Fill the `TODO:` values in `src/config/site.ts`, or use `pnpm build:preview` for a preview.                                   |
| The site returns **500** after deploy                      | Rename `.htaccess` on the server and re-enable its blocks one at a time (DEPLOY.md, "If something goes wrong").               |
| CI: `ERR_PNPM_OUTDATED_LOCKFILE`                           | You changed `package.json` without `pnpm install`. Run it and commit `pnpm-lock.yaml`.                                        |
| Browser tests fail on things that look correct             | Rebuild first (`pnpm build:preview`): tests use `dist/`. They serve it on port 4399, so a running dev server is not used.     |
| Playwright: "Executable doesn't exist"                     | `pnpm exec playwright install chromium`, or `PW_CHANNEL=msedge pnpm test:e2e`.                                                |
| `check:dist` reports `style="" attribute` or inline script | Move the style into a component `<style>` or the script into a `<script>` block; never loosen the CSP.                        |
| An illustration is huge                                    | Size it with `:global(.class)` in the component's styles.                                                                     |
| Content jumps when a page loads                            | A script is revealing a `hidden` element. Use `data-js-only` instead.                                                         |
| Lighthouse fails a size budget                             | Check what grew (`.lighthouseci/` reports). Budgets are in `lighthouserc.json`; change them only by decision (DECISIONS §11). |

## Accessibility standards

The site aims for **WCAG 2.2 Level AA**, plus guidance for neurodivergent people:

- W3C, _Making Content Usable for People with Cognitive and Learning Disabilities_ (COGA):
  <https://www.w3.org/TR/coga-usable/>
- UK Home Office, _Designing for users on the autistic spectrum_:
  <https://ukhomeoffice.github.io/accessibility-posters/autism>
- W3C, _Web Content Accessibility Guidelines (WCAG) 2.2_: <https://www.w3.org/TR/WCAG22/>
- Raymaker, D. M. et al. (2019). _Development of the AASPIRE web accessibility guidelines for
  autistic web users._ Autism in Adulthood, 1(2), 146–157.

How it is tested: [docs/a11y-testing.md](docs/a11y-testing.md). The Comfort & access settings
are specified in [docs/comfort-and-access-spec.md](docs/comfort-and-access-spec.md).
