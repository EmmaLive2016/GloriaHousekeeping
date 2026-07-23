# Gloria's House Keeping Service — Deployment Runbook

Stack: static multi-page site + 3 Netlify serverless functions. No GitHub required (CLI deploy), no separate backend server, no database.

**What ships in Phase 1**
- 6 pages: Home, Services, About, Contact, Book Now, Privacy (+ thank-you page)
- Booking + contact forms via Netlify Forms (stored in the Netlify dashboard, email-notifiable, CSV export)
- On every booking: an automated voice call to Gloria's cell that reads the full booking details aloud ("Press 1 to confirm, press 2 to decline, press 9 to repeat"). No SMS is sent.
- AI chat assistant (Claude via serverless proxy; fact-locked, never quotes prices)

**Environment variables (all set in Netlify — never in code)**

| Variable | Required | Purpose |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Yes (for the call) | Twilio account |
| `TWILIO_AUTH_TOKEN` | Yes (for the call) | Twilio auth |
| `TWILIO_PHONE_NUMBER` | Yes (for the call) | The Twilio number the call comes FROM, E.164 format e.g. `+13035551234` |
| `GLORIA_CELL` | Yes (for the call) | Gloria's cell, E.164: `+17202276417` |
| `ANTHROPIC_API_KEY` | Yes (for chatbot) | Claude API key |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-haiku-4-5` |
| `RESEND_API_KEY` | No (Phase 1.5) | Customer confirmation emails on press-1 |
| `RESEND_FROM` | No (Phase 1.5) | e.g. `Gloria's House Keeping Service <bookings@yourdomain.com>` |

The site degrades gracefully: with no env vars set, pages and forms still work (submissions land in the Netlify dashboard); the call and chat features simply stay dormant until their keys are added.

---

## Phase A — Deploy the site (10 min)

Prerequisite: Node.js LTS installed (`node --version` to check; install from nodejs.org if missing).

PowerShell, one step at a time:

```powershell
# 1. Extract the zip so this file sits at C:\GloriasCleaning\SETUP.md
cd C:\GloriasCleaning

# 2. Install the Netlify CLI (once per machine)
npm install -g netlify-cli

# 3. Log in (opens browser)
netlify login

# 4. Deploy — when prompted, choose "Create & configure a new project",
#    pick your team, and accept the detected publish directory (public)
netlify deploy --prod
```

**Verify:** open the URL the CLI prints. All six pages should render; submit a test booking and confirm it appears under Forms in the Netlify dashboard (app.netlify.com → your site → Forms).

## Phase B — Turn on the confirmation call (20 min)

1. Create an account at twilio.com. Trial accounts include ~$15 credit; during trial, calls/texts only go to **verified** numbers — verify Gloria's cell (720-227-6417) under Phone Numbers → Verified Caller IDs. That is exactly the number we call, so the trial fully covers testing.
2. Get a Twilio phone number (Console → Phone Numbers → Buy a Number; a Colorado local number runs ~$1.15/month once off trial).
3. From the Console dashboard, copy the **Account SID** and **Auth Token**.
4. Set the variables (paste your real values between the quotes):

```powershell
netlify env:set TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
netlify env:set TWILIO_AUTH_TOKEN "your_auth_token"
netlify env:set TWILIO_PHONE_NUMBER "+1XXXXXXXXXX"
netlify env:set GLORIA_CELL "+17202276417"

# 5. Redeploy so functions pick up the variables
netlify deploy --prod
```

**Verify:** submit a booking on /book.html → Gloria's cell should ring, and the recorded voice should read the booking details, then offer press-1 to confirm / press-2 to decline / press-9 to repeat.

**No A2P/SMS registration needed.** Because this is voice-only, none of Twilio's SMS (A2P 10DLC) registration applies. Outbound voice calls work as soon as the number is purchased (or, on trial, to the verified cell).

## Phase C — Turn on the chat assistant (10 min)

1. Create an API key at console.anthropic.com (Settings → API Keys). Fund with a small amount — at this traffic, expect a few dollars per month at most.

```powershell
netlify env:set ANTHROPIC_API_KEY "sk-ant-xxxxxxxx"
netlify deploy --prod
```

**Verify:** open the site, click the broom bubble bottom-right, ask "What areas do you serve?" and "How much is a deep clean?" — the second must answer *call for a free estimate*, never a price.

## Phase D — Email notifications for form submissions (5 min)

Netlify dashboard → Site → Forms → Form notifications → Add notification → Email — enter the email address that should receive submissions. This is the durable written record of every submission (there is no SMS).

## Phase E (optional) — Customer confirmation emails on press-1

Requires a domain (Phase F) + free Resend account with the domain verified:

```powershell
netlify env:set RESEND_API_KEY "re_xxxxxxxx"
netlify env:set RESEND_FROM "Gloria's House Keeping Service <bookings@YOURDOMAIN.com>"
netlify deploy --prod
```

## Phase F — Custom domain

Purchase the domain (e.g., gloriascleaningservice.com — confirm availability), then Netlify dashboard → Domain management → Add domain → follow the DNS instructions. HTTPS is automatic.

---

## Phase 2 (deferred, by design)
- Management console: booking dashboard with statuses, customer history, login (this is when a database enters)
- Customer-facing SMS or email reminders (would require consent capture + A2P registration for SMS)
- Recurring-schedule management
- Inbound AI phone answering, if wanted

## Redeploying after any edit

```powershell
cd C:\GloriasCleaning
netlify deploy --prod
```
