# Deploying to sleukchak.site (Hostinger shared hosting + Render)

Hostinger shared hosting can't run this app directly — it doesn't support a
persistent Node.js + ffmpeg process. The straightforward path: host the app
itself on **Render's free tier** (or Railway — same idea), then point a
subdomain of sleukchak.site at it using Hostinger's DNS settings. Nothing
below needs you to share any passwords with anyone.

Total time: about 10 minutes, plus DNS propagation (can take a few minutes
to a few hours).

## 1. Put the code on GitHub

Render deploys from a Git repository.

1. Go to github.com and create a new **empty** repository (e.g. `ai-ads-generator`). Don't add a README/gitignore — keep it empty.
2. On the new repo's page, use **"uploading an existing file"** (a link right on the empty-repo page) and drag in every file/folder from the project you downloaded (keep the `backend/`, `frontend/`, `Dockerfile`, `render.yaml`, `.dockerignore`, `README.md` structure intact).
3. Commit directly to the `main` branch.

(If you're comfortable with `git`, this is just `git init && git add . && git commit -m "init" && git remote add origin <your-repo-url> && git push -u origin main` instead.)

## 2. Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free — GitHub sign-in is easiest).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account and select the repo you just created.
4. Render should auto-detect `render.yaml` and offer to use it — accept that (it sets the plan to Docker/free and points at the `Dockerfile` automatically). If it doesn't auto-detect, set these manually:
   - **Runtime**: Docker
   - **Dockerfile path**: `./Dockerfile`
   - **Plan**: Free
5. Click **Create Web Service**. The first build takes a few minutes (it's installing ffmpeg and building the frontend).
6. When it's live, Render gives you a URL like `https://ai-ads-generator-xxxx.onrender.com` — open it and confirm the app loads and you can upload/generate an ad. That confirms the deploy is good before touching DNS.

**Note on the free plan**: it spins the service down after 15 minutes of no traffic, so the first request after a quiet period takes ~30-60 seconds to wake back up. Fine for testing; upgrade to a paid plan later if you want it always-on.

## 3. Point a subdomain at it

1. In the Render dashboard for your service, go to **Settings → Custom Domains → Add Custom Domain**, and enter `ads.sleukchak.site` (or whatever subdomain you'd like — `app.sleukchak.site`, `demo.sleukchak.site`, etc.).
2. Render will show you a CNAME target to add, something like `ai-ads-generator-xxxx.onrender.com`.
3. Log into **Hostinger hPanel** → your domain (`sleukchak.site`) → **DNS / Name Servers → DNS Zone Editor**.
4. Add a new record:
   - **Type**: CNAME
   - **Name/Host**: `ads` (just the subdomain part, not the full domain)
   - **Points to / Target**: the `...onrender.com` value Render gave you
   - **TTL**: leave default
5. Save. Back in Render, wait for the domain status to flip to "Verified" (it also auto-provisions free HTTPS) — usually a few minutes, occasionally longer depending on DNS propagation.
6. Visit `https://ads.sleukchak.site` — that's your live app.

## Everyday updates after this

Any time you want to update the app: push new commits to the GitHub repo
(edit files on github.com directly, or `git push`) — Render auto-deploys on
every push to `main`. No need to repeat the steps above.

## If you'd rather I do more of this hands-on

I can't create accounts or hold credentials for you, but if you create the
GitHub repo and Render account yourself and then share a Render **API key**
(Render dashboard → Account Settings → API Keys) or add me as a GitHub
collaborator, I can drive the actual deploy and DNS-record steps directly
instead of you clicking through them.
