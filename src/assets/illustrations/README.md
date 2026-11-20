# Illustrations

A starter set of simple, original illustrations for Kids' World and the home page. They are
placeholders until a professional illustrator is commissioned. **An illustrator can replace any
file here without changing code**, as long as the replacement keeps these rules.

## Folders

| Folder      | What                                                                                                               | viewBox         |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | --------------- |
| `mascot/`   | **Pholo, the approved mascot** (still poses: hello, thinking, celebrating, calm, talk). Do not redesign: see below | `-10 0 220 210` |
| `children/` | The cast: Lerato, Sipho, Kayla, Thabo, Zanele                                                                      | `0 0 160 230`   |
| `icons/`    | Picture-button and card icons                                                                                      | `0 0 64 64`     |
| `feelings/` | The seven feelings faces                                                                                           | `0 0 64 64`     |

Pages use them by path without `.svg`, for example `<Art name="icons/train" />`
(`src/components/kids/Art.astro`). A missing name stops the build.

## Rules for replacement files

1. **Plain SVG, inlined into the page.** Keep each file under 10 KB (run it through SVGO).
2. **No `<style>` elements, no `style=""` attributes, no scripts, no embedded images or fonts.**
   The site's Content-Security-Policy blocks them, and `pnpm check:dist` fails the build. Use
   presentation attributes instead (`fill="#EEA838"`, `stroke-width="3"`).
3. **Keep the same viewBox** (or the same proportions), so layouts do not shift.
4. **Pholo is approved artwork, not a placeholder.** `mascot/*.svg` (still) and
   `src/assets/pholo/*.svg` (movements) are the Foundation's approved files, copied unchanged
   from `reference/pholo/`. Do not redraw or "tidy" them. If the Foundation approves a new
   version, replace both sets together. `src/components/kids/Pholo.astro` shows them; it makes
   every movement wait for its trigger (brief §10b).
   - Anything purely decorative (stars, thought bubbles) is inside `<g class="doodle">`. Those
     parts are hidden in Calm colours and Simplified page.
5. **Colours:** the brand colours (green `#134B42`, gold `#EEA838`, soft gold `#F3C57A`) and the
   playful palette (sky `#BFE3F2`, coral `#F7B3A1`, leaf `#CDE8B5`, lilac `#D9CCF0`, sunshine
   `#FCE7B8`), with dark outlines (`#16241F` or `#2B1F04`). Flat colour; no gradients.
   Calm and Dim themes tone illustrations down automatically (`--illustration-filter`).
6. **Who is shown:** South African children with different skin tones, hair and clothes, some
   with headphones, glasses, a wheelchair or an AAC tablet. No stock clip art, no recognisable
   characters, and nothing that imitates an existing cartoon.
7. **Text alternatives live in the page, not the file.** Most illustrations sit next to words
   that say the same thing, so they are hidden from screen readers. Pass `label` to `<Art>` only
   when the picture carries meaning on its own.

The printable PDFs in `public/printables/` are made separately by
`scripts/make-printables.mjs`.
