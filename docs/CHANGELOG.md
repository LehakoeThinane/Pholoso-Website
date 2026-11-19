# Changelog

A running record of every update to the website: what changed, why, and what is still open.
Newest first. Add an entry with every change, before it is pushed.

Each entry: date, branch, a one-line summary, what changed, decisions made, and follow-ups.
Open questions for the Foundation live in [open-questions.md](open-questions.md).

---

## 2026-11-19 · `dev` · Glossy colours switch, richer gloss, gentle motion

**Why:** owner direction for the Standard theme: more gloss on the colours, a way to switch the
gloss on and off (the most important part), and reasonable motion.

**What changed**

- **"Glossy colours" switch** in Comfort & access, under the colour choices. On by default; off
  makes every surface flat while keeping the Standard colours (buttons, cards, picture buttons,
  coloured bands, the hero edge glow). Saved on the device and applied before the page draws,
  like the other settings (`data-gloss="off"`). Calm, High contrast, Dim and Simplified page are
  always flat, as before.
- **Richer gloss in Standard:** a brighter, glossier top on surfaces (a bright top fading through
  the middle), slightly more shine on buttons and dark bands. Every text and link colour over the
  gloss still passes contrast (lowest: white on the green button's shiniest point, 5.09:1).
- **Gentle motion:** clickable things (buttons, Donate, doors, picture buttons, toggles) lift 2 px
  on hover and settle when pressed; menu groups slide open; the chevron turns. All under 0.2 s,
  and only when motion is allowed (not with the device's reduced motion, Reduce motion, Calm
  colours or Simplified page). Plain cards do not move, so nothing pretends to be a link.
- **Tests:** axe with gloss off on the sample pages; the switch is on by default, flattens the
  page and is remembered across pages. 198 passed, 0 failed. Lighthouse 100 on all six sampled
  pages; CSS 15.1 KB (budget 16 KB).

---

## 2026-11-19 · `dev` · Four-item menu, labels above headings removed, quotes centred

**Why:** owner direction: a shorter menu on one row between the logo and Donate, no small labels
above headings, and the featured quote centred.

**What changed**

- **Menu: four entries in one row** between the logo and Donate (header 169 px → 91 px tall):
  - Kids' World (its own link, first, as the brief asks)
  - About ▾: About us, Our approach
  - Stories & resources ▾: Stories, Resources
  - Get involved ▾: Ways to help, Contact us
  Groups are native disclosures: they open on click or Enter (not hover), work without
  JavaScript, and announce as collapsed or expanded. One opens at a time; Esc closes it and returns
  focus; a click elsewhere or tabbing away closes it. The group with the current page is
  underlined. On phones the groups open in place inside the Menu. Every page is still in the
  footer.
- **Fixed during testing:** on phones, tapping a second group while one was open could miss
  (closing the first group moved the second under the finger). Taps no longer trigger that
  close.
- **Labels above headings removed everywhere:** all 31 (e.g. "The problem", "What we do",
  "Trust", the page-hero labels, and the hero's "Pholoso Afrika Foundation"), plus "For parents
  and caregivers" on the 2to.iQ box. The option is removed from the Hero, PageHero and
  SectionHeading components, and the triangle-marker style is gone.
- **Quotes centred** (home "In their words" and the Hlompho quote), with a short gold bar above
  instead of a bar down the left.
- **Tests:** new browser tests for the one-row menu (wide screens), groups by keyboard and
  pointer, Esc and click-away, and groups without JavaScript. 191 passed, 0 failed.
- DECISIONS.md §15; HANDOVER.md updated.

---

## 2026-11-18 · `dev` · Header menu, alignment pass, handover update

**What changed**

- **Header menu (wide screens):** the menu now has its own centred row under the logo and
  Donate button. Side by side it needed about 1,255 px but the page allows 1,224 px, so links
  were breaking onto two lines ("About us", "Our approach", "Get involved"). Links no longer
  break at any width.
- **Header (phones):** logo centred on top, Donate and Menu centred below it (they were hanging
  to the left), and the opened menu is centred too.
- **Alignment pass** (every page checked at 1280 px and 390 px):
  - Page-hero labels ("About us", "Donate" …) now sit centred over their headings.
  - Section headings written straight into a page (e.g. "How to give", "Our bank details") are
    centred like the others; About's "Our mission" / "Our vision" too.
  - Lists, tables and forms inside centred cards stay left-aligned (Get involved's tick lists
    were centred, with the ticks stranded on the left).
  - Numbered steps (Our approach, Donate) are centred as a block under their heading; their
    text stays left-aligned.
  - The stories filter row and table captions are centred.
  - Kids' World grids fill the whole row (Kids like me left an empty sixth column); each
    picture story's heading and Read it to me button are centred.
  - Make and do: every Print it button has the same two-line shape.
- **Browser tests:** the comfort-setting accessibility checks run one page per test (45 short
  tests instead of 9 long ones that were close to timing out, because axe works harder with
  the gloss gradients). 186 passed, 0 failed.
- **HANDOVER.md** updated for today's design changes and the 16 KB budget.

**The 9 missing facts:** checked https://pholoso.africa/ on 18 November 2026. It is still the
old single-page site and contains none of them (no bank details, address, Information Officer,
accessibility response time or story provenance), so they remain placeholders.

---

## 2026-11-18 · `dev` · New hero design, gloss everywhere, centred text

**Why:** owner design direction, modelled on a reference layout (a photo bleeding to the edge
behind a shaped border). Design only: no wording, colours or branding changed.

**What changed**

- **Home hero:** the photo fills the right half of the green band, out to the screen edge,
  behind a rounded-point edge (two straight diagonals meeting in a broad rounded tip) with a
  thin deep-green line that glows softly. Pill-shaped buttons, a larger heading, and the text
  centred in the green area. On phones the photo sits under the text, with the same rounded
  point facing up. Without images (Hide images, Simplified page) the text takes the full width.
- **Text animation:** the hero text fades and rises in once as the page opens (staggered,
  under one second). Off with reduced motion, Calm colours or Simplified page.
- **Doors moved under the hero.** "I'm a grown-up → Find out about our work" now goes to the
  first section below ("The problem", `#our-work`) instead of up to the hero.
- **Gloss everywhere in the Standard theme:** a soft sheen on cards, panels, stats, notices,
  page heroes, Kids' World picture buttons, cards, toggles, the doors and coloured bands, not
  only buttons. Off in Calm, High contrast, Dim, Simplified page and forced colours. Components
  now set fills with `background-color`, so one shared rule can add the sheen. The contrast
  script checks text and links over the sheen (all pass, 6.6:1 or more).
- **Centred headings and short text everywhere:** page titles, section headings and intros,
  cards, stats, the call-to-action band, Kids' World headings and hero, the doors. Long
  paragraphs, lists, forms, tables, notices and stories stay left-aligned (owner chose this
  over centring everything; brief §8 readability).
- **One "motion allowed" flag:** `public/prefs.js` sets `data-anim` on the page when motion is
  allowed; CSS animations and the Kids' World scripts both use it.
- **Browser tests:** axe now waits for entrance animations to finish (mid-fade text is partly
  transparent, which gave false contrast failures in High contrast and Dim). The home-page test
  checks the doors come straight after the hero.
- **CSS budget raised to 16 KB** (owner decision); now 14.6 KB.

**Results:** 150 browser tests pass. Lighthouse (3 runs): 100 in all four categories on all
six sampled pages, CLS 0.000. Decisions recorded in DECISIONS.md §11, §13, §14.

**Noticed, not changed:** at about 1280 px wide the main menu is tight, and "About us", "Our
approach" and "Get involved" break onto two lines each.

---

## 2026-11-18 · `dev` · Fix Lighthouse failures in CI (layout shift from fonts)

**Why:** Lighthouse failed in CI (GitHub's Linux machines) although it passed locally:
layout shift 0.049 on About and 0.028 on Stories (budget 0.02), and home performance 0.93.

**Cause:** while Atkinson Hyperlegible loads, the browser shows a fallback font. The fallback
list started with `system-ui`, which on Linux is a much wider font (DejaVu Sans), so lines
rewrapped when Atkinson arrived. Headings also swapped late because only the regular weight
was preloaded, and heading widths were set in `ch` units, which change with the font.

**What changed**

- New `Atkinson Fallback` face (Arial / Liberation Sans, scaled to Atkinson's measured width,
  ascent and descent) placed before `system-ui` (`src/styles/fonts.css`, `tokens.css`).
- The bold weight is preloaded too, not only the regular.
- Heading widths in `PageHero` and `Hero` changed from `24ch` / `18ch` to the same widths in
  `em` (15.65em / 11.74em), so they do not change when the font swaps.
- Lighthouse runs 3 times per page in CI (single runs on shared machines are noisy).

**Results:** reproduced locally by delaying the font 2 seconds with a Linux-like fallback:
phone-size layout shift went from 0.021–0.041 to 0.0002–0.002 on every page. Without a delay
it is 0 on every page at both sizes. Local Lighthouse (3 runs): 100 in all four categories,
CLS 0.000, CSS 13.7 KB (budget 14 KB).

**Known limit:** on desktop, with a deliberately delayed font, a few pages (About, Donate,
Privacy) can still shift 0.03–0.05 because one heading breaks at a different word in the
fallback. Removing that entirely needs `font-display: optional` instead of the brief's `swap`;
not changed. CI tests phone size, where this does not occur.

---

## 2026-11-18 · `dev` · Milestone 9: handover docs, smoke test, optional deploy

**Why:** brief §15 and §18.9: a stranger should be able to maintain and deploy the site from
the docs alone.

**What changed**

- **README.md** rewritten for developers: requirements, every command, how the code fits
  together, conventions, how to add a page / story / statistic / Kids' World page, branches,
  troubleshooting, and the accessibility standards the site follows (COGA, UK Home Office,
  WCAG 2.2, AASPIRE).
- **docs/DEPLOY.md:** step-by-step for a non-technical person: first-time form setup
  (`config.php` outside the web folder), making the release zip, uploading in cPanel with a
  backup first, checking the live site, and what to do if something goes wrong (including
  the 500 error and `.htaccess`).
- **docs/CONTENT-GUIDE.md:** plain-language and terminology rules, `<Term>`, how to cite a
  statistic, where each kind of content lives, writing for Kids' World.
- **docs/DECISIONS.md:** 12 short decision records (Astro; static + PHP; forms; no analytics;
  no sticky header; strict CSP; comfort settings; visibility before first paint; Kids' World
  in the same site; illustrations and sounds; CSS budget; testing).
- **docs/HANDOVER.md:** final report: milestone status, definition of done, the 9 facts still
  to fill in, and every action for the Foundation in order.
- **scripts/smoke-test.mjs** (`pnpm smoke`): post-deploy check of the live site: every sitemap
  page, 404, redirects, security headers, private files blocked, and a test form submission
  that sends nothing (the handler's `test=TEST` flag). The handler comment now points to it.
- **.github/workflows/deploy.yml:** optional SFTP deployment, **off** until set up
  (`DEPLOY_ENABLED` variable, secrets, and a required reviewer on the `production` environment).
  Production build only, uploads without deleting, then runs the smoke test.

**Not done**

- The smoke test was checked against a local preview only, not the live site (it would send a
  test request to production, and the live site may still be the old version).

---

## 2026-11-18 · `dev` · CI fix and CSS budget raised to 14 KB

**What changed**

- **CI install fixed.** The previous push pinned the new test tools to exact versions in
  `package.json` without regenerating `pnpm-lock.yaml`, so `pnpm install --frozen-lockfile`
  failed in CI. The lockfile is regenerated; the frozen install passes locally.
- **CSS budget raised from 12 KB to 14 KB** (Lighthouse, as transferred), and back to failing
  the build when exceeded. Decided by the owner on 2026-11-18: the whole site now uses one
  cached stylesheet (about 13.3 KB as Lighthouse counts it), and Kids' World roughly doubled
  the number of components the original budget was written for.

**Lesson:** after changing `package.json`, always run `pnpm install` so the lockfile matches.

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
