# Project brief (summary)

A summary of the agreed brief for rebuilding pholoso.africa. The full brief is kept outside this repository.

## Goal

Turn the Foundation's single-page website into an accessible, multilingual, low-data support and resource hub: the first place a South African family turns to when they suspect their child is neurodivergent. The site should show the Foundation building real infrastructure (2to.iQ, assistive technology, Activity Boxes, a support network) without overstating what is available today.

## Part A: stabilise the live site (this repository, now)

Keep the same files and hosting, and fix what is broken or misleading:

- Version control, with private files (brand sources, credentials) kept out.
- Remove file corruption; activate the misnamed `.htaccess`; stop private files being served.
- Contact form: deliver through Microsoft 365; success only when delivery is confirmed; consent enforced; spam and rate limiting; honest failure with the email address.
- No fake success messages anywhere (the newsletter box).
- A POPIA privacy notice, marked for legal review.
- Content visible without JavaScript.
- Comfort & access that visibly works (see `comfort-and-access-spec.md`), identity-first wording labelled correctly, navigation fixes, and the 2to.iQ explanation.
- Search quick wins and a homepage keyword map.
- A deploy guide, tests and CI/CD.

## Part B: rebuild (separate codebase, after Part A is approved)

Not started. Requires the Foundation's approval of the architecture and its running costs first.

- A server-rendered front end (preferred: Astro) and a CMS (preferred: Payload with PostgreSQL), or a PHP-native option on the current hosting. The choice and costs go in an architecture decision record.
- Pages: About, Our Solutions (with honest status labels), Resource Centre, "Where do I start?" pathways, Stories, Get Involved, Contact, Privacy, Accessibility.
- All 11 official spoken South African languages configured; which ones are published is a setting. Only reviewed translations are published.
- Read aloud with natural voices where a voice has been tested; recorded audio otherwise.
- Resource Centre: searchable directory with filters that work without JavaScript, "last checked" dates, no dead-end searches, anonymous search statistics.
- Forms with consent, moderation for stories, and no logging of personal data.
- An optional site guide (off by default) that answers only from published content.
- WCAG 2.2 AA, low-data performance budgets, search optimisation for search engines and AI answer engines, and automated tests.
- Old links (`/#about` and so on) redirect to the new pages.

## Working rules

- Nothing is invented: no made-up statistics, partners, practitioners, stories or prices. Medical, legal and policy guidance is left as clearly marked placeholders for qualified reviewers.
- When something is ambiguous, choose the option that is more accessible, more private and less likely to overstate what the Foundation offers.
- No tool or vendor attribution anywhere in the repository or its history; plain conventional commit messages.
- `main` matches the live site. Part A goes through one pull request from `stabilise`. Part B lives on a long-lived `rebuild` branch until launch.
