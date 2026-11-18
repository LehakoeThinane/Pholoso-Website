# pholoso.africa

Website of the Pholoso Afrika Foundation: inclusive, neurodiversity-first education in South Africa.

**This is the `rebuild` branch**: the new site, built with Astro as static files plus one PHP form
handler for the existing shared hosting. It is work in progress and not deployed. The live Part A
site stays on `main` until the rebuild is approved.

## Requirements

- Node.js 22.23.4 or later (CI uses Node 24) and pnpm 9
- PHP 7.4 or later, for the form handler and its tests (set `PHP_BIN` if `php` is not on your PATH)

## Commands

```bash
pnpm install            # once
pnpm dev                # local development server
pnpm build              # production build; fails while TODO: placeholders remain in src/config/site.ts
pnpm build:preview      # build that allows placeholders (shown as "To be confirmed")
pnpm preview            # serve the built dist/ folder
pnpm lint               # ESLint and Prettier
pnpm check              # astro check (TypeScript, strict)
pnpm check:dist         # built HTML: no inline scripts or styles, no third-party resources
pnpm lint:php           # php -l on every PHP file
```

## Where things are

| Path                              | What it is                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/config/site.ts`              | Facts about the Foundation (registration numbers, bank details, contacts). The single source of truth. |
| `src/config/strings.ts`           | Interface wording and navigation.                                                                      |
| `src/styles/tokens.css`           | Design tokens and the Comfort & access themes. Components use tokens, never raw colours.               |
| `src/layouts/`, `src/components/` | Page shell and components.                                                                             |
| `public/prefs.js`                 | Applies saved Comfort & access settings before the page draws.                                         |
| `scripts/`                        | Build-output checks.                                                                                   |
| `docs/`                           | Comfort & access spec, Microsoft 365 setup, open questions.                                            |

Full developer, deployment and content documentation is written at the end of the rebuild.
