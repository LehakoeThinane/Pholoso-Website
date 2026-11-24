# Handover report

**For:** the Pholoso Afrika Foundation, and the next developer.
**As of:** 23 November 2026, branch `dev` (merged into `main` by pull request).

The new website is built and tested, but **not yet live**. Going live needs the Foundation's
facts filled in (section 3) and the actions in section 4. Nothing here has been guessed: every
unknown is a visible placeholder.

## 1. Where things stand

| Milestone (brief §18)                            | Status                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1. Plan                                          | Done                                                                                              |
| 2. Scaffold (Astro, TypeScript, tooling, tokens) | Done                                                                                              |
| 3. Design system and styleguide                  | Done (`/styleguide/`)                                                                             |
| 4. Pages and content                             | Done: all grown-ups' pages                                                                        |
| 4b. Kids' World                                  | Done: 7 pages, mascot, illustrations, printables, games. **Owner feedback on the look is still wanted.** |
| 5. Enhancements (comfort panel, menu, filters …) | Done                                                                                              |
| 6. Forms and PHP handler                         | Done. **Needs Microsoft 365 setup to deliver email** (section 4).                                 |
| 7. Images and SEO                                | Done: optimised images, share image, structured data, sitemap, robots, `.htaccess`                |
| 8. Quality gate                                  | Done, except the **manual screen-reader test** (section 4)                                        |
| 9. Docs and handover                             | Done (this report)                                                                                |
| 4c. Parent Guide, Phase 1 (scripted) | Done (19 November): 7 draft topics, a page per step, chat on top. **Needs professional review** (section 4). Phase 2 (AI) not built. |
| 4c. Parent Coach (brief v4), Stage 1 of 3 | Done (19 November): landing, onboarding, chat and all message cards, against a practice script; 2 draft strategies. Off in production. Stage 2: database, sessions, API. Stage 3: accounts, reminders, deletion. |
| 4c. Parent Coach, Stage 2 of 3 | Done (19 November): MySQL tables, PHP API, AI behind two switches (live build + `enabled`), no-JavaScript forms, health check. Tested against a mock AI only. |
| 4c. Parent Coach, Stage 3 of 3 | Done (23 November): save with an email sign-in link (no passwords), My coaching, reminders by a daily job with unsubscribe, follow-up sessions, deleting a conversation or the whole account. **Walkthrough recording** against the mock AI made for the owner (not in the repository: `parent-coach-walkthrough.webm`, 1280×800). |
| Brief v5 | Done (20–23 November): Pholo, the approved mascot, moving only as specified; Kids' World redesign (mood board); read-aloud from recordings on every Kids' World page; "How can we help?"; the original website's wording reused (91.4%, DECISIONS §28); simpler footer; home FAQs and SEO for search and answer engines (DECISIONS §29). |

**Test results (23 November 2026):** 297 browser tests passed, 0 failed (axe: no accessibility
violations on any page, at phone and desktop size); 8 Parent Coach live-mode tests; PHP tests
(forms 49 checks, Parent Coach 92 checks, `.htaccess`) on PHP 7.4, 8.1 and 8.3. HTML, links,
contrast, audio texts, type checks and lint all clean. Lighthouse budgets met (grown-ups'
pages CSS within 16 KB, Kids' World within 20 KB). **CI on GitHub is green** for the latest
commit on `dev` and for the pull request into `main`.

**Design changes after milestone 9 (owner decisions, 18 November 2026; see DECISIONS.md §11–§14):**

- **Home hero:** the photo fills the right of the green band behind a rounded-point edge with a
  soft glowing line; pill buttons; centred text that fades in once on load (off with reduced
  motion, Calm colours or Simplified page).
- **Doors** ("I'm a kid" / "I'm a grown-up") now sit **under** the hero, not above it as the
  brief first asked.
- **Gloss** on all surfaces in the Standard theme, not only buttons.
- **Centred** page titles, section headings, intros, cards and Kids' World headings; long text,
  lists, forms and tables stay left-aligned.
- **Header (19 November):** four menu entries in one row between the logo and Donate:
  Kids' World, About (About us, Our approach), Stories & resources (Stories, Resources) and Get
  involved (Ways to help, Contact us). Groups open on click, work without JavaScript, and close
  with Esc. Every page is still listed in the footer. On phones the header is centred.
- **Small labels above headings removed** everywhere (19 November), e.g. "The problem", "Trust",
  and the hero's "Pholoso Afrika Foundation".
- **Quotes centred**, with a short gold bar above instead of a bar down the left (19 November).
- **CSS budget** raised to 16 KB.

## 2. Definition of done (brief §20)

| Item                                                                         | Status                                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pholo matches the approved artwork in all five poses; still under every motion-off setting | Yes (tested). Movement: by owner decision Pholo now also waves five times on arrival (DECISIONS §27). |
| Every Kids' World page reads aloud from recordings, not the browser voice     | Yes: 26 recordings. Computer-generated for now; a real South African voice is wanted (section 4, 10b). |
| Parent Coach: onboarding → coaching arc → plan → rating → optional account → return to follow up, by keyboard, screen reader and touch | Yes, against the mock AI (tested, and in the walkthrough recording). **Off in production until the Foundation approves it.** |
| A child can use Kids' World without help; Calm mode in one tap               | Built and tested. Not yet tried by children; worth a short session with a few families. |
| All pages exist, read well at 390 px and 1280 px, accurate and sourced       | Yes                                                                                   |
| Everything works without JavaScript                                          | Yes (tested)                                                                          |
| axe: 0 violations on every page and comfort state; Lighthouse budgets met    | Yes (CSS budget raised to 16 KB by owner decision)                                    |
| No inline scripts or styles; CSP blocks nothing needed                       | Yes in the build. **Confirm on the live server** with the smoke test.                 |
| No third-party requests                                                      | Yes (tested)                                                                          |
| Forms deliver correctly formatted email; no-JS and JS paths tested; anti-spam | Tested with mock mail. **Real delivery needs Microsoft 365 setup**, then a live test. |
| Production build passes only when all `TODO:` are filled                     | Yes. It is currently blocked by the placeholders in section 3, as intended.            |
| README, DEPLOY, CONTENT-GUIDE, DECISIONS written                             | Yes                                                                                   |

## 3. Facts still to fill in (`src/config/site.ts`)

None of these are on the current live site: on 18 November 2026 pholoso.africa was still the
old single-page site, with no bank details, address, Information Officer, accessibility
response time or story provenance. They must come from the Foundation directly.

The production build will not run until these are replaced with confirmed values.

| Setting                      | Needed                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| `bank.bank`                  | Bank name                                                               |
| `bank.accountNumber`         | Account number                                                          |
| `bank.branchCode`            | Branch code                                                             |
| `bank.accountType`           | Account type                                                            |
| `bank.swift`                 | SWIFT code (for international donors)                                   |
| `address`                    | Physical or postal address (required in the privacy notice) |
| `informationOfficer.name`    | Name of the POPIA Information Officer                                   |
| `stories.notice`             | Confirm whether the stories are composites, pseudonymised or real, and approve the notice wording |
| `accessibility.responseTime` | How quickly accessibility problems will be answered (e.g. "within 5 working days") |

## 4. Actions for the Foundation

Before going live:

1. **Fill in the facts** in section 3 (send them to the developer).
2. **Microsoft 365:** have the administrator follow [m365-setup.md](m365-setup.md), then create
   `config.php` on the hosting ([DEPLOY.md](DEPLOY.md), Step 0). Check first whether Microsoft
   365 was bought through GoDaddy, which can block this.
3. **POPIA review:** have someone qualified in POPIA review the privacy notice
   (`/privacy/`), including retention periods, cross-border processing (the hosting and
   Microsoft 365 may store data outside South Africa) and the gallery drawings process.
4. **Register the Information Officer** with the Information Regulator
   (<https://inforegulator.org.za/>).
5. **Stories:** confirm where the four grown-ups' stories come from and that publication is
   allowed, starting with any that involve a child.
6. **Approve Kids' World:** the mascot's name ("Pholo" is a placeholder; a children's naming
   competition is an option), the "Did you know?" facts, the five picture stories, and the
   gallery process. Decide on a professional illustrator. These are K1 to K9 in
   [open-questions.md](open-questions.md).
7. **Manual screen-reader test:** follow the script in [a11y-testing.md](a11y-testing.md) with
   NVDA and VoiceOver, and record the results.
8. **2to.iQ:** confirm the address parents should be sent to (currently https://2toiq.africa).
9. **Parent Guide:** choose a qualified professional (for example an educational psychologist
   or an occupational therapist) to review all seven topics in `src/content/guides/`; supply
   verified, current South African helpline numbers for "Need help now?"; and confirm the name
   ("Parent Guide" is a placeholder). Until the review, every reply says "Draft – under review"
   and the step pages stay out of search engines.
10. **Parent Coach privacy review:** the POPIA reviewer should look at the coach section of the
    privacy notice (shown once the coach is live): it names the AI provider, the transfer
    outside South Africa, and that children's learning and thinking differences can be health
    information, processed with the parent's agreement. Also confirm 30 days is the right
    retention period.
10b. **Read-aloud voice:** the Kids' World recordings are computer-generated for now (Kokoro,
    voices bf_emma and af_nicole). The goal is a real, warm South African voice: record the
    words in `content/audio/en/` and follow docs/AUDIO.md. Also decide on other languages.
10a. **Parent Coach (brief v4):** confirm the name ("Pholoso Parent Coach" is a working name)
    and the first topic (screen time); choose a professional to review the strategy library
    (`src/content/coach-strategies/`); and, before it opens, approve the privacy notice wording
    for the AI provider and the cross-border transfer, and a monthly budget. Stage 1 runs only
    in practice mode (preview builds); production keeps the coach off. Stage 3 (saving with an
    email link, My coaching, reminders, follow-ups) also needs: the POPIA reviewer to approve
    the "Saving your coaching" paragraph and keeping saved conversations until the parent
    deletes them; and the daily cron job in DEPLOY.md.
11. **Merge `dev` into `main`** by pull request once the above is agreed.

Going live and after:

12. **Deploy** following [DEPLOY.md](DEPLOY.md): back up the current site first.
13. **Run the smoke test** against the live site, and send a real test message through each
    form (contact, updates, Section 18A receipt) to check delivery and formatting.
14. **Google Search Console:** verify the domain and submit
    `https://pholoso.africa/sitemap-index.xml`.
15. Record the release in [CHANGELOG.md](CHANGELOG.md).

Optional:

- **Automated deployment** from GitHub (DEPLOY.md, last section): only if SFTP is available.
- **Photos:** confirm permission for the four photos in use, and supply originals if better
  quality is wanted. An **SVG logo** would replace the PNGs.
- **Analytics:** none by design. If wanted later, choose a cookieless self-hosted tool and
  update the privacy notice first.
- Other languages (isiZulu, Sesotho, Afrikaans …): the interface words are in one file
  (`src/config/strings.ts`), ready for translation.

## 5. Other open questions

[open-questions.md](open-questions.md) lists everything the build is waiting on. Its Part A
section (A1 to A19) came from stabilising the old site; several still apply (Microsoft 365,
hosting access, domain renewal, backups, privacy review).

## 6. For the next developer

Read the [README](../README.md) first, then [DECISIONS.md](DECISIONS.md). Open `/styleguide/`
to see every component. Run the full check list in the README before every push, add an entry
to [CHANGELOG.md](CHANGELOG.md), and work on `dev`.
