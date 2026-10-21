# Part A release checklist

Status: preparation only; **not approved or deployed**.
Last observed production commit/date: unknown. Audit: 21 October 2026.

## PR validation

- [ ] Static checks, upload packaging, PHP tests and browser suite pass.
- [x] Test both cURL and streams mail transports (48 PHP checks per transport).
- [x] No-JavaScript forms succeed against mock mail; child consent remains enforced.
- [x] Uncertain sends are not retried; throttling respects Retry-After.
- [x] Keyboard focus stays in menu/dialogs; backgrounds become inert and restore.
- [ ] Repository hygiene and conventional commit message checks pass.
- [x] Backup/upload order and failure handling pass local simulations, including decryption/restore.
- [ ] CI passes for the PR and for the final main commit.

## Owner and Foundation confirmations

- [ ] Owner approves the exact release commit before any production action.
- [ ] GoDaddy owner grants verified hosting access; production environment approvals configured.
- [ ] Backup password securely retained and restore tested separately.
- [ ] Monitored fallback mailbox confirmed; Microsoft 365 admin/provider identified.
- [ ] Story provenance and permission reviewed, prioritising the account involving a minor.
- [ ] Privacy contact, retention periods and cross-border processing reviewed.
- [ ] Donation route confirmed; interim links say "Discuss a donation".
- [ ] Hosting monitoring disabled or documented; CSP verified.

## After the separately approved deployment

- [ ] Confirm version.txt equals the approved main commit; record date/run in README.
- [ ] Headers, apex/www redirects, 404 and private paths verified.
- [ ] Enquiry and newsletter tested honestly for configured/unconfigured mail.
- [ ] Missing privacy/guardian consent rejected as applicable.
- [ ] JavaScript-off and keyboard Comfort & access checked on production.
- [ ] Encrypted pre-release backup downloaded into owner-controlled storage.
- [ ] HSTS remains off pending separate verified trial.
