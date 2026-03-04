# Come Follow Me Insights

A simple web app for ward members and teachers to browse, search, and contribute scripture and gospel insights for Come Follow Me study. Content is organized by Scripture (Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, Pearl of Great Price), Gospel Topics, and Other. Editors and admins manage insights and can send email notifications when new content is added.

## Who it's for

- **Ward members** — Read and search insights; use on mobile or desktop (including Add to Home Screen).
- **Editors / admins** — Create and edit insights, add related sub-insights, manage users (admin), send email notifications.

## Tech stack

- **Frontend:** Vanilla HTML/CSS/JS, no framework. Shared nav and styles loaded from `nav.html`, `nav.css`, `shared.css`.
- **Auth & database:** Firebase Authentication (email/password), Firestore.
- **Rich text:** TinyMCE (CDN) for insight content.
- **Email:** SendGrid via a Netlify serverless function (`netlify/functions/send-email.js`).
- **Hosting:** Netlify (static site + functions). Build runs a script to generate `firebase-config.js` from env vars.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/gitouttamyhead/CFM.git
cd CFM
npm install
```

Dependencies are mainly for the Netlify email function (`@sendgrid/mail`) and optional scripts (e.g. Firestore backup).

### 2. Firebase

1. Create a project in [Firebase Console](https://console.firebase.google.com/) and enable **Authentication** (email/password) and **Firestore**.
2. In **Project settings → General**, add a web app and copy the config (apiKey, authDomain, projectId, etc.).
3. **Config in repo:** Either:
   - **Local:** Copy `firebase-config.example.js` to `firebase-config.js` and paste your config (do not commit `firebase-config.js`), or  
   - **Build-time:** Set env vars (`FIREBASE_API_KEY`, etc.) and run `node scripts/generate-firebase-config.js` (see `scripts/README-firebase-config.md`).

### 3. Firestore

- Deploy rules from this repo: `firebase deploy --only firestore:rules` (with `firebase.json` pointing at `firestore.rules`), or paste the contents of `firestore.rules` into the Firebase Console → Firestore → Rules.
- Create a `users` collection; each authenticated user should have a document keyed by `uid` with a `role` field: `admin`, `editor`, or `user`. Admins can set roles via the in-app admin dashboard (and invitations if you use that flow).

### 4. TinyMCE

The app loads TinyMCE from the Tiny Cloud CDN. The API key is in `tinymce-loader.js` (domain-restricted in Tiny Cloud). To use your own key, set `window.TINYMCE_API_KEY` before the loader runs (e.g. in an `app-config.js` that loads first).

### 5. Email (SendGrid)

For “Send email notification” and resend to work in production:

1. Set **SENDGRID_API_KEY** in Netlify (Site settings → Environment variables).
2. See **[EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md)** for SendGrid setup, sender verification, and the Netlify function.

### 6. Deploy to Netlify

- Connect the repo to Netlify; the repo’s `netlify.toml` defines build command, publish directory, and functions.
- Set **FIREBASE_*** and **SENDGRID_API_KEY** in Netlify environment variables.
- Optional: see [NETLIFY_AUTODEPLOY.md](NETLIFY_AUTODEPLOY.md) for linking GitHub and auto-deploys.

## Firestore collections

| Collection          | Purpose |
|--------------------|--------|
| **insights**       | Scripture insights (category: Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, Pearl of Great Price). Main insights can have `relatedInsights` (array of doc IDs); related docs have `relatedTo` (parent doc ID). |
| **gospelInsights** | Gospel Topics insights. Same shape: title, content, tags, created, relatedTo, relatedInsights. |
| **otherInsights**  | Other insights. Same shape. |
| **users**          | One doc per uid: `role` (`admin` \| `editor` \| `user`), optional `name`. |
| **invitations**    | Used by admin to invite users (if that flow is enabled). |
| **emailNotifications** | Log of sent notification emails (create-only from client). |

**Insight document shape (insights / gospelInsights / otherInsights):**

- `title`, `content` (HTML), `created` (timestamp), `category`, `tags` (array, optional), `summary` (optional).
- Main insight: no `relatedTo`; may have `relatedInsights` (array of related doc IDs).
- Related insight: `relatedTo` (parent doc ID). When created or deleted, the app updates the parent’s `relatedInsights` array.

Security is enforced by Firestore rules; see `firestore.rules` and [FIRESTORE_RULES.md](FIRESTORE_RULES.md).

## Scripts

- `node scripts/generate-firebase-config.js` — Builds `firebase-config.js` from env vars (used by Netlify build).
- `npm run backup` — Exports Firestore data (see `scripts/export-firestore.js` if present).
- `npm test` — Smoke tests: fetches key pages and checks for 200. Set `BASE_URL` to the site (e.g. `BASE_URL=https://yoursite.netlify.app npm test`). For local, run a server first (e.g. `npx serve -p 8888`) then `BASE_URL=http://localhost:8888 npm test`. Requires Node 18+.

For local scripts that need secrets, use a `.env` in the project root (do not commit it).

## Docs in this repo

- **[EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md)** — SendGrid and email notification setup.
- **[FIRESTORE_RULES.md](FIRESTORE_RULES.md)** — Firestore security rules and audit.
- **[scripts/README-firebase-config.md](scripts/README-firebase-config.md)** — Firebase config and API key handling.
- **[NETLIFY_AUTODEPLOY.md](NETLIFY_AUTODEPLOY.md)** — Optional automatic deploys from GitHub.

## License

ISC (see package.json).
