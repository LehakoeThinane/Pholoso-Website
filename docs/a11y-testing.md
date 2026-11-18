# Accessibility testing

Automated tests catch a lot, but not everything. A person with a screen reader must try the
site before each release. This page explains what runs automatically, and gives the manual
script to follow and record.

## What runs automatically (every push, in CI)

| Check                                        | Command                | What it covers                                                                                                                                                                                                       |
| -------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| axe (WCAG 2.0–2.2 A and AA, best practice)   | `pnpm test:e2e`        | Every page, at 390×844 and 1280×900, and with each Comfort & access setting on (sample pages)                                                                                                                       |
| Keyboard journeys                            | `pnpm test:e2e`        | Skip link, menu (Esc returns focus), Comfort & access panel, story filters, interest explorer, every form's error summary                                                                                             |
| Kids' World rules                            | `pnpm test:e2e`        | No fundraising or forms, Read it to me on every page, sound off by default, no celebration or breathing movement under reduced motion or Calm colours, nothing repeats fast enough to flash, feelings send nothing |
| No JavaScript                                | `pnpm test:e2e`        | Navigation, all interest and feeling panels, cards, forms                                                                                                                                                            |
| Built HTML                                   | `pnpm check:dist`      | No inline scripts or styles, one `<h1>` per page, Kids' World safety rules                                                                                                                                          |
| HTML validity, internal links and anchors    | `pnpm check:html`, `pnpm check:links` | Every page                                                                                                                                                                              |
| Colour contrast                              | `pnpm check:contrast`  | Every text and UI colour pair, in every theme                                                                                                                                                                        |
| Lighthouse (mobile)                          | `pnpm test:lighthouse` | Accessibility 100 on sample pages, plus performance budgets                                                                                                                                                         |

Run everything locally:

```bash
pnpm build:preview
pnpm check:dist && pnpm check:html && pnpm check:links && pnpm check:contrast
pnpm test:e2e          # PW_CHANNEL=msedge pnpm test:e2e if Playwright's Chromium is not installed
pnpm test:lighthouse   # needs Chrome; set CHROME_PATH to use another Chromium browser
```

## Manual screen-reader smoke test

**Status: not yet run.** Record each run below. Test on the preview build or the live site.

Setups:

- **NVDA + Firefox** on Windows (NVDA is free: <https://www.nvaccess.org/>)
- **VoiceOver + Safari** on an iPhone (Settings → Accessibility → VoiceOver)

For each setup, do these steps and note anything confusing, missing or wrong.

### Grown-ups' pages

1. Home: the first thing announced after the page title is the "Skip to main content" link.
   Use it. Then find the two doors ("I'm a kid", "I'm a grown-up") with the links list or by
   swiping. Choose "I'm a grown-up": you land on the green introduction.
2. Use headings navigation (NVDA: H; VoiceOver rotor: Headings) on About us. The outline makes
   sense on its own, with one level-1 heading.
3. Open the menu on the phone. The button says whether it is expanded. Close it.
4. Open Comfort & access. Focus moves into the panel and its title is read. Turn on
   "Identity-first wording" and close it: focus returns to the button. On the home page,
   "children with autism" is now read as "autistic children".
5. Stories: use the filter buttons. Each says whether it is pressed, and the number of stories
   shown is announced.
6. Contact: submit the empty form. The error summary is announced and focused. Follow a link
   in it: focus moves to that field, which is announced as invalid with its error message.
7. Donate: the bank details are read as term and value pairs. If Copy buttons appear, using
   one announces "copied".

### Kids' World

8. Kids' World home: the mascot button is announced as "Wave to Pholo, button". Pressing it
   announces that the mascot waves. The six picture buttons each have a clear name.
9. "Read it to me" reads the page. Pressing it again stops it.
10. What do you love?: choose an interest. Focus moves to "You love …!". Open the four cards
    (each is announced as a collapsed or expanded button). After the fourth, "You're a great
    learner!" is announced.
11. How do I feel today?: choose a face. Focus moves to that feeling's message.
12. Calm corner: press Start breathing. "Breathe in…" and "Breathe out…" are announced once
    per phase, not every second. Stop works and is easy to find.
13. Calm colours and Sounds: each is announced as a toggle button, with its state.

## Results log

| Date | Tester | Setup | Steps passed | Problems found | Fixed in |
| ---- | ------ | ----- | ------------ | -------------- | -------- |
|      |        |       |              |                |          |
