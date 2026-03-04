# Task 22: Automatic deploys from GitHub

**Why:** Pushing to GitHub can trigger Netlify deploys so you don’t deploy manually.

## Steps (in Netlify dashboard)

1. **Connect the repo**
   - Netlify dashboard → **Add new site** (or **Site configuration** → **Build & deploy** → **Link repository**).
   - Choose **GitHub**, authorize if needed, then select the **CFM repo**.

2. **Branch**
   - Set **Production branch** to `main` (or whatever you use as default).

3. **Build settings**
   - Netlify will use `netlify.toml` in the repo (publish dir, build command, functions). No need to duplicate them in the UI unless you want to override.

4. **Verify**
   - Push a small change to `main` and confirm a new deploy runs and the site updates.

5. **Optional: Deploy previews**
   - **Build & deploy** → **Deploy previews** → enable “Deploy previews for pull requests” so each PR gets a preview URL.

---

*Task 22 complete when the repo is linked and a push to `main` triggers a deploy.*
