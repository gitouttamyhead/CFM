# CFM Phase 1 verification checklist

Use this before moving to Phase 2 (DRY architecture). Tick as you go.

**Recommended:** Test on your **deployed Netlify URL** (push your branch, let it deploy, then run through the list). No local server needed.

## 1. Full walkthrough (desktop)

- [ ] **Login** — Open app, sign in with a test account. Login form and redirect work.
- [ ] **Browse categories** — Open each and confirm content loads:
  - [ ] Scripture (menu) → Old Testament, New Testament, Book of Mormon, Doctrine & Covenants, Pearl of Great Price
  - [ ] Gospel Topics
  - [ ] Other Insights
- [ ] **Search** — Run a search; results show from Scripture, Gospel Topics, and Other where applicable.
- [ ] **View details** — Click a result from each type (Scripture, Gospel Topics, Other); correct insight loads and URL has `id` and `collection`.
- [ ] **Print** — Use Print on search results and on an insight detail page; layout is acceptable.

## 2. Search across collections

- [ ] Search for a term that appears in **Scripture** insights — results include scripture.
- [ ] Search for a term that appears in **Gospel Topics** — results include gospel.
- [ ] Search for a term in **Other** (if any) — results include other.
- [ ] Category filter "Gospel Topics" / "Other" limits results to that collection.

## 3. Result links

- [ ] Click a **Scripture** search result → opens insight-scripture with correct insight.
- [ ] Click a **Gospel Topics** result → opens insight-gospel with correct insight.
- [ ] Click an **Other** result → opens insight-other with correct insight.

## 4. Console

- [ ] Open DevTools (F12) → Console. Visit: index, scripture menu, one category, search, one detail page.
- [ ] No red errors; note any yellow warnings (fix or defer).

## 5. Auth (incognito)

- [ ] Incognito window: open `search.html` (or any protected URL) → redirects to login.
- [ ] After login, same URL shows content.

## 6. Deploy and mobile

- [ ] Deploy to Netlify (push to connected branch or manual deploy) if not already auto-deploying.
- [ ] On a phone: open deployed URL, login, browse one category, run search, open one insight. No broken layout or dead links.

---

When all are checked, Phase 1 is verified. (Local server is optional; the custom `serve.js` in this folder was for local testing only—you can ignore or remove it.)
