# How to get the website showing (GitHub + Netlify)

Read this first, Marc. It answers the exact question: *what do I do with this zip so the site shows?*

## The key idea (why it isn't showing yet)

The site "shows" once **two** things are true:
1. The files are in a GitHub repo.
2. **Netlify is connected to that repo and told to publish the `public` folder.**

Step 2 is the part that's usually missing. Pushing files to GitHub alone does **not** put a website on the internet — GitHub stores code; Netlify serves the site. The `netlify.toml` file already tells Netlify to publish `public`, so you don't arrange files any special way. You just connect the repo.

## Folder structure (already correct in this zip — don't rearrange)

```
glorias-site/
├── netlify.toml            <- tells Netlify: publish "public", functions in "netlify/functions"
├── README.md
├── SETUP.md
├── .gitignore
├── public/                 <- the actual website
│   ├── index.html
│   ├── services.html
│   ├── about.html
│   ├── contact.html
│   ├── book.html
│   ├── thanks.html
│   ├── privacy.html
│   ├── css/styles.css
│   └── js/chat.js
└── netlify/
    └── functions/          <- the voice call + chatbot logic
        ├── submission-created.js
        ├── call-flow.js
        └── chat.js
```

**The contents of the zip go at the TOP LEVEL of the repo.** `netlify.toml` must sit in the repo root, not inside another folder. If you unzip and see a single `glorias-site` folder, push what's *inside* it (so `netlify.toml` is at the root), OR push the folder and set Netlify's base directory to `glorias-site` — the first option is simpler.

---

## Option 1 — GitHub website (no commands). Recommended if the CLI is fighting you.

1. Unzip the file on your PC.
2. Go to https://github.com/new. Owner: **NexusPay2026** (or whichever account you want this under — this is a separate venture, so a dedicated repo is clean). Name it e.g. `glorias-cleaning`. Private is fine. **Do not** check "Add a README" (the zip has one). Click **Create repository**.
3. On the new repo page, click **uploading an existing file** (the link in "…or upload an existing file").
4. Open the unzipped folder, select everything **inside** it (so you're selecting `netlify.toml`, `public`, `netlify`, etc. — not the outer folder), and drag it all into the browser upload box. Wait for every file to finish uploading (the `netlify/functions/*.js` files must appear).
5. Click **Commit changes**.
6. Go to https://app.netlify.com → **Add new site → Import an existing project → GitHub** → pick the `glorias-cleaning` repo.
7. Netlify auto-reads `netlify.toml`. Leave the settings as detected (publish directory `public`). Click **Deploy**.
8. Wait ~1 minute. Netlify shows a URL like `random-name-123.netlify.app`. **That is your live site.**

Every future change: edit the file on GitHub (or re-upload), commit, and Netlify redeploys automatically.

## Option 2 — Git command line (PowerShell)

Prerequisite: Git installed (`git --version`). Run in the unzipped folder so `netlify.toml` is in the current directory.

```powershell
cd C:\path\to\glorias-site

git init
git add .
git commit -m "Gloria's Cleaning Service — initial site"
git branch -M main

# Create an empty repo at github.com/new FIRST (no README), then:
git remote add origin https://github.com/NexusPay2026/glorias-cleaning.git
git push -u origin main
```

Then do steps 6–8 from Option 1 to connect Netlify.

## Option 3 — Netlify CLI only (no GitHub at all)

If you don't want GitHub involved, this is the fewest moving parts (from SETUP.md, Phase A):

```powershell
cd C:\path\to\glorias-site
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

When prompted, choose **Create & configure a new project** and accept the detected publish directory. The CLI prints the live URL.

---

## After it's showing: turn the voice call on

The site will display immediately after any option above. The **voice call feature stays off** until you add four Twilio values. Do that in **SETUP.md, Phase B** — it's four `netlify env:set` commands (or, if you used the GitHub route, set them under Netlify → Site configuration → Environment variables), then one redeploy. The chatbot is Phase C (one Anthropic key).

## Two common reasons a Netlify site shows a blank page or 404

1. **Publish directory wrong.** It must be `public`. `netlify.toml` sets this; if you set it manually, match it.
2. **Files pushed one level too deep.** If the repo root contains only a `glorias-site/` folder, Netlify looks for `public` at the root and finds nothing. Fix: either move files up so `netlify.toml` is at the repo root, or set **Base directory = glorias-site** in Netlify's build settings.
