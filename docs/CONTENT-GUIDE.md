# Content guide

**For:** anyone who writes or edits words on the website.
How to write for this site, the rules that keep it honest, and where each kind of content lives.

## 1. The three rules that matter most

1. **Never invent anything.** No made-up statistics, quotes, people, partners, awards, prices,
   bank details or legal claims. If a fact is not confirmed, it does not go on the site. In
   `src/config/site.ts`, an unconfirmed value starts with `TODO:`. It shows as "To be
   confirmed" on preview builds, and the real build refuses to run until it is filled in.
2. **Every statistic shows its source.** See section 5.
3. **Children first.** Never identify a child: no full names, schools, photos or details that
   could point to one. Kids' World never asks children for money, information or sign-ups.

## 2. Plain language

People reading this site are often tired, anxious, reading on a phone, or reading in their
second or third language. Some take words literally.

- **Short sentences.** One idea per sentence, one topic per paragraph.
- **Common words.** "Help" not "facilitate"; "about" not "approximately".
- **No idioms or metaphors** that a literal reader could misunderstand ("a level playing
  field", "hit the ground running").
- **Say who does what.** "We read every message", not "Every message is read".
- **Headings that work as an outline.** Someone reading only the headings should understand
  the page. One main heading (`<h1>`) per page, then `<h2>`, `<h3>` in order, never skipped.
- **Links say where they go.** "Read the stories", never "click here" or "read more".
- **South African English:** organisation, programme, colour, centre; dates as 18 November 2026.
- **Hedge legal and tax statements.** Donations "may" be tax-deductible; B-BBEE value "may"
  apply; add "check with your adviser" or "check with SARS".

## 3. Words about autism and neurodivergence

The Foundation's default is **person-first** language ("child with autism"). Visitors can
switch to **identity-first** ("autistic child") in Comfort & access.

For that switch to reach every page, **always write these phrases with the `<Term>`
component**, never as plain text:

```astro
We support <Term t="children-with-autism" /> and children with ADHD.
<Term t="child-with-autism" cap />   <!-- "Child with autism" at the start of a sentence -->
```

The available phrases are in `src/config/terms.ts` (child, children, person, people, young
people, learners, adults). To add one, add a pair there; never write it out by hand. The test
suite checks that the switch changes every `<Term>` on the page.

Other wording:

- Say **neurodivergent**, not "special needs" or "disorder", unless quoting a source or law.
- Describe what helps and what a child can do, not only what is hard.
- Do not name a diagnosis for a child in a story or in Kids' World.

## 4. Where each kind of content lives

| What                                    | Where                                    | Notes                                                                                     |
| --------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Facts about the Foundation              | `src/config/site.ts`                     | Registration numbers, contacts, bank details. The only place they are written.            |
| Menus and repeated interface words      | `src/config/strings.ts`                  | Includes the mascot's name (`kids.mascotName`).                                            |
| Statistics and their sources            | `src/config/sources.ts`                  | See section 5.                                                                             |
| Stories (grown-ups)                     | `src/content/stories/*.md`               | One file per story.                                                                        |
| Questions and answers (FAQ)             | `src/content/faqs/*.md`                  | `page: about` or `page: donate`.                                                           |
| Guides and resources                    | `src/content/resources/*.md`             | `status: planned` shows "Coming soon"; `published` gives it its own page.                 |
| Interest explorer (Our approach)        | `src/content/interests/*.md`             | Four cards, always in this order: Numbers, Reading and language, Science and the world, Social and emotional. |
| Kids' World: "What do you love?"        | `src/content/kids/interests.yaml`        | Four ideas each: numbers, words, science, friends.                                         |
| Kids' World: picture stories            | `src/content/kids/stories.yaml`          | 4 to 6 panels, one short sentence each.                                                    |
| Kids' World: "Did you know?" facts      | `src/content/kids/facts.yaml`            | Each needs a `source` (for editors; not shown).                                            |
| Kids' World: feelings                   | `src/content/kids/feelings.yaml`         | Links may only go to pages on this site.                                                  |
| Printables                              | `scripts/make-printables.mjs`            | Run `pnpm make:printables` after changing; each PDF must stay under 300 KB.                |
| Pictures and illustrations              | `src/assets/`                            | See `src/assets/illustrations/README.md` for illustration rules.                           |
| Everything else on a page               | `src/pages/<page>.astro`                 | Ask the developer if unsure.                                                               |

**To add a story, FAQ, resource or interest:** copy an existing file in the same folder, give
it a new file name (lowercase, hyphens: `new-story.md`), and change the text. The build checks
every file and stops with a clear message if a field is missing or wrong.

A story file looks like this:

```yaml
---
order: 5 # position in the list
category: parents # parents | young-people | educators | professionals
quote: The words they said, without quotation marks.
who: Pseudonym, role (e.g. "Thandi, mother of Sipho, 7")
misunderstand: What people often misunderstand.
friction: Where the system creates friction.
helps: What helps.
change: The change it asks for.
featured: false # true for the one story shown on the home page
---
```

Stories use pseudonyms, and the person must agree to publication and be able to change or
withdraw their story. Confirm the stories notice wording in `site.ts` (`stories.notice`).

## 5. Statistics

1. Find the **primary source** (the study, report or official page itself, not a news article
   about it). Read the figure in context: who was counted, where and when.
2. Add the source to `src/config/sources.ts` with its full title and a link, and the statistic
   with wording that stays close to the source. Note in a comment where in the source it
   appears and the date you checked it.
3. Show it on a page with the `<Stat>` component, which always shows the source link.
4. If a figure comes from studies quoted in another paper, say so ("according to studies cited
   in …"). Never round a figure up or make it sound more certain than the source.

Recheck figures at least once a year; sources get updated.

## 6. Writing for Kids' World

- **Very short sentences.** Read every sentence aloud: a 5-year-old should follow it.
- **Kind and true.** Every feeling is OK. Strengths, not deficits.
- **No money, no sign-ups, no "share", no links that leave the site.** A link to another
  website must go through the "Ask a grown-up" page (`src/config/kids-links.ts`).
  The checks fail the build if a Kids' World page breaks these rules.
- **Made-up children only,** and say so on the page.
- **No helpline numbers** unless the Foundation has verified that they are current.
- **Facts must be true** and checkable; add the source in `facts.yaml`.
- **Gallery:** only drawings sent by a parent or guardian with consent, checked by a person,
  shown with a first name or nickname and age only. Never fake children's artwork.

## 6b. Writing the Parent Guide

Each topic is one file in `src/content/guides/` (copy an existing one). The build checks every
file and stops with a clear message if something is wrong.

- **One question at a time.** Each step has a short message, up to three practical ideas, up to
  two "Learn more" links to pages on this website, and two or three answers.
- **About 120 words per step at most** (message plus ideas). The build counts.
- **Answers** lead to a step number in the same topic, another topic's name (for example
  `sleep`), or `home` (the list of topics). The guide adds "Something else" by itself.
- **Names:** write `{name}` (or `{Name}` at the start of a sentence) for the child, and
  `{interest}` for something they love. Without settings these read "your child" and
  "something they love", so every sentence must still make sense that way.
- **Strengths-based and kind.** No punishment, no blame, no "naughty". Practical things a tired
  parent can try today. South African where it matters (schools, clinics, data costs).
- **Never:** diagnosis, medication, legal advice, or helpline numbers (those come only from the
  Foundation, verified, in `src/config/guide.ts`). When unsure, point to a professional.
- **Review.** Every topic starts `reviewed: false` and shows "Draft – under review". Only change
  it to `reviewed: true` (and fill in `reviewedBy`) after a qualified professional chosen by
  the Foundation has approved every step. Changing a reviewed topic needs a new review.

## 6c. The Parent Coach's strategy library

Each strategy is one file in `src/content/coach-strategies/<topic>/` (copy an existing one).
The coach never invents strategies: the AI only personalises and explains entries from this
library, and **only entries with `status: approved` are ever sent to it.**

- Each entry has: a title, a one-sentence summary, why it helps, the exact words to say
  (`sayThis`), how to introduce it to the child at a calm time, a three-part plan (when it's
  calm / when screen time ends / right after), why consistency matters, common obstacles with a
  tip for each, when not to use it, and when to seek professional help.
- Placeholders: `{child}` (the child's name), `{activity}` (something they enjoy) and
  `{place}` (where it will be ready).
- Same tone as the rest of the site: strengths-based, practical, no punishment, no blame.
  Start from what the child loves (Hlompho).
- **Approval:** a qualified South African professional chosen by the Foundation reads the entry,
  then set `status: approved`, `reviewedBy` and `reviewedOn`. The build refuses an approved
  entry without them. Changing an approved entry needs a new review.

## 7. Pictures

- Every meaningful picture needs **alt text** that says what it shows and why it matters
  ("A teacher helps a boy use a tablet"). Decorative pictures get empty alt text.
- Photos need permission from everyone in them (and from a parent for any child). Avoid
  identifiable children's faces unless that permission is in writing.
- Photos go in `src/assets/images/`; the build makes small, fast versions automatically.

## 8. Before you publish

- [ ] Every fact is confirmed; no `TODO:` left in what you changed.
- [ ] Every statistic has its source.
- [ ] Autism phrases use `<Term>`.
- [ ] Links say where they go; pictures have alt text.
- [ ] Read it aloud once. Cut anything that is not needed.
- [ ] Add a line to `docs/CHANGELOG.md`.
