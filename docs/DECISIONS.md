# Decisions

Short records of the main technical decisions: what was decided, why, and what it costs.
Add a new record when a decision changes; do not rewrite old ones, mark them "Replaced by".

---

## 1. Astro, building plain HTML

**Decision:** build the site with Astro (static output, TypeScript strict), using only Astro
components, no React or Vue.

**Why:** Astro produces plain HTML pages with no JavaScript unless a page asks for it, so
pages are small, fast on expensive mobile data, and work without JavaScript. Components keep
the code maintainable, and Astro optimises images (AVIF and WebP, right sizes) at build time.

**Cost:** someone needs Node.js and pnpm to build a release. Content edits are file edits, not
a web editor (see 2).

## 2. Static files plus one PHP form handler, on the existing hosting

**Decision:** the website is a folder of static files plus `contact.php`, uploaded to the
existing GoDaddy shared hosting. No database, no content management system.

**Why:** the hosting runs Apache and PHP but not Node.js, and the brief requires keeping it.
Static files are the most secure, cheapest and fastest option: nothing on the server can be
hacked into changing pages, and there is no database to back up. A CMS (an earlier option)
would need a different host and running costs.

**Cost:** editors change content in files (Markdown and YAML, checked by the build), and a
developer makes each release. If the Foundation later needs non-technical editors working
weekly, revisit this (a Git-based editor can sit on top of these same files).

## 3. Forms: one handler, email only, nothing stored

**Decision:** one PHP handler for contact, updates and Section 18A receipt requests. It checks
the form again on the server, protects against spam (hidden honeypot field, timing, rate limit
per scrambled IP address), and emails the result. Nothing personal is stored on the web server.
Email goes through Microsoft 365 (Microsoft Graph, permission for one mailbox only), with PHP
`mail()` as an alternative; the sending method can be swapped without touching the forms.

**Why:** POPIA: collect only what is needed and keep it out of places it could leak from.
Email from shared hosting with `mail()` is often rejected by the domain's own SPF and DMARC
protection, so Microsoft 365 is the reliable route. Until it is set up, forms say honestly that
nothing was sent.

**Cost:** someone with Microsoft 365 admin rights must do the one-time setup
([m365-setup.md](m365-setup.md)), and renew the client secret before it expires.

## 4. No analytics, no tracking, no third parties

**Decision:** no analytics, tracking pixels, embeds, cookie banners, web fonts from other sites
or CDNs. Everything is served from pholoso.africa. A strict Content-Security-Policy enforces it.

**Why:** privacy (POPIA) and child safety: Kids' World must collect nothing from children.
It also makes pages faster and removes the need for a cookie banner, which is a barrier for
many neurodivergent visitors.

**Cost:** no visitor numbers. If the Foundation wants them later, a cookieless, self-hosted
tool can be added, with an update to the privacy notice (open question 7 in the brief).

## 5. No sticky header

**Decision:** the header scrolls away with the page.

**Why:** a header that stays fixed on screen can cover the item a keyboard user has just
moved to (WCAG 2.2, 2.4.11 Focus Not Obscured). It also takes space on small phones and adds
movement, which some visitors find hard. The skip link and the same menu on every page keep
navigation easy.

## 6. Strict Content-Security-Policy: no inline scripts or styles

**Decision:** `default-src 'self'` with no `'unsafe-inline'`. Every script and stylesheet is an
external file; no `style=""` attributes.

**Why:** blocks a whole class of attacks (injected scripts), and proves no third-party code
runs. `pnpm check:dist` fails the build if anything inline appears.

**Cost:** some Astro defaults (inlining small scripts and styles) are switched off in
`astro.config.ts`. Scripts set styles only through the DOM, never with `style=""`.

## 7. Comfort & access settings saved only in the browser

**Decision:** settings (colours, text size, motion, wording, sounds) are saved in the
visitor's own browser (`localStorage`), applied by a tiny script in `<head>` before the page
draws (`public/prefs.js`).

**Why:** no account and no data sent anywhere, and no flash of the wrong colours.

## 8. Visibility decided before the first paint

**Decision:** controls that need JavaScript are shown or hidden by CSS, using classes
`prefs.js` sets before the page draws (`js`, `can-speak`, `can-copy`) and the attributes
`data-js-only`, `data-js-hide`, `data-speech-only`, `data-copy-only`.

**Why:** revealing them later made content jump (layout shift 0.287; budget 0.02). Without
JavaScript, everything still shows and works.

**Cost:** in the rare case where `prefs.js` runs but the page scripts fail, a few controls
appear that do nothing. The content itself is never hidden by this.

## 9. Kids' World inside the same site

**Decision:** Kids' World (`/kids/`) is part of this site, with its own header, footer and
rules, not a separate site.

**Why:** one place to maintain, one set of accessibility and privacy protections, and an easy
path for a parent between the two. Its child-safety rules (no fundraising, forms, sign-ups,
share buttons or direct links out; Read it to me and a help note on every page) are checked
automatically on every build and in the browser tests.

## 10. Original SVG illustrations, inlined; sounds made by the browser

**Decision:** a starter set of simple, original SVG illustrations, inlined into pages; tap
sounds generated by the browser (Web Audio); read-aloud with the browser's own voice.

**Why:** no extra downloads, recolourable for Calm and Dim themes, replaceable by a
professional illustrator file by file (`src/assets/illustrations/README.md`). Sounds need no
files and are off by default.

## 11. One stylesheet; CSS budget 16 KB

**Decision:** all CSS is bundled into one file, cached after the first page. The Lighthouse
budget for CSS is **16 KB** (as transferred). Owner decisions: 12 KB → 14 KB on 18 November
2026 (Kids' World roughly doubled the components), then 14 KB → 16 KB the same day, to keep
the gloss on all surfaces, the hero edge glow, the hero text animation and centred headings.
Any growth past 16 KB fails the build.

## 12. Tests run on every push

**Decision:** CI runs lint, type checks, contrast, built-output checks, HTML validation,
internal links, PHP tests, Playwright with axe at phone and desktop size, and Lighthouse
budgets. Work goes to `dev` first; `main` holds approved code; deploying is a separate,
approved step.

**Why:** accessibility and child safety are the product, so they are tested like features.

## 13. Centred headings and short text; long text left-aligned

**Decision:** page titles, section headings, intro sentences, the hero, cards, call-to-action
bands, Kids' World headings and picture buttons are centred. Long paragraphs, lists, forms,
tables, notices and stories stay left-aligned. Owner decision, 18 November 2026.

**Why:** the owner wanted a centred look. The brief (§8) and W3C COGA guidance ask for
left-aligned body text, because centred long text is harder to follow, especially for
dyslexic and neurodivergent readers; keeping long text left-aligned honours both.

## 14. Home hero design and its one entrance animation

**Decision:** the home hero has the photo filling the right of the band behind a rounded-point
edge with a thin, softly glowing deep-green line, pill buttons, and centred text that fades and
rises in once as the page opens (staggered, finished in under a second). Owner decisions,
18 November 2026.

**Why and limits:** the brief says nothing should move on its own. This is a deliberate,
owner-approved exception, kept small: it runs once, never repeats, never hides text if it does
not run, and is switched off by the device's reduced-motion setting, Reduce motion, Calm
colours and Simplified page (one flag, `data-anim`, set by `public/prefs.js`). The
glow, like all gloss, appears only in the Standard theme.
