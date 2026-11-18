# Changelog

A running record of every update to the website: what changed, why, and what is still open.
Newest first. Add an entry with every change, before it is pushed.

Each entry: date, branch, a one-line summary, what changed, decisions made, and follow-ups.
Open questions for the Foundation live in [open-questions.md](open-questions.md).

---

## 2026-11-18 · `dev` · Milestone 8: quality gate (tests, budgets, fixes)

**Why:** brief §17–§18: every page tested automatically in CI before anything ships.

**What changed**

- **Browser tests** (`tests/e2e/`, Playwright + axe) at 390×844 and 1280×900: every page
  (from the sitemap) loads with no console errors or third-party requests, has one `<h1>`,
  passes axe (WCAG 2.0–2.2 A/AA + best practice), and the first Tab is a working skip link.
  Plus: each Comfort & access setting under axe, settings persistence and reset, keyboard
  journeys (menu, panel, filters, explorer), every form's error summary, mocked send success
  and server errors, legacy hash redirects, the home doors, no-JavaScript behaviour, and all
  Kids' World rules (sound, celebrations, breathing, flashing, nothing sent).
  Result: **150 passed, 0 failed** (10 skipped on purpose: size-specific tests).
- **HTML validation** (`pnpm check:html`) and an offline **internal link and anchor check**
  (`pnpm check:links`, 731 links). External links are reported in CI without failing it.
- **Lighthouse CI** (`pnpm test:lighthouse`) with the brief's mobile budgets.
- **CI** now runs on `dev`, with a new browser job (Playwright, axe, Lighthouse) and reports
  uploaded as artifacts.
- **Manual screen-reader script** in [a11y-testing.md](a11y-testing.md) (NVDA + Firefox,
  VoiceOver + iOS). Not yet run.

**Fixed (found by the new checks)**

- **Layout shift (CLS) 0.287 → 0.000–0.012.** Script-only controls were revealed after the
  first paint, pushing content down (worst: the phone menu collapsing). Visibility is now set
  by CSS before the first paint from classes `public/prefs.js` adds (`js`, `can-speak`,
  `can-copy`), using `data-js-only`, `data-js-hide`, `data-speech-only`, `data-copy-only`.
  Lighthouse performance went from 85–86 to 100 on the sampled pages.
- **CSS** is now one cached stylesheet for the whole site (was ~10 small files per page), with
  class-based scoping: 13.6–15.8 KB → 13.3 KB as Lighthouse measures it.
- 404 page no longer declares a canonical URL (it pointed to `/404/`, which does not exist);
  `check-dist` now requires canonicals only on indexable pages, and forbids them on noindex ones.
- Home page title shortened from 90 to 64 characters (search results cut it off).
- Removed `aria-label` from definition lists (not reliably announced; headings name them).
- Anchor `#2toiq` renamed `#for-parents` (IDs starting with a digit break CSS selectors).

**Results (Lighthouse, mobile, 6 sample pages):** Performance 100, Accessibility 100, Best
Practices 100, SEO 100 on every page. LCP 0.9–1.7 s. JS 8–10.6 KB. Home page 148 KB in total.

**Decision needed**

- **CSS budget:** the whole site's CSS is 12.3 KB gzipped (13.3 KB as Lighthouse counts it,
  with headers), against a 12 KB budget written before Kids' World. The Lighthouse check is set
  to **warn** for CSS only, until the Foundation chooses: raise the budget to 14 KB, or trim.
  Every other budget fails the build.

**Follow-ups**

- Run the manual screen-reader script and record results.
- The no-JavaScript form post to `/thank-you/` needs PHP; it is covered by `tests/php/`, not
  the browser tests.

---

## 2026-11-18 · `dev` · Parents pointed to 2to.iQ

**Why:** parents should be able to find learning activities they can use now, while our own
guides are still being written. 2to.iQ (our edtech partner) offers them.

**What changed**

- New `PartnerForParents` callout ("For parents and caregivers: learning activities from 2to.iQ")
  on Our approach (`/approach/#2toiq`), Resources (top of page) and Contact (sidebar).
- Home page 2to.iQ section: added a line and link for parents.
- Kids' World: the grown-ups' footer and the Make and do grown-ups' note link to
  `/approach/#2toiq`. Kids' World itself still never links straight to another website.

**Decisions**

- Links go to `https://2toiq.africa` (`partner.url` in `src/config/site.ts`), not the temporary
  `netlify.app` preview address of the Thinking Lab. Change `partner.url` to update every link.
- The description only repeats what 2to.iQ says about itself, and says it is a separate company
  with its own privacy notice (it has accounts and stores personal information; this site does not).

**Follow-ups**

- Confirm the address parents should land on (main site or the Thinking Lab app).
- Optional: add a referral tag to the links if 2to.iQ wants to count visits from this site.

---

## 2026-11-18 · `dev` · Kids' World and the home-page doors (brief v2)

**Why:** the v2 brief makes children the heart of the site: "a happy place" that is joyful by
default and calm on request.

**What changed**

- **Home page:** two big doors at the top, "I'm a kid → Come and play!" and "I'm a grown-up →
  Find out about our work". Kids' World is first in the main navigation.
- **Kids' World (`/kids/`)**, with its own header and footer (no Donate, no sign-ups):
  - Home: mascot "Pholo" (waves when tapped), six picture doors, a daily "Did you know?" fact.
  - What do you love?: nine interests, four tap-to-reveal idea cards each, and
    "You're a great learner!" with a short star burst when all four are open.
  - Calm corner: opt-in breathing exercise (Start/Stop, ends by itself), calming idea cards,
    softer colours.
  - Make and do: four printable PDFs (2–7 KB each).
  - Kids like me: five short picture stories about made-up children's strengths.
  - Our gallery: pictures of the mascot until real drawings arrive.
  - How do I feel today?: seven feeling faces; nothing is saved or sent.
  - "Ask a grown-up" gate for any link to another website (none yet).
- **Header toggles:** "Calm colours" (one tap) and "Sounds" (off by default; always off in Calm).
- **Grown-ups:** new `/share-a-drawing/` page; privacy notice covers gallery drawings and says
  Kids' World collects nothing from children.
- **Illustration starter set** in `src/assets/illustrations/` (mascot, five children, icons,
  feeling faces), replaceable by an illustrator without code changes (see its README).
- **Content** in YAML files with schemas: `src/content/kids/` (interests, stories, facts, feelings).
- **Checks:** `pnpm check:dist` now fails if any Kids' World page mentions donating, has a form,
  a sign-up or share button, links straight out, lacks "Read it to me" or the "Need help now?"
  note, or if a PDF is over 300 KB or an animation could flash. The contrast script checks the
  new palette in every theme.

**Decisions**

- Built on the existing Comfort & access settings (added a `sound` setting) instead of a
  second settings system.
- Every animation is child-triggered, under one second, and off under reduced motion, Calm
  colours or Simplified page. The breathing shape is the only continuous animation.
- Tap sounds are made by the browser (no sound files to download).

**Follow-ups**

- Owner decisions K1–K9 in [open-questions.md](open-questions.md) (mascot name, illustrator,
  facts and stories approval, gallery process, helpline, child-safe external links).
- Milestone 8: Playwright and axe tests for Kids' World in CI.

---

## 2026-11-18 · Repository setup

- Created the `dev` branch from `main` (which includes the merged rebuild, PR #5). New work
  lands on `dev` first.
