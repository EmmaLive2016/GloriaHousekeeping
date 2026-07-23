# Console + AI Setup — Gloria's House Keeping Service

What this release adds:
- **CMS Console** at `/console/` — password-protected. Edits phone, headline, intro, trust badges, strip items, service areas, an announcement bar, and extra AI facts. Changes publish **instantly** (stored in Netlify Blobs; the site hydrates them at load — the static HTML keeps full default content, so SEO is unaffected).
- **Callback leads** — the site chat has a "Request a callback" form; requests appear in the console's Leads tab.
- **AI assistant v2** — conversion-focused: proactive nudge, quick actions (Free estimate / Add-ons / Callback / Call / Book), rate-limited, and its facts come from the console content — edit once, the site AND the AI update.

Architecture ported from the Lexi Lou admin: Netlify Functions + Blobs, scrypt password hashing, HMAC sessions, per-IP rate limits.

---

## Requirement (hard gate)

The Netlify site **must be connected to the GitHub repo** (git-based deploys). The functions now have a dependency (`@netlify/blobs`), which Netlify installs and bundles automatically on git builds. Manual drag-drop deploys will NOT bundle it.

Netlify → Add new site → Import an existing project → GitHub → `EmmaLive2016/GloriaHousekeeping` → Deploy. (Skip if already connected.)

## Environment variables (Netlify → Site configuration → Environment variables)

| Variable | Required | What it is |
|---|---|---|
| `ANTHROPIC_API_KEY` | For the AI | From console.anthropic.com → API Keys. Starts `sk-ant-`. |
| `SESSION_SECRET` | Yes | Random string, 16+ chars. Generate in 1Password (password generator, 32 chars). Never reused anywhere. |
| `CONSOLE_SEED_PASSWORD` | Yes | The one-time first-login password. Generate in 1Password. On first sign-in the console **forces you to set a new password**, which replaces this. |
| `CONSOLE_FORCE_RESET` | Only for recovery | Set to `yes` temporarily if the password is lost → sign in with the seed password → set a new one → **remove this variable**. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-haiku-4-5`. |
| Twilio vars | Later (Phase B) | Unchanged from SETUP.md — the booking voice call. |

After adding/changing env vars: **Deploys → Trigger deploy → Deploy site** (functions read env at deploy).

## Creating the Anthropic API key (browser)

1. console.anthropic.com → sign up / sign in.
2. Left menu → **API Keys** → **Create Key** → name it `glorias-site` → copy it (shown once).
3. **Billing** → add a small amount ($5 goes far at this traffic) and set a monthly spend limit.
4. Paste the key into the `ANTHROPIC_API_KEY` env var in Netlify. Never put it in the repo, the console, or chat.

## First console sign-in

1. Open `https://YOUR-SITE.netlify.app/console/`
2. Enter the `CONSOLE_SEED_PASSWORD` value.
3. You'll be forced to set a new password (10+ chars) — save it in 1Password.
4. Edit content → **Save & publish** → refresh the live site; changes appear immediately.

## Security notes

- Passwords are scrypt-hashed in Blobs; sessions are HMAC-signed, 12-hour expiry.
- The AI endpoint is rate-limited to 30 messages/IP/hour; callback leads to 5/IP/hour.
- `/console/` is excluded in robots.txt and noindexed.
- No credential ever lives in the repo or the pages — env vars only.

## What the console does NOT do (by design)

Client records, schedules, and invoicing belong to the ZenMaid/Jobber platform trial — the console manages **site content and callback leads** only. This boundary keeps you from rebuilding what the platform already does better.
