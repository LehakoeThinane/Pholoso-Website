# Putting the website online

**For:** whoever updates the live website at pholoso.africa. No programming needed for Part 2.
**Time needed:** about 20 minutes.

The website is a folder of ready-made files plus one small PHP program for the forms. You
upload the folder to the hosting (GoDaddy, through cPanel). Nothing needs installing on the
hosting.

There are three parts:

- **Part 1:** make the release zip (someone with the developer tools, once per release)
- **Part 2:** upload it in cPanel (anyone with the cPanel login)
- **Part 3:** check the live site

If this is the **first time** this new site goes online, do **Step 0** first.

---

## Step 0 (first time only): set up the forms

The contact, updates and Section 18A forms send email through Microsoft 365. Until this is
set up, the forms still work, but they tell visitors that nothing was sent and show the email
address instead. Nothing is lost or faked.

1. Ask the Microsoft 365 administrator to follow [m365-setup.md](m365-setup.md). They will give
   you a **tenant ID**, a **client ID**, a **client secret** and the **sending mailbox**.
2. In cPanel, open **File Manager**. Go to your home folder: the one that **contains**
   `public_html`, not `public_html` itself.
3. Create a folder called `pholoso-private` there.
4. In that folder, create a file called `config.php`. Copy everything from
   `config.example.php` (in the repository) into it, and fill in the values from step 1.
   Make up a long random `salt` (any 40 or more letters and numbers).
5. Save. **Never** put this file inside `public_html`, and never send it by email or add it to
   the repository.

When the client secret is close to its expiry date, the administrator makes a new one and you
update `config.php`.

---

## Part 1: make the release zip

On a computer with Node.js 22 or later and pnpm 9 (see the README):

1. Get the approved version: `git checkout main` and `git pull`.
2. Run `pnpm install`, then `pnpm build`.
   - **First launch (24 November 2026):** the owner chose to go live before every fact was in,
     and before Microsoft 365 is set up. For that release use `pnpm build:release` instead: it
     allows the missing facts (they show "To be confirmed"), keeps the Parent Coach off, and
     shows "please email us" instead of the forms. Switch to `pnpm build` once the facts are
     filled in and email works (DECISIONS §34).
   - If the build stops with **"Production build blocked: … placeholder(s)"**, some facts in
     `src/config/site.ts` still say `TODO:` (for example bank details). Fill them in first.
     The site must not go online with "To be confirmed" in it.
3. Open the `dist` folder. Select **everything inside it**, including the file `.htaccess`
   (on a Mac, press Cmd + Shift + . to see files starting with a dot).
4. Make a zip of those files, for example `pholoso-2026-11-18.zip`. The zip must contain the
   files and folders directly (`index.html`, `about/`, `.htaccess` …), not a `dist` folder.

---

## Part 2: upload it in cPanel

1. Sign in to GoDaddy, open **My Products → Web Hosting → Manage → cPanel Admin**.
2. Open **File Manager** and go into `public_html`.
3. **Make a backup first.** Select everything in `public_html`, choose **Compress**, choose
   **Zip Archive**, and name it `backup-<date>.zip`. Then **download** that zip to your own
   computer, and delete it from the server. (A backup left on the server can be downloaded by
   anyone who guesses its name.)
4. Choose **Upload** and upload your release zip. Wait for 100%.
5. Back in File Manager, select the release zip and choose **Extract**. Extract to
   `/public_html`. If asked, **allow overwriting** files.
6. Delete the release zip from `public_html` (it is not needed on the server).

Old files that are no longer used stay in `public_html`. That is safe. They can be tidied later
by someone who knows which ones they are; never delete `.well-known` or anything you did not
put there.

---

## Part 3: check the live site

Open these in a private browser window (so nothing old is remembered):

1. <https://pholoso.africa/> shows the new site: the green introduction, with the two big doors under it.
2. <https://pholoso.africa/kids/> opens Kids' World.
3. <https://pholoso.africa/this-does-not-exist/> shows "We could not find that page".
4. <http://www.pholoso.africa/> ends up at <https://pholoso.africa/> (no www, with the lock).
5. Send a test message from <https://pholoso.africa/contact/> and check it arrives at
   know@pholoso.africa.

If you have the developer tools, also run the automatic check, which sends no email:

```bash
pnpm smoke        # or: node scripts/smoke-test.mjs
```

It should end with **All good.** A "warn" line about the form handler not being set up means
Step 0 is still to do.

Finally, add a line to [CHANGELOG.md](CHANGELOG.md): the date, which version went live, and who
uploaded it.

---

## Parent Coach (only when the Foundation has approved it)

The coach stays **off** until the Foundation has approved the strategies, the helplines, the
privacy notice wording and a monthly budget. Switching it on takes a developer and about an
hour. Until then, skip this section: the coach pages say "not open yet" and point to the
written Parent Guide.

1. **Database.** In cPanel, open **MySQL Databases**. Create a database (for example
   `ACCOUNT_coach`), a user with a long random password, and add the user to the database with
   **All privileges**. Write the three names down somewhere safe.
2. **Tables.** Open **phpMyAdmin**, choose the new database, open the **SQL** tab, paste the
   contents of `server/migrations/001_coach.sql` from the repository, and press **Go**. Then do
   the same with `server/migrations/002_coach_accounts.sql` (saving, sign-in links and reminders).
   (Both files changed on 23 November 2026, before the coach was ever switched on. If tables were
   created from an older copy, delete the `coach_` tables and run both files again.)
3. **Settings.** In `pholoso-private/config.php` (Step 0), fill in the `coach` section (see
   `config.example.php`): the database names, the AI provider's API key, and the daily budget.
   Leave `enabled` as `false` for now.
4. **Build and upload** with the coach in live mode: the developer runs `pnpm build:live`
   instead of `pnpm build`, then uploads `dist-live/` the usual way (Parts 1 and 2).
5. **Check.** Open `https://pholoso.africa/coach-health.php`. Every line except "Coach switched
   on" should say OK. Fix anything marked NOT OK (each line says how).
6. **Daily job.** In cPanel, open **Cron Jobs** and add one that runs once a day (for example
   at 06:00) with this command, using your cPanel account name:
   `php /home/ACCOUNT/public_html/lib/coach/cron-reminders.php`
   It sends the reminders parents asked for and deletes expired conversations and sign-in links.
   It only runs from cron: opening it in a browser shows "not found".
7. **Switch on.** Set `enabled` to `true` in `config.php`, then try one full conversation on the
   live site, and once without JavaScript if possible. Save it with your own email address,
   open the link in the email, and check that My coaching lists the conversation.

**To switch it off again quickly:** set `enabled` back to `false`. The coach pages then say the
coach is not open, and nothing is sent to the AI provider. The server may keep using the old
setting for a few seconds (on some hosting, up to a minute) before it notices the change.

**Old conversations** are deleted 30 days after they start, unless the parent saved them. This
happens as people use the coach, and every day through the daily job (step 6). Saved
conversations stay until the parent deletes them, or deletes their account, on My coaching.

---

## If something goes wrong

**The whole site shows "500 Internal Server Error".**
The server did not accept a rule in `.htaccess`.

1. In File Manager, rename `public_html/.htaccess` to `htaccess-off.txt`. The site should load
   again (without the extra security settings).
2. Tell the developer. They will re-enable the blocks in `.htaccess` one at a time to find the
   one this hosting does not support. Every block is already wrapped so a missing module is
   skipped; a 500 usually means a typing error or a setting the hosting forbids.

**The site looks unstyled, or old.** Your browser remembers the old version. Reload with
Ctrl + F5 (Cmd + Shift + R on a Mac), or try a private window.

**A page says "We could not find that page" but should exist.** The zip may have contained a `dist` folder
instead of its contents. Check that `public_html/about/index.html` exists. If you see
`public_html/dist/`, move its contents up one level.

**Forms say "We could not send your form".** Step 0 is not done, or the client secret has
expired, or the Microsoft 365 setup is incomplete. Check `pholoso-private/config.php` and ask
the Microsoft 365 administrator.

**To go back to the previous version:** extract your backup zip into `public_html` the same
way (Part 2, steps 4 to 6).

---

## Automated deployment (optional, for the developer)

`.github/workflows/deploy.yml` can upload the site over SFTP from GitHub. It is **off** until
set up, and even then a person must approve each run. It builds the production version, runs
the checks, uploads (it never deletes files on the server), and runs the smoke test.

To switch it on:

1. In cPanel, check that SFTP (SSH) access is available on this hosting plan and note the host
   name and user name. If it is not available, keep using Part 2.
2. In GitHub: **Settings → Environments → New environment** named `production`. Add
   **Required reviewers** (the people who may approve a release).
3. **Settings → Secrets and variables → Actions → Secrets:** add `DEPLOY_HOST`, `DEPLOY_USER`,
   `DEPLOY_PASSWORD` (or `DEPLOY_SSH_KEY`), `DEPLOY_KNOWN_HOSTS` (the output of
   `ssh-keyscan <host>`, checked against the fingerprint cPanel shows) and `DEPLOY_PATH`
   (usually `public_html`).
4. **Variables:** add `DEPLOY_ENABLED` = `true`.
5. Release by pushing a tag (`git tag v1.0.0 && git push origin v1.0.0`) or with **Actions →
   Deploy → Run workflow**, then approve it.

Never put any of these values in the repository.
