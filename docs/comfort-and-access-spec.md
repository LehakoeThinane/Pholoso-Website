# Comfort & Access: Full Specification

**Project:** pholoso.africa (Pholoso Afrika Foundation)
**Status:** Draft for client review. Companion to the website build brief, covering Part A (live static site) and Part B (rebuild).
**Date:** 15 October 2026
**Safe to commit:** this file contains no tool or vendor attribution and can live in the repository at `docs/comfort-and-access-spec.md`.

---

## 1. Why this matters

Comfort & Access is the feature that makes this website different. The Foundation serves neurodivergent children, their families and their teachers. Many of these visitors are easily overwhelmed by bright colours, movement, dense text or noise. If the settings panel looks helpful but changes nothing, it sends the opposite message to the one the Foundation stands for.

The client's own words, from his feedback:

> "The comfort doesn't really change much. In fact, it makes it just like a grey… Softer colours, less stimulation, meaning like pastel colours… The high contrast, actually like these things must not just be suggestions, and there's really less happening. Reading space, they should really show the reading space. The reduced motion, I think it can be better. Essentially… if someone… sees the comfort and access, it should actually work for them."

He also asked for an audio option with a **natural-sounding voice**, and a **language dropdown**.

**The standard this spec sets:** every setting produces a change the visitor can see or hear within one second. It works with a keyboard, a screen reader and a phone, and it is remembered for next time.

---

## 2. Who it is for

| Visitor | What can make a website hard | What helps |
|---|---|---|
| Autistic children, teens and adults with sensory sensitivity | Bright or saturated colours, busy images, movement, sudden changes | Calm theme, reduce motion, simplified page |
| People with ADHD | Distractions, side content, long pages, animation | Simplified page, reading guide, reduce motion, clear structure |
| Dyslexic readers | Dense text, tight spacing, long lines, justified text, some fonts | Reading spacing, readable font, larger text, read aloud, easy-read summaries |
| People with low vision | Low contrast, small text, thin focus outlines | High contrast, larger text, strong focus |
| People with vestibular disorders or migraine | Parallax, zooming, sliding, fades | Reduce motion |
| People with light sensitivity | Bright white backgrounds | Dim theme, calm theme |
| Parents under stress, often on a phone with expensive data | Too many choices, small buttons, slow pages | One-tap presets, large targets, fast pages |
| Screen reader and keyboard users | Controls that aren't announced or reachable | Proper labels, roles and focus management |
| People who read better in another language, or by listening | English-only text | Language selector, read aloud |

These groups overlap, and needs can conflict: one person wants high contrast, another wants soft colour. That's why the panel offers choices instead of one "accessible mode".

---

## 3. What is wrong today

Findings from the code audit of the current static site:

| Area | Current behaviour | Problem |
|---|---|---|
| Panel | "Make this yours" panel toggles classes on `<html>`: `motion-reduced`, `calm-mode`, `contrast-high`, `text-large`, `spacing-wide`. Saved in the browser. | Changes are too small to notice |
| Calm mode | Only swaps the gold and background colours | Looks washed out or grey, not calm |
| High contrast | Minor colour changes | "Less happening", as the client put it |
| Reading spacing | Small spacing change | Not visibly different |
| Reduce motion | Partial | `.reveal` fade-ins and other movement remain |
| Larger text | Some text only | Layout doesn't scale as a whole |
| "Language" toggle | Swaps "child with autism" for "autistic child" through a `LANGMAP` | Mislabelled; the client thought it was a language picker |
| Read aloud | Browser built-in voice; text typed separately into the script | Robotic voice; the read-aloud text can drift from the page text |
| Reveal animation | Content starts invisible | Content stays hidden if JavaScript fails |

---

## 4. Principles

1. **Visible, immediate effect.** Each setting changes the page live, with no reload. If you can't tell it's on, it's broken.
2. **Built in, not bolted on.** No third-party accessibility overlay widgets. They're widely criticised by disabled users, conflict with assistive technology and don't fix the underlying site.
3. **Respect the visitor's device.** If their phone or computer already asks for reduced motion, more contrast, a dark theme or forced colours, start in the matching mode.
4. **Themes, not filters.** Each colour mode is a complete, designed set of colours (design tokens). Never use `filter: grayscale()`, an inverted page or a tinted overlay.
5. **Choices that combine safely.** Any combination of settings must stay readable and usable.
6. **Private by default.** Settings are stored only on the visitor's device. No account, cookie or server storage, and no tracking of individuals.
7. **Plain words.** Every control has a short, friendly label and a one-line description.
8. **Calm by design, not only by setting.** The default site should already avoid flashing, autoplay, sudden pop-ups and cluttered layouts.

---

## 5. The entry point

- **Button:** "Comfort & access", with a simple icon (sliders, or a person in a circle) **and** the visible text label. Never icon-only.
- **Placement:** bottom-right, fixed. On phones, a compact pill above the system gesture area that never covers form buttons or the cookie-free footer links. It is also linked from the header menu and the footer (so it can be found without hunting) and from `/accessibility`.
- **Size:** at least 44 × 44 px touch target.
- **Contrast:** the button keeps ≥ 3:1 against any page background in every theme.
- **First-visit hint (optional):** one gentle, dismissible note ("You can change colours, motion, text size and more here"), shown once and never animated. Don't show it if reduced motion or simplified page is on.

---

## 6. The panel

### 6.1 Behaviour

- **Desktop:** opens as a side panel on the right (≈ 380 px wide). **Phone:** opens as a full-height sheet.
- **Behaves as a modal dialog:** `role="dialog"`, `aria-modal="true"`, labelled by its heading "Comfort & access". Keyboard focus moves to the heading when opened, stays inside the panel while open, and returns to the button when closed.
- **Closes on:** Escape, the "Done" button or the close (×) button. A tap outside closes it on desktop only.
- **Live changes:** settings apply instantly behind the panel so the visitor sees the effect.
- **Announcements:** a polite `aria-live` region confirms changes ("Calm colours on", "Text size 130%").
- **The panel follows the active theme**, so it never becomes unreadable.
- **No single-key keyboard shortcuts** (WCAG 2.1.4). If shortcuts are ever added, they must use a modifier key and be switchable off.

### 6.2 Layout and wording

Group the controls with headings, in this order:

1. **Quick start** (presets)
   - "I feel overwhelmed"
   - "Reading is hard"
   - "I can't see clearly"
2. **Colours:** Standard · Calm · High contrast · Dim (choose one)
3. **Text and reading:**
   - Text size: 100% · 115% · 130% · 150%
   - Reading spacing (on/off)
   - Font: Standard · Easy-to-read
   - Reading guide (on/off)
4. **Movement and distractions:**
   - Reduce motion (on/off)
   - Simplified page (on/off)
   - Hide images (on/off)
5. **Listen:** Read this page aloud (opens the player) · Voice speed
6. **Wording:** Identity-first wording (on/off)
7. **Language:** shows the current language and links to the language selector
8. **Reset all settings**

Each toggle has a label plus a one-line description, for example:

- **Calm colours:** "Softer, muted colours with less to look at."
- **Reduce motion:** "Stops animations and moving parts."
- **Identity-first wording:** "Uses 'autistic child' instead of 'child with autism'."

---

## 7. Control-by-control specification

Each control lists its purpose, behaviour, implementation and acceptance test. "Part A" means the current static site; "Part B" means the rebuild.

### 7.1 Presets (Quick start)

| Preset | Turns on |
|---|---|
| **I feel overwhelmed** | Calm colours + Reduce motion + Simplified page |
| **Reading is hard** | Reading spacing + Text 130% + Easy-to-read font + shows the Listen player |
| **I can't see clearly** | High contrast + Text 150% + strong focus outlines |

- A preset **sets the individual controls**, so the visitor can see and adjust what changed. It isn't a hidden mode.
- Choosing a preset while another is active replaces the overlapping settings. "Reset" clears everything.
- **Acceptance:** applying each preset visibly updates the matching switches and the page; undoing a single switch afterwards works.
- **Delivery:** Part B (Part A optional if time allows).

### 7.2 Colours: one choice from four themes

The four themes are **mutually exclusive** (a radio group), because Calm and High contrast pull in opposite directions. All themes are built from the same token names (§9).

**Standard.** The Foundation's brand palette (theme colour `#134B42`), checked to meet WCAG 2.2 AA.

**Calm.** For sensory comfort:
- A warm off-white background, a soft sage surface, deep slate text, and muted green links and accents. No bright gold.
- Images are softened with reduced saturation and slightly lower contrast, applied **per image**, never to the whole page. Decorative patterns, gradients and background images are hidden.
- Shadows are flattened; borders stay visible.
- Proposed values, with contrast checked against WCAG:

  | Token | Value | Contrast |
  |---|---|---|
  | `--color-bg` | `#F6F3EE` | — |
  | `--color-surface` | `#EEF2EC` | — |
  | `--color-text` | `#2F3A36` | 10.66:1 on bg ✔ |
  | `--color-text-muted` | `#4F5B56` | 6.40:1 on bg ✔ |
  | `--color-link` | `#3F6358` | 6.05:1 on bg ✔ (always underlined) |
  | `--color-accent` | `#5E7F74` | 3.98:1, **large text and graphics only** |
  | `--color-border` | `#78857F` | 3.47:1 ✔ (UI boundaries need ≥ 3:1) |
  | `--color-focus` | `#7A6A9A` | 4.36:1 ✔ |
  | Button | `#FFFFFF` on `#3F6358` | 6.69:1 ✔ |

**High contrast.** For low vision:
- Pure white background, black text, deep blue underlined links, black 2 px borders on every button, input and card.
- A thick orange focus outline (`#C2410C`, 5.18:1). Buttons are black with white text (21:1).
- Background images are removed; text never sits on a photo.
- Meets **WCAG AAA contrast (7:1)** for body text: text 21:1, links 10.29:1.
- Also respects **Windows forced-colours mode**: use `@media (forced-colors: active)` with system colours, and never hide borders or focus outlines there.

**Dim.** For light sensitivity:
- Background `#1C2321`, text `#E6E9E4` (13.07:1), links `#A9D3C4` (9.76:1), focus `#E8C27A` (9.48:1), borders `#6F7C76` (3.67:1).
- Images are slightly dimmed. Never pure black on pure white.

**Rules for all themes:**
- Links are always underlined (not by colour alone).
- Focus outlines are always ≥ 2 px with ≥ 3:1 contrast.
- Information is never carried by colour alone.

**Defaults:** `prefers-contrast: more` → High contrast; `prefers-color-scheme: dark` → Dim (only on the first visit, until the visitor picks a theme).

**Acceptance:**
- An automated contrast check of every text and UI token pair in every theme passes AA, and AAA for body text in High contrast.
- Screenshots show a clearly different page for each theme.

**Delivery:**
- **Part A:** Calm and High contrast rebuilt on the existing classes. Dim optional.
- **Part B:** all four.

### 7.3 Text size

- Four steps: **100% / 115% / 130% / 150%**, applied by changing the root font size. All sizes in the stylesheet use `rem`/`em`, so headings, buttons, menus and forms scale together.
- Layout reflows at every step: no horizontal scrolling at 320 px width, and nothing clipped or overlapping.
- Browser zoom still works on top (to 400%).
- **Acceptance:** at every step, on a 320 px wide screen and at 400% browser zoom, no horizontal scroll and no clipped content (WCAG 1.4.4, 1.4.10).
- **Delivery:**
  - **Part A:** at least 100% and 125% (convert fixed `px` font sizes to `rem`).
  - **Part B:** all four steps.

### 7.4 Reading spacing

When on:
- line height **1.5**; space after paragraphs **2em**; letter spacing **0.12em**; word spacing **0.16em** (the WCAG 1.4.12 values);
- maximum line length **~70 characters** (`max-width: 70ch` on text blocks);
- left-aligned text (never justified), extra space between list items;
- no text in all capitals beyond short labels; body text never italic.

**Acceptance:** with spacing on, no text is cut off, overlapped or hidden in any component, including buttons, cards, the menu and the panel itself.

**Delivery:** Part A and Part B.

### 7.5 Font

- **Standard:** the brand font (currently Arial).
- **Easy-to-read:** **Atkinson Hyperlegible**, which was designed for legibility for low-vision readers. Self-host it (no external font service), with `font-display: swap` and only the weights used.
- The evidence that special "dyslexia fonts" help is mixed, so offer a highly legible font rather than promising a dyslexia cure. A second option can be added later if users ask for it.
- **Delivery:** Part B (Part A optional).

### 7.6 Reduce motion

When on, or when the device has `prefers-reduced-motion: reduce` set:
- All CSS animations and transitions stop (`animation: none; transition: none`, with a ≤ 0.01ms fallback).
- `.reveal` content is shown immediately, with no fade.
- Smooth scrolling is off (`scroll-behavior: auto`).
- Carousels, parallax, auto-advancing content and video backgrounds are off. Any GIF is replaced by a still image.
- Read-aloud sentence highlighting becomes a static underline, never a moving or flashing highlight.

Never auto-play anything, with or without this setting. Nothing on the site may flash more than three times a second (WCAG 2.3.1).

**Acceptance:** with the setting on, an automated check finds no running animations or transitions on any page, and `.reveal` content is visible on load.

**Delivery:** Part A and Part B.

### 7.7 Simplified page

When on:
- hide decorative images, background images, side panels, "related" teasers, social links and non-essential sections;
- keep the header menu, the main content, essential images (those with meaningful alt text) and the footer contact details;
- collapse long sections into headed, expandable blocks where the page is long.

The CMS (Part B) marks each block as **essential** or **decorative** so editors decide what stays.

**Acceptance:** on every page, the main content and navigation remain and decorative blocks are hidden; nothing essential disappears.

**Delivery:** Part B (Part A can hide decorative images and the closing panels as a lighter version).

### 7.8 Hide images

- Hides all non-essential images.
- Essential images (diagrams, logos that carry meaning) are replaced by their alt text in a bordered box.
- It also saves data, which helps visitors on limited mobile data.
- **Delivery:** Part B.

### 7.9 Reading guide

- A soft, semi-transparent horizontal band that follows the pointer, or the focused line when using the keyboard. It helps people keep their place.
- Optionally, dims the page above and below the band ("reading mask").
- It must not shift the layout, block clicks or move under reduced motion other than following the pointer.
- **Delivery:** Part B.

### 7.10 Read aloud (Listen)

**Player:**
- Appears at the top of the main content when the visitor chooses "Listen". It is never on by default and never autoplays.
- Buttons: Play/Pause, Restart, Stop, and Speed (0.75× / 1× / 1.25× / 1.5×). Each is a labelled button with keyboard support.
- Reads the **text of the main content as it appears on the page**, including identity-first wording if on. It never uses separately typed copies of the text.
- Optional sentence highlight, a gentle background tint. It is never flashing and becomes an underline under reduced motion.
- Stops when the visitor changes page or language.

**Voices:**
- **Part A:** the browser's built-in speech. Prefer, in order: a South African English voice (`en-ZA`), then any voice marked natural or neural, then the default. If no voice is available, hide the player and say "Listening isn't available in this browser."
- **Part B:** natural neural voices through a speech service (for example Azure AI Speech, which offers South African English, Afrikaans and isiZulu neural voices). Use recorded human audio for languages without a good synthetic voice.
  - A **voice capability list** per language records `none`, `synthetic` or `recorded`.
  - The Listen option is shown only where a voice has passed native-speaker testing.
  - Otherwise show "Audio isn't available in [language] yet."

**Privacy:** only page text is sent to the speech service, never visitor data. The privacy notice says so.

**Acceptance:**
- Playback starts only on request; pause, resume, speed and stop work by mouse, touch and keyboard.
- The spoken text matches the page.
- No voice is offered for a language that hasn't passed testing.

### 7.11 Identity-first wording

Some autistic people prefer "autistic child" (identity-first), while others prefer "child with autism" (person-first). The current site already supports this. Keep it, label it properly and make it complete.

- **Label:** "Identity-first wording", with the description "Uses 'autistic child' instead of 'child with autism'." Add a short "Why?" link to a sentence on the `/accessibility` page.
- **Default:** follow the Foundation's house style (a client decision; see §14).
- **Implementation:**
  - Part A keeps the `LANGMAP` phrase swap, extended to every occurrence.
  - Part B uses a CMS-managed list of **term pairs per language**, and editors mark swappable terms in the text, which is more reliable than search-and-replace.
- **Applies to:** page text, headings, alt text, the read-aloud audio and (Part B) the AI site guide's answers.
- **Every language needs both variants reviewed** by a native speaker.

**Acceptance:** with the setting on, every marked term on every page and in read-aloud uses identity-first wording, and none is missed.

### 7.12 Language

- Language is **not** part of the toggle list. It's a **"Language" dropdown in the header**, and the panel shows the current language with a link to change it.
- Each language is shown in its own name (English, isiZulu, isiXhosa, Afrikaans, Sesotho, Setswana, Sepedi, siSwati, Tshivenda, Xitsonga, isiNdebele). No flags.
- The panel makes clear that **written language and audio availability are separate**.
- **Delivery:** Part B (see the build brief §6).

### 7.13 Easy-read summaries

- Key pages (About, each "Where do I start?" pathway, Get Involved) begin with a short **"In short"** box: three or four plain sentences at roughly a 12-year-old reading level.
- Simplified page mode keeps the box at the top.
- This is content work. The CMS provides the field and editors write the text.
- **Delivery:** Part B.

### 7.14 Strong focus and link highlighting

Always on, not a toggle:
- a visible focus outline of at least 2 px with ≥ 3:1 contrast, and focus never hidden behind sticky headers (WCAG 2.4.7, 2.4.11);
- links are underlined; buttons look like buttons;
- touch targets are at least 24 px (WCAG 2.5.8), with 44 px preferred.

High contrast and the "I can't see clearly" preset make the focus outline thicker still (3–4 px).

### 7.15 Reset and remember

- **Reset all settings** returns everything to defaults (respecting device preferences), clears the saved settings and announces "Settings reset".
- Settings are remembered on that device and browser (§10). A small "Settings are saved on this device only" note sits under the Reset button.

---

## 8. How settings combine

| Combination | Rule |
|---|---|
| Calm / High contrast / Dim / Standard | Only one at a time (radio group) |
| Any theme + Reading spacing + Text 150% | Must reflow without clipping; test every pairing |
| Reduce motion + Read aloud | Highlight becomes a static underline |
| Reduce motion + Reading guide | The guide follows the pointer without easing or animation |
| Simplified page + Hide images | Both apply; essential images show as alt-text boxes |
| High contrast + Hide images | Allowed; no text on images remains |
| Preset then manual change | The manual change wins; the preset stays shown as "customised" |
| Device prefers reduced motion | Reduce motion starts on; the visitor can switch it off |
| Device in forced-colours mode | Themes step aside and system colours apply; focus and borders stay visible |

---

## 9. Design tokens (how themes are built)

All colours, sizes and motion values come from CSS custom properties (tokens), set per theme with an attribute on `<html>`:

```css
:root {                       /* Standard */
  --color-bg: …; --color-surface: …; --color-text: …; --color-text-muted: …;
  --color-link: …; --color-accent: …; --color-border: …; --color-focus: …;
  --color-btn-bg: …; --color-btn-text: …;
  --font-body: Arial, sans-serif; --font-size-root: 100%;
  --line-height: 1.5; --para-space: 1em; --letter-space: normal; --word-space: normal;
  --measure: 75ch; --focus-width: 2px; --motion-duration: 200ms;
}
html[data-theme="calm"]     { /* Calm values from §7.2 */ }
html[data-theme="contrast"] { /* High contrast values */ }
html[data-theme="dim"]      { /* Dim values */ }
html[data-text="115"] { --font-size-root: 115%; }   /* …130, 150 */
html[data-spacing="on"] { --line-height: 1.5; --para-space: 2em; --letter-space: 0.12em; --word-space: 0.16em; --measure: 70ch; }
html[data-font="readable"] { --font-body: "Atkinson Hyperlegible", Arial, sans-serif; }
html[data-motion="reduced"] { --motion-duration: 0ms; }
```

- **Part A** keeps the existing class names (`calm-mode`, `contrast-high`, `text-large`, `spacing-wide`, `motion-reduced`). It redefines the tokens under each class instead of switching to new attribute names, so nothing else in the old code breaks.
- **Components may only use tokens, never hard-coded colours.** A lint rule (Part B) blocks raw hex colours outside the token file.
- A script checks every text and UI token pair in every theme and fails the build if contrast drops below target.

---

## 10. Remembering settings and privacy

- **Storage:** one `localStorage` key, `pholoso-comfort`, holding a small versioned object, e.g. `{"v":1,"theme":"calm","text":130,"spacing":true,"font":"readable","motion":"reduced","simple":false,"images":true,"guide":false,"identityFirst":true}`. Every read and write is wrapped in try/catch; if storage is unavailable, the settings still work for that visit.
- **No flash:** a tiny inline script at the top of `<head>` reads the saved settings and sets the attributes or classes **before the page draws**.
- **Device preferences** (`prefers-reduced-motion`, `prefers-contrast`, `prefers-color-scheme`, `forced-colors`) are used only when the visitor hasn't chosen otherwise.
- **Sync across tabs** using the `storage` event.
- **Shareable link (Part B, optional):** `?comfort=calm,reduced-motion` applies settings for that visit only. This is useful for a clinic or school sharing a link with a family. It doesn't overwrite saved settings unless the visitor saves them.
- **No cookies, no server storage, no account.** Analytics (§12) only counts how often each setting is used, anonymously.

---

## 11. Supporting content and design rules

Comfort isn't only a panel. The default site must also:

- **Avoid sensory overload:** no autoplaying video or audio, no flashing, no pop-ups that interrupt, no sudden sounds, no auto-advancing carousels.
- **Be predictable:** the same menu in the same place on every page, consistent button styles, and clear headings. Mark external links and links that open new tabs.
- **Be readable:** plain language, short sentences and paragraphs, descriptive headings, bullet lists for steps, and no walls of text.
- **Use calm imagery:** authentic, licensed photos with African context; no busy collages; no identifiable children without written consent.
- **Have forgiving forms:**
  - visible labels (not placeholder-only), clear error messages next to the field, no time limits;
  - optional fields marked "optional";
  - the visitor's input is never lost on an error.
- **Give warnings:** say before linking to video content or a page with motion.
- **Have an accessibility statement** at `/accessibility`:
  - what the settings do and how to use them;
  - known limitations;
  - how to report a problem (email and WhatsApp), with a response time;
  - the date last reviewed.

---

## 12. Learning from use (anonymous)

Track **counts only**, with no personal data, through the site's cookieless analytics:

- panel opened;
- each setting switched on or off;
- presets used;
- Listen started, by language;
- language changed.

Review these monthly. If, for example, "I feel overwhelmed" is used far more than expected, make the default site calmer.

---

## 13. Testing

### 13.1 Automated (every pull request)

| ID | Check |
|---|---|
| CA-01 | Every setting changes computed styles measurably (snapshot of key styles before and after) |
| CA-02 | Contrast of every token pair in every theme meets the targets in §7.2 |
| CA-03 | Axe accessibility scan passes on Home, About, Resources, Contact, and the panel open, in every theme |
| CA-04 | Every combination of theme × text size × spacing × motion × simplified page passes axe and has no horizontal scroll at 320 px |
| CA-05 | Reduce motion: no running animations or transitions; `.reveal` content visible |
| CA-06 | Panel: opens and closes by keyboard; focus stays inside; Escape closes; focus returns to the button; switches report on/off |
| CA-07 | Settings persist across reload with no flash (the first paint already has the saved theme) |
| CA-08 | Read aloud: no autoplay; controls work by keyboard; spoken text equals page text |
| CA-09 | Identity-first: every marked term switches, including in read-aloud text |
| CA-10 | Visual snapshots of each theme for review |

### 13.2 Manual (before each release)

- Keyboard only, through the whole site and panel.
- Screen readers: NVDA + Firefox or Chrome (Windows), VoiceOver (iPhone and Mac), TalkBack (Android).
- Windows high-contrast (forced colours) mode.
- Browser zoom at 200% and 400%; phone at 320 px width; large system font on a phone.
- A low-end Android phone on a slow connection.

### 13.3 Testing with real people

Run a short usability session before the Part B launch, and ideally a light one after Part A:

- **Who:** 5–8 participants, including autistic adults or teens, people with ADHD, dyslexic readers, a screen reader user, and parents of neurodivergent children. Recruit through partner organisations. Offer a thank-you payment and get informed consent (guardian consent for under-18s).
- **Tasks:**
  1. "Make the site more comfortable for you."
  2. "Make the text easier to read."
  3. "Listen to the About page."
  4. "Find help near Knysna."
  5. "Turn everything back to normal."
- **Observe:** can they find the panel? Do the changes help? Is anything confusing or overwhelming?
- **Record** findings in `docs/testing.md` and fix any issue that blocks a task before launch.

---

## 14. What we need from the client

1. **Default wording:** should the site default to identity-first ("autistic child") or person-first wording?
2. **Brand colours:** approve the proposed Calm, High contrast and Dim palettes, or provide brand guidelines to adjust them.
3. **Read aloud:** budget for natural voices, and which languages to test with native speakers first.
4. **Testers:** can the Foundation help recruit neurodivergent participants and parents for testing?
5. **Accessibility contact:** who answers accessibility feedback, and how quickly?

---

## 15. Delivery plan

| Item | Part A (live site, now) | Part B (rebuild) |
|---|---|---|
| Panel as an accessible dialog with a clear label | ✔ | ✔ |
| Calm theme (full pastel palette) | ✔ | ✔ |
| High contrast theme (+ forced colours) | ✔ | ✔ |
| Dim theme | Optional | ✔ |
| Text size | 100% / 125% | 100 / 115 / 130 / 150% |
| Reading spacing (WCAG 1.4.12) | ✔ | ✔ |
| Easy-to-read font | Optional | ✔ |
| Reduce motion (complete, device-aware) | ✔ | ✔ |
| Content visible without JavaScript | ✔ | ✔ (server-rendered) |
| Identity-first wording, relabelled | ✔ | ✔ (CMS term pairs, all languages) |
| Read aloud | Best browser voice + full controls | Natural neural voices + recorded audio |
| Presets | Optional | ✔ |
| Simplified page / Hide images | Light version | ✔ |
| Reading guide | — | ✔ |
| Easy-read summaries | — | ✔ (content) |
| Language selector | — | ✔ |
| Saved settings, no flash | ✔ | ✔ |
| Automated tests CA-01 to CA-10 | Core subset | All |
| Usability testing | Light | Full |

---

## 16. What not to do

- Don't install an accessibility overlay widget or toolbar plugin.
- Don't use greyscale, invert or tint filters over the whole page as a "theme".
- Don't let any setting appear to work while changing almost nothing.
- Don't autoplay audio, video or animation, or flash anything.
- Don't hide or remove focus outlines, in any theme.
- Don't use single-key keyboard shortcuts.
- Don't use flags for languages.
- Don't store settings on a server or tie them to an identity.
- Don't offer a read-aloud voice for a language that hasn't been tested.
- Don't present the identity-first toggle as a language setting.

---

## 17. WCAG 2.2 criteria this spec covers

1.3.1 Info and relationships · 1.4.1 Use of colour · 1.4.3 Contrast (minimum) · 1.4.4 Resize text · 1.4.6 Contrast (enhanced, High contrast theme) · 1.4.10 Reflow · 1.4.11 Non-text contrast · 1.4.12 Text spacing · 1.4.13 Content on hover or focus · 2.1.1 Keyboard · 2.1.2 No keyboard trap · 2.1.4 Character key shortcuts · 2.2.2 Pause, stop, hide · 2.3.1 Three flashes · 2.3.3 Animation from interactions · 2.4.3 Focus order · 2.4.7 Focus visible · 2.4.11 Focus not obscured · 2.5.8 Target size (minimum) · 3.2.3 Consistent navigation · 3.3.1 Error identification · 3.3.2 Labels or instructions · 4.1.2 Name, role, value · 4.1.3 Status messages.
