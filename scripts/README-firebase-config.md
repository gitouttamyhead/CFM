# Firebase config (API key not in repo)

The API key is no longer committed. It is generated at **build time** from environment variables.

## Netlify

1. In Netlify: **Site settings → Environment variables**
2. Add:
   - `FIREBASE_API_KEY` = your Firebase web API key (from Firebase Console → Project settings → General → Your apps)
   - (Optional) Override others only if different: `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc.
3. Redeploy. The build runs `node scripts/generate-firebase-config.js`, which writes `firebase-config.js` from these env vars.

## Local development

From the **CFM** directory (where `netlify.toml` lives):

```bash
# Option A: env var then generate
set FIREBASE_API_KEY=your_key_here
node scripts/generate-firebase-config.js

# Option B: copy example and edit
copy firebase-config.example.js firebase-config.js
# Edit firebase-config.js and paste your real config (get from Firebase Console).
```

`firebase-config.js` is gitignored; never commit it.

## After fixing the leak

1. **Restrict the key** in [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials):  
   Application restrictions → HTTP referrers → add `https://comefollowme.netlify.app/*` and `http://localhost:*`.  
   API restrictions → restrict to only the APIs you use (e.g. Firebase Authentication, Firestore).

2. **Rotate the key** (recommended since it was in GitHub): Create a new web API key in Firebase, set it as `FIREBASE_API_KEY` in Netlify and locally, then disable or delete the old key.
