# Changelog

A running record of every update to the website: what changed, why, and what is still open.
Newest first. Add an entry with every change, before it is pushed.

Each entry: date, branch, a one-line summary, what changed, decisions made, and follow-ups.
Open questions for the Foundation live in [open-questions.md](open-questions.md).

---

## 2026-11-20 · `dev` · Fix: Kids' World layout shift; separate stylesheet budget

**Why:** CI's Lighthouse found two problems on Kids' World after part 1.

**What changed**

- **Layout shift on /kids/ (0.049, budget 0.02):** when Pholo's greeting started, his still
  drawing was swapped for the moving one, which counted as a shift. Both drawings now sit in the
  same place and only their visibility changes. Measured locally: 0.
- **Stylesheet size on Kids' World (17.9 KB, budget 16 KB):** removed a font weight Kids' World
  does not use and shortened the font character ranges; and, as the owner decided, Kids' World
  pages now have their own budget of 20 KB (other pages keep 16 KB). DECISIONS §22.

---

## 2026-11-20 · `dev` · Brief v5, part 1: Pholo, the kids' fonts and colours

**Why:** the Foundation sent brief v5 and a reference pack: the approved mascot Pholo (five
poses, still and moving), a mood board, and new Kids' World fonts and colours. This is the first
part; the Kids' World redesign, read-aloud audio and the grown-ups' additions follow.

**What changed**

- **Pholo, the approved mascot, replaces the starter mascot everywhere**, drawn from the
  approved files without changes, in five poses: hello, thinking, celebrate, calm and talk.
- **Pholo moves only on a trigger:** he waves once when a child arrives on a Kids' World page,
  and again when tapped; jumps for joy when a child finishes "What do you love?"; breathes in
  the Calm corner after Start (8 seconds a breath, inside his growing and shrinking circle) until
  Stop; and thinks while the Parent Coach writes a reply. With reduced motion, Reduce motion,
  Calm colours or Simplified page he stays still, and switching motion off stops him at once.
- **Calm corner:** Pholo replaces the plain breathing circle; the big number countdown stays.
- **Kids' World fonts:** Fredoka for headings and buttons, Andika for reading (at least 22px),
  with Latin Extended so South African letters render. Kids' World preloads only these;
  grown-ups' pages only Atkinson.
- **Kids' strong colours:** ocean, berry, grape and coral-strong (white text), with versions for
  Calm, High contrast and Dim. All pass the contrast check.
- **Kids' World styles are now a separate stylesheet**, so grown-ups' pages load less.
- **`reference/`** (the Foundation's source pack) is kept out of git and out of lint.
- **Docs:** DECISIONS §20 (Pholo) and §21 (fonts); new `docs/CREDITS.md`.

**Checks:** new Pholo tests: the still poses are the approved artwork; each movement starts only
on its trigger and ends; the arm really rotates and the breathing circle really grows; nothing
moves when motion is off; no movement can flash; nothing waits on a timer.

**Found and fixed while building:** Pholo's movements did not start at first (a hyphen in the
trigger name means "minus" in SVG timing). The first tests only checked a flag, so they passed;
the new test checks real movement.

---

## 2026-11-19 · `dev` · Fix: two Parent Coach tests failed on GitHub (Linux)

**Why:** the PHP jobs failed on GitHub while passing on the development computer. Both causes were in the tests, not the coach.

**What changed**

- **Switched off:** the test changed the settings file while its server was running. On Linux, PHP caches files it has read for a few seconds, so the server still saw the coach as on. The check now uses its own server. DEPLOY.md notes that switching the coach off can take a few seconds (up to a minute on some hosting).
- **Another website is refused:** the test sent two `Origin` headers; older PHP versions read the first. It now sends one. The coach's check was correct.

**Checks:** 64 PHP checks pass locally, including with PHP's file cache switched on. The rest of the GitHub run (browser tests, Lighthouse, live mode) had already passed.

---

## 2026-11-19 · `dev` · Parent Coach, Stage 2 (server, database, AI behind switches)

**Why:** owner direction: continue with Stage 2, build for MySQL, and install PHP locally so the
server code is tested before it is pushed.

**What changed**

- **Database:** `server/migrations/001_coach.sql` (sessions, messages, feedback, and the tables
  Stage 3 needs for accounts). Run once in phpMyAdmin.
- **Server (`public/api/coach/`):** start a session, take a turn, skip to the end, rate, give
  feedback, and open a saved session. Each session has its own address,
  `/parent-coach/s/<id>/`, kept for 30 days.
- **The AI:** called only from the server, with the key in the private config. The server keeps
  the fixed arc; every reply must match the coach's message format and may only use approved
  strategies. Failed replies are retried once, then "please try again".
- **Safety and privacy:** danger words checked on the server too; the AI can flag an emergency
  or a concern; ID numbers, phone numbers and emails removed before storing or sending.
- **Limits:** 15 turns per conversation, 40 requests per visitor per hour, 25-second timeout, a
  daily budget (the coach "rests" until tomorrow and points to the Parent Guide).
- **Without JavaScript:** onboarding is one plain form, and the chat page is drawn by the
  server with answers and the message box as plain forms.
- **Browser:** the chat screen now works with either the practice script or the server, with no
  visible difference; errors keep the parent's message in the box.
- **`/coach-health.php`:** says, in plain words, whether the hosting has everything the coach
  needs, without showing any secret.
- **Privacy notice:** a Parent Coach section, shown only when the coach is live (for the POPIA
  review).
- **Docs:** DEPLOY.md "Parent Coach" steps; config.example.php `coach` section; DECISIONS §19.
- **PHP installed on the development computer** (PHP 8.3, with the database and cURL
  extensions), so all PHP tests now run locally as well as in CI.

**Checks:** 64 new PHP checks (the full arc, schema and library checks, invented strategies,
non-JSON replies, refusals, timeouts, provider errors, emergencies, concerns, privacy stripping,
turn limit, budget, rate limit, no-JS flow, expiry and deletion, switched off, health check). 6
new live-mode browser tests (phone and desktop). The AI provider is never called by any test.

**Follow-ups:** Stage 3 (passwordless accounts, reminders by cron, self-service deletion).
Owner: approve strategies, helplines, privacy wording and budget; create the database.

---

## 2026-11-19 · `dev` · Fix: repository check flagged "Regenerated with pnpm"

**Why:** CI failed on the repository check. It looked for the words "generated with" anywhere in commit messages, and an earlier message says "Regenerated with pnpm 9.15.9". Nothing credited a tool.

**What changed:** the check now looks for tools named as author, committer or co-author, and for "Generated with/by" lines that name a tool. Verified against the whole history (clean) and against a sample credit line (caught).

---

## 2026-11-19 · `dev` · Parent Coach, Stage 1 (screens against a practice script)

**Why:** brief v4 replaces the scripted guide with an AI Parent Coach. Owner decisions: keep the
Parent Guide as the fallback, and build the coach in stages. This is Stage 1.

**What changed**

- **`/parent-coach/`:** landing page with a child and the mascot, "Welcome to Pholoso Parent
  Coach (Beta)", one sentence on who it is for, three promise cards (free, checked by
  professionals, your information is yours), the how-it-works demo, and Get started.
- **Onboarding (`/parent-coach/start/`):** one question per screen: your name, your children
  (add or remove rows), one screen per child for learning and thinking differences (autism
  included), and an important note about AI and privacy. Back, Skip, Continue, and a segmented
  progress bar with "Step 2 of 5" as text.
- **Chat (`/parent-coach/chat/`):** "Welcome, Sam!", the first question with big buttons, then
  chips above the message box; a placeholder that fits each question; voice input where the
  browser supports it; message actions (Good response, Bad response with "What went wrong?",
  Copy text, Listen); "Jump to latest reply".
- **Message cards:** reassurance, explanation, "A strategy to try", "Say this", "How to introduce
  it", "Your plan for Luna" (when it's calm / when screen time ends / right after), a tip for
  pushback, "Save your progress" (accounts come in Stage 3), and a closing card with a 1–5 star
  rating and "Start a new conversation".
- **The coaching arc:** ask → reassure and explain → offer one strategy → the child's interests
  → where → the plan → pushback → close. All four answers at the second step rejoin the arc.
  Free text works at every step. Two children: the coach asks which one first.
- **Practice script, not AI:** replies come from a fixed script in the browser, labelled on
  every coach page. It uses the same reply format the AI will use in Stage 2. Nothing is sent.
- **Strategy library:** two draft screen-time strategies (Next-up activity, Countdown you can
  see), marked draft. Only approved ones will ever reach the AI.
- **Safety:** danger words end the coaching and show "Need help now?".
- **Production:** the coach is off: the landing page says it is not open yet and points to the
  Parent Guide; no draft strategy is published.
- **Microphone:** allowed for this website only, for voice input (was blocked everywhere).

**Checks:** 26 new browser tests (onboarding with and without skips and with two children, the
full arc to the rating, each branch, free text, placeholders, actions by keyboard, reload,
danger words, no-JS, nothing sent). Chat page script about 11.5 KB, plus 2.5 KB for the
practice script in preview builds (budget 15 KB). Coach styles load only on coach pages.

**Follow-ups:** Stage 2 (database, sessions, PHP API, AI behind a switch, no-JS forms), Stage 3
(passwordless accounts, reminders, deletion). Owner: name, first topic, strategy reviewer,
helplines, privacy wording, budget.

---

## 2026-11-19 · `dev` · Parent Guide, Phase 1 (scripted guide)

**Why:** owner direction: start the Parent Guide from the brief (§7b), the scripted part first.
Also: the project rule is now clarified as "no tool credited as an author or co-author".

**What changed**

- **New pages:** `/parent-guide/` (welcome, topic buttons, how-it-works demo) and a page for
  every step of every topic (34 steps across 7 topics), so the guide works without JavaScript.
- **Seven draft topics** (`src/content/guides/`): meltdowns and big feelings; screen time and
  transitions; sleep and routines; talking to my child's school; sensory overload; getting an
  assessment in South Africa; looking after myself. Each step: one short message, up to three
  ideas, "Learn more" links to site pages, two or three answers. All marked **Draft – under
  review**.
- **Chat:** with JavaScript, answers become buttons and replies are added on the same page.
  Focus moves to the new answers; the conversation is a polite live log for screen readers.
  Under every reply: Helpful, Not helpful, Copy, Listen, Report a problem.
- **Message box:** searches the guide's topics and key site pages on the device. Danger words
  (for example "not breathing", "abused") stop the guide and show **Need help now?** with general
  emergency wording (no helpline numbers until the Foundation supplies verified ones).
- **Settings:** your first name, your child's name and something they love, saved only in the
  browser; they personalise the messages ("When Luna has a big feeling…"). "Clear everything"
  removes them and the conversation.
- **Info panel:** what the guide is and is not (no diagnosis, treatment or therapy), draft
  status, privacy, and Need help now?
- **Home page:** new section "Help for parents, right now" with a still demo of the guide (Play
  demo replays it, only when motion is allowed) and a "Try the Parent Guide" button.
- **Footer:** Parent Guide added under Explore. Not added to the four-item menu.
- **Privacy notice:** says the guide's settings stay in the browser and nothing is sent.
- **Build:** warns about unreviewed topics and missing helplines (does not block).
- **CI:** the repository check now looks for tools credited as authors, committers or
  co-authors, instead of banning the word everywhere.
- **Caching:** `.json` files are re-checked like pages, so guide updates show straight away.

**Checks:** 28 new browser tests (no-JS crawl reaches every step, chat, keyboard, search,
danger words, settings, actions, axe with drawers open, demo with and without motion).
Guide page script about 10 KB (budget 15 KB); the guide's 1.4 KB stylesheet loads only on guide
pages.

**Follow-ups:** professional review of all seven topics; verified helpline numbers; confirm the
name; Phase 2 (AI replies) only after those.

---

## 2026-11-19 · `dev` · Header calls to action, card design, 2to.iQ section structure

**Why:** owner direction: move the hero's buttons to the top-right corner, fix the design of the
cards (with motion and a glowing, shadow-like border), make the two doors the same size, and
structure the green 2to.iQ section properly.

**What changed**

- **Calls to action in the top-right corner:** "See how we work" and "Donate" now sit together at
  the far right of the header (pill buttons). The header spans the full screen width, so the
  logo is at the far left and the buttons at the far right. The hero no longer has its own
  buttons; its text sits centred in the green.
  - "See how we work" shows from 1280 px wide (it needs the room); narrower, Donate shows alone
    and the same page is in the menu under About.
  - The one-row menu now starts at 1056 px (was 992 px, where Donate ran 26 px off the screen).
    Checked at nine widths from 390 to 1882 px: nothing overflows, margins are even.
- **Stat cards** ("Up to 70%", "About 1 in 127"): a proper card with rounded corners, a soft
  border, the gloss and a short gold bar above the figure. The source sits at the bottom with
  room for two lines, so the dividers and sources line up across the row.
- **Card glow and motion:** stat cards and regular cards have a soft warm-gold glow around the
  edge and a gentle shadow. On hover the glow brightens and the card lifts 3 px (lift only when
  motion is allowed). The glow follows the Glossy colours switch and is off in the flat themes.
- **Doors:** "I'm a kid" and "I'm a grown-up" are now exactly the same size (were 1.25 : 1).
- **2to.iQ section:** the heading and introduction (what 2to.iQ is, the *thuto* name) centred on
  top, then two matching panels side by side, "Who does what" and "For parents and caregivers",
  with their headings level and left-aligned text. Same wording as before.

198 browser tests pass. DECISIONS.md §16.

---

## 2026-11-19 · `dev` · Even spacing and balanced rows

**Why:** owner feedback: the footer sign-up card had more space under the form than above it.
"Everything must be balanced in terms of spacing and proportion."

**What changed**

- **Footer sign-up card:** the consent tick carried spacing meant for long forms (a 27 px margin
  plus 9 px label padding), which doubled the space at the bottom. Removed inside the card, and
  the card now has the same padding on all four sides. Measured: top 39 / bottom 40 / left 37 /
  right 37 px (28 px all round on phones).
- **Site-wide check:** every card-like box on every page was measured at 1280 px and 390 px for
  lopsided inner spacing. Fixed:
  - Kids' World home buttons: picture above the words, all centred (they were left-aligned
    with a gap on the right).
  - Kids' World notes ("What you tap here is not saved…", prompts): fit their text and sit
    centred (up to 397 px was empty on one side).
  - Gallery "Would you like your drawing here?": picture and text centred as a group.
  - The Kids' World header pill: equal padding on both sides.
- **Even rows in Kids' World grids:** items are equal-sized and a shorter last row is centred,
  instead of leaving a row hanging to the left. Desktop / tablet: home 3 + 3; What do you love
  3 + 3 + 3; feelings 4 + 3; story buttons 5 / 3 + 2; printables, calm ideas and gallery 4 / 2 + 2.

198 browser tests pass; Lighthouse passes all budgets.

---

## 2026-11-19 · `dev` · Footer rearranged

**Why:** owner feedback: the footer looked disorganised. The sign-up form made the first column
very tall, the link columns floated at the top with empty space under them, and the
registration and copyright lines sat loose at the bottom.

**What changed** (same content and wording, new arrangement):

1. **Updates strip** across the top, as a card: heading and short intro on the left; the email
   box and Sign up button side by side on the right, with the consent tick below. On narrow
   phones: email, consent, then the button.
2. **Four even columns:** logo and tagline, Explore, Get involved, Contact us (email, "Send us a
   message", location). Two columns on tablets, one on phones.
3. **Bottom bar:** the registration line, then copyright with Privacy notice, Accessibility and
   Comfort & access settings.

Error messages for the sign-up form still appear correctly in the new layout. 198 browser tests
pass; Lighthouse passes all budgets.

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
