# Mail

Mailgun-based notification experiment. Content is still wanted; this directory is slated to move under `scripts/` (per README TODO), not delete.

## Language

**Mail (Mailgun)**:
Sends notification email via Mailgun, domain `mg.imetrical.com`. API key was rotated and re-validated (test email sent successfully); the current key lives in both 1Password and the gitignored `credentials.js` (never committed — see `mail/.gitignore`). MX records for `mg.imetrical.com` confirmed live and pointing at Mailgun as of this inventory pass.
