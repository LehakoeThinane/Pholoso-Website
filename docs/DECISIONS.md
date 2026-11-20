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

## 15. Four-item menu with groups; no labels above headings

**Decision:** the header menu has four entries in one row between the logo and Donate: Kids' World,
About, Stories & resources, Get involved. The last three open a short list of pages. Small labels
above headings ("eyebrows") are removed site-wide, including the hero's. Quotes are centred.
Owner decisions, 19 November 2026.

**How:** groups are native `<details>` disclosures: they open on click or Enter, never on hover
(hover menus are hard for keyboard, touch and many neurodivergent users), work without
JavaScript, and announce as collapsed or expanded. `src/scripts/menu.ts` keeps one open at a time
and closes on Esc, a click elsewhere, or keyboard focus leaving the group (not on taps, which would
shift the phone menu under the finger). Every page stays one click inside its group and is also
listed in the footer, so help stays in the same place on every page (WCAG 3.2.6).

## 16. Calls to action in the header; cards that glow and lift

**Decision:** "See how we work" and "Donate" sit in the top-right corner of a full-width header
instead of in the home hero. Cards (statistics and regular cards) have a soft gold glow and lift
slightly on hover. Owner decisions, 19 November 2026.

**Notes:** "See how we work" needs about 1280 px of screen to fit beside the menu; narrower
screens show Donate alone (the page stays in the menu under About). The brief asked for Donate
and "See how we work" in the hero; the owner moved them. Cards lifting on hover is decorative
(most cards are not links): it is small (3 px), short, and only runs when motion is allowed. The
glow is part of the gloss and switches off with it.

## 17. Parent Guide: scripted first, AI later and off

**Decision:** build the Parent Guide (brief §7b) as a guide written by people first. Every step
is a real page (`/parent-guide/<topic>/<step>/`), so it works without JavaScript; with
JavaScript the same content runs as a chat on one page, loaded from `/parent-guide/guides.json`
(built from the same files). The AI phase is not built yet. Owner decision, 19 November 2026.

**Why:** the scripted guide is free to run, fully under the Foundation's control, and safe to
review line by line. The AI phase only makes sense once the scripted content has been reviewed
and the Foundation has chosen a budget, helplines and privacy wording.

**Notes:**

- Nothing is sent anywhere: settings (names, an interest) stay in the browser; the message box
  searches the guide and a list of site pages on the device; danger words (src/config/guide.ts)
  show "Need help now?" with general emergency wording until verified numbers are supplied.
- The guide's styles are a separate stylesheet loaded only on guide pages, so the site-wide CSS
  does not grow; its script loads only there too (about 10 KB of script on a guide page).
- Unreviewed topics: "Draft – under review" on every reply, step pages `noindex`, and a build
  warning. Step pages are never in the sitemap: `/parent-guide/` is the way in.
- Not in the four-item menu (the owner's four tabs); linked from the home page, the footer, and
  the guide's own search. Could join "Stories & resources" once reviewed.
- The home-page demo never plays by itself. All three steps are shown still; "Play demo" replays
  them one at a time, only when motion is allowed, with "Turn off motion" while playing.

## 18. Parent Coach (brief v4): built in three stages, off until approved

**Decision:** brief v4 replaces the scripted guide with an AI coach (onboarding, a fixed
eight-stage coaching arc, optional accounts). The scripted Parent Guide stays as the fallback
when the coach is off, resting (budget reached) or unavailable. The coach is built in three
stages: (1) the screens and message cards against a practice script, (2) the database, sessions
and PHP API, (3) accounts, reminders and deletion. Owner decisions, 19 November 2026.

**How it is switched:** `COACH_MODE` (src/config/coach.ts): `off` in production (the landing page
says it is not open yet and points to the Parent Guide; no draft strategy is published),
`mock` in preview builds and tests (a practice script in the browser, clearly labelled, sends
nothing), `live` from Stage 2.

**Notes:**

- The practice script returns exactly the reply format the AI must return
  (`{ blocks, choices, placeholder, next_stage, safety_flag }`, src/scripts/coach/types.ts), and
  only uses strategies from the library, so Stage 2 swaps the engine, not the screens.
- Session address: `/parent-coach/chat/?s=<id>` for now (works on any static host); Stage 2 adds
  `/parent-coach/s/<id>/`, rendered by PHP so it also works without JavaScript.
- Without JavaScript, Stage 1 onboarding and chat point to the Parent Guide; Stage 2 makes them
  plain forms posted to the server, as the brief asks.
- Replies appear block by block when motion is allowed and all at once otherwise; the
  conversation is marked busy until a reply is complete, so screen readers announce it once.
  (The brief's word-by-word streaming would make screen readers announce fragments.)
- "Get started" is not sticky: nothing on the site covers content (same reason as the header).
- Voice input needs the microphone, so the Permissions-Policy now allows it for this website
  only (`microphone=(self)`); the browser still asks the parent first, and a note says the
  browser may send the voice to its maker. Nothing is recorded by us.
- Continue buttons use `aria-disabled` rather than `disabled`, so keyboard and screen-reader
  users can still reach them and hear why they cannot continue yet.
- Never copies Understood's text, illustrations, colours or name; only the kind of flow.

## 19. Parent Coach Stage 2: PHP API, MySQL, and the AI only within a fixed arc

**Decision:** the coach's server side is plain PHP 7.4+ (no Composer) under `public/api/coach/`
and `public/lib/coach/`, with MySQL through PDO and prepared statements. The AI provider is
called over HTTPS with cURL (the brief's choice for shared hosting). Owner confirmed MySQL, 19
November 2026.

**How the AI is kept on the path:**

- The server decides the stage; the AI writes only the words for that stage. Its `next_stage`
  can only move forward one step or stay (to answer a question); anything else is corrected.
- Every reply must match a JSON schema (the API's structured outputs), and the server checks it
  again. A strategy that is not in the approved library is rejected; titles always come from the
  library. A reply that fails is retried once, then the parent sees "please try again" and
  nothing is saved.
- The opening question, choosing a child, the turn limit, "the coach is resting" and the
  closing card need no AI.

**Defaults (all in the private config):** model `claude-opus-5-5`, effort `medium`, refusal
fallback on, 25-second timeout, 15 turns per conversation, 40 requests per visitor per hour, a
daily budget of US$5 estimated from the token counts the provider reports. The system prompt
and the library are sent first and marked for caching, so most of each request is billed at
the cached rate.

**Privacy:** ID numbers, phone numbers and email addresses are removed before anything is stored
or sent. Danger words are checked in the browser and on the server before the AI is asked; the
AI can also flag an emergency. Conversations are deleted 30 days after they start.

**Notes:**

- Replies are not streamed: shared hosting usually buffers output, and a non-streamed reply is
  announced once by screen readers. The page shows "The coach is thinking…" instead.
- Without JavaScript, `/parent-coach/s/<id>/` is drawn by PHP from the built chat page, so the
  look stays the same; answers and the message box become plain forms.
- Tests never call the real API: `tests/php/mock-ai.php` stands in for it, with SQLite in place
  of MySQL (the migration is written so both accept it).
- The production build keeps the coach off (`COACH_MODE` unset). `pnpm build:live` builds the
  live version once the Foundation approves it, and `enabled` in the private config is a second
  switch that can turn it off without a new upload.

## 20. Pholo: the approved files, moving only on a trigger

**Decision:** Pholo (brief v5 §10b) is drawn from the Foundation's approved SVG files without
changes. The still poses are shown whenever Pholo is not moving; while a movement plays, the
approved movement file is shown in the same place and size. 20 November 2026.

**How the movements stay under control:** the approved movement files use SVG's own animation
(SMIL). At build time every animation is changed to wait for a hidden trigger that belongs to
that Pholo (`src/lib/pholo.ts`), so nothing can start by itself. `src/scripts/pholo.ts` fires
the trigger only on its event (arriving on a Kids' World page once per visit, a tap, finishing
an activity, Start in the Calm corner, read-aloud) and only when motion is allowed. Switching
motion off mid-way, or leaving the page, stops every movement and shows the still pose.

**Why SMIL and not CSS keyframes (the brief's preference):** the approved movements were made
in SMIL; converting them to CSS would mean redrawing the timing and pivot points by hand, and
any difference would change approved artwork. With the trigger approach the motion rules the
brief cares about hold anyway: one switch (`data-anim`) decides, and nothing loops by itself.
Trigger IDs use underscores: in SMIL timing a hyphen means "minus", so `a-go.begin` would never
start (found and fixed while building; a test now checks that the arm really rotates).

**Later upgrade path:** if a professional animator joins, Pholo can be rebuilt in Rive (state
machines suit a character that reacts to events), keeping the same pose names (`hello`,
`thinking`, `celebrate`, `calm`, `talk`) and triggers, so pages do not change. Not added now.

## 21. Kids' World fonts and stylesheet

**Decision:** Kids' World uses Fredoka (headings, buttons) and Andika (reading text, at least
22px); grown-ups' pages keep Atkinson Hyperlegible. Each world preloads only its own fonts. The
Kids' World styles and fonts are a separate stylesheet linked by KidsLayout only, so grown-ups'
pages never download them (the shared stylesheet shrank from 14.7 KB to 14.0 KB).

**Notes:** both fonts have metric-matched fallback faces (Arial adjusted to each font's size and
line height), so text does not jump when the real font arrives. Fredoka has no glyphs for the
Tshivenda letters ḓ ḽ ṅ ṋ ṱ; the font stack falls back to Andika for those letters only, as the
brief asks. The font token `--font-kids-display` is the one place to change if the Foundation
chooses Baloo 2 or Grandstander instead.

## 22. A separate stylesheet budget for Kids' World

**Decision:** Kids' World pages may load up to 20 KB of stylesheets; every other page keeps the
16 KB budget. Owner decision, 20 November 2026.

**Why:** Kids' World pages load the shared stylesheet plus their own (the kids' fonts, colours
and, next, the graphics kit). The brief's own limit for a whole Kids' World page is 250 KB on
first visit, so 4 KB more styling is small. The alternative (splitting the grown-ups' header,
footer and hero styles into their own file) stays available if the kids' styles grow further.

