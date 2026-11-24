# Open questions for the Foundation

Decisions and content the build is waiting on. Nothing here has been guessed: each item is a placeholder, a setting or a TODO until answered.

## Needed for Part A (the live site)

| # | Question | Where it shows |
|---|---|---|
| A1 | Who manages Microsoft 365, and which mailbox should the website send **from** (suggested: a shared mailbox `website@pholoso.africa`)? | Contact form stays in "please email us" mode until `docs/m365-setup.md` is done |
| A2 | Who holds the hosting account, and does the host offer SFTP or FTPS? | Approved manual deployment (DEPLOY.md) |
| A3 | Legal review of the draft privacy notice, including retention periods and the host's server-log retention | `index.html`, privacy section (`TODO: legal review`) |
| A4 | URLs of the official Instagram, LinkedIn and WhatsApp Channel profiles | `sameAs` in the structured data (`TODO` in `index.html`) |
| A5 | Google Search Console and Bing Webmaster Tools verification codes | Two commented-out tags in `index.html` |
| A6 | Approve the Calm and High contrast palettes (spec §14.2) | Comfort & access |
| A7 | Default wording: person-first ("child with autism", current default) or identity-first? (spec §14.1) | Comfort & access |
| A8 | Newsletter: until a provider is chosen, sign-ups arrive at know@pholoso.africa as emails. Who adds them to the list? | Footer "Join" |
| A9 | Is `milisa-braweni.png` (an email signature) needed for anything? It is no longer in the repository and must not be on the web server. | — |
| A10 | **Was Microsoft 365 bought through GoDaddy or directly from Microsoft, and who is its admin?** If GoDaddy-managed, the Microsoft Graph approach may be blocked; the fallback is a transactional email service over HTTPS. Decide this before sending `docs/m365-setup.md` to anyone. | Contact form delivery |
| A11 | Who owns the GoDaddy account, and can the developer get cPanel (SFTP/FTPS) and DNS access? | Deployment |
| A12 | Which GoDaddy hosting plan is it, when does it renew, which PHP version runs, and are backups switched on? | Deployment, DEPLOY.md |
| A13 | Is the domain registered at GoDaddy, and is it set to auto-renew? A lapsed domain takes down the website and email together. | Everything |
| A14 | Where does the Microsoft 365 tenant store data? Needed for the privacy notice's cross-border wording (the web host is outside South Africa). | Privacy notice |
| A15 | When should the site go live? Deployment is switched off until the Foundation says so. | Deploy workflow |
| A16 | Are the existing stories real accounts with publication permission, pseudonymised accounts, or composites? Review the account involving a minor first. | Interim provenance note on Stories |
| A17 | Who monitors privacy requests and what retention periods actually apply to enquiries, updates and hosting logs? | Draft privacy notice |
| A18 | Can the host disable its injected monitoring script, and what does it collect until disabled? | Interim tracking disclosure and CSP verification |
| A20 | ~~Address and phone number for the footer.~~ Withdrawn on 24 November 2026: the owner chose to show only the email address in the footer. The address is still needed for the privacy notice (Part B facts). | — |
| A19 | Who owns the encrypted backup password, restore test and production release approval? | DEPLOY.md and release checklist |

## Needed before or during Part B

1. Is 2to.iQ live, in pilot or in development, and which languages does it support?
2. Should the identity-first wording toggle stay? (Assumed yes.)
3. Which languages are published at launch: about five, or all eleven?
4. Hosting provider and budget for the rebuild (the preferred stack needs a Node host and a database).
5. The approved logo as a vector file, and brand rules.
6. Which programmes are live now: AAC, Activity Boxes, workshops?
7. Which practitioners and organisations seed the Resource Centre, and who reviews the pathway content?
8. WhatsApp number, who answers it, and the target response time.
9. PayFast donation page URL and the Section 18A certificate process.
10. Newsletter provider.
11. Speech budget, and which languages get native-speaker voice testing.
12. Retention period for form submissions.
13. Who answers accessibility feedback, and how quickly?
14. Can the Foundation help recruit neurodivergent participants and parents for usability testing?
15. **Who will edit the website** after launch: a developer, a staff member, a volunteer?
16. **How often:** weekly news and stories, or a few changes a year?
17. **Should partners update their own directory listings** soon, or can the Foundation do it for them at first? (If "staff or volunteer, occasionally, Foundation-managed", a static site with a simple editor on the current hosting is likely the best fit; see the architecture decision when written.)
18. **Original wording, still true?** The site now reuses the original website's wording (DECISIONS §28). Please confirm: the safeguarding policy and code of conduct are signed; 2to.iQ is built to POPIA and EU standards for children's privacy, with pseudonyms and avatars; and the Safeguarding Policy, Data Protection and Privacy Policy, Code of Conduct and Governance framework can be sent to partners and funders.
19. **Contact form consent:** the original's wording ("I understand my message is handled in line with POPIA, and I can ask to edit or withdraw it.") is back; the POPIA reviewer should confirm it is enough as consent to reply.

## Kids' World (v2 brief)

Built with the brief's defaults. Each answer below changes one setting or file.

| # | Question | Default used | Where to change it |
|---|---|---|---|
| K1 | What is the mascot's name? Could children choose it in a naming competition? | "Pholo" (placeholder) | `kids.mascotName` in `src/config/strings.ts`; re-run `node scripts/make-printables.mjs` |
| K2 | Is there budget for a professional illustrator? | Original starter set of simple SVGs | `src/assets/illustrations/` (see its README) |
| K3 | Age range to design for? | 5 to 12 | Wording and sizes in Kids' World |
| K4 | Record audio later, in the owner's voice or other South African languages? | Browser speech in English | `src/scripts/listen.ts` |
| K5 | Approve the "Did you know?" facts. Each lists where to check it. | 12 facts | `src/content/kids/facts.yaml` |
| K6 | Approve the five "Kids like me" picture stories (made-up children, labelled as such). | As written | `src/content/kids/stories.yaml` |
| K7 | Who checks gallery drawings before publishing, and how long are those emails kept? | Process on `/share-a-drawing/`; retention not stated | `src/pages/share-a-drawing.astro`, privacy notice |
| K8 | Supply a verified, current children's helpline number, if you want one shown. | None: "Tell a grown-up you trust" only | `src/components/kids/KidsFooter.astro` |
| K9 | Any child-safe external websites Kids' World should link to (through the "Ask a grown-up" page)? | None | `src/config/kids-links.ts` |
