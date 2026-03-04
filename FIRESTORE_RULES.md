# Firestore Security Rules — CFM App

**Purpose:** Document and audit Firestore rules so access control is enforced server-side, not only by UI.

---

## 1. Where to find current rules

1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Firestore Database** → **Rules**.
2. Copy the contents and paste them below under **Current rules (as of audit)** for version control.
3. To deploy the recommended rules: either paste the contents of `firestore.rules` (in this folder) into the Firebase Console and publish, or from this directory run `firebase deploy --only firestore:rules` (requires `firebase.json` with `firestore.rules` path).

---

## 2. Collections used by the app

| Collection           | Read | Write | Who (intended) |
|----------------------|------|-------|----------------|
| **insights**         | ✓    | ✓     | All authenticated read; **admin/editor** only create/update/delete |
| **gospelInsights**   | ✓    | ✓     | Same as above |
| **otherInsights**    | ✓    | ✓     | Same as above |
| **users**            | Own doc + (admin: all) | **Admin** only (role updates) | Each user reads own doc; admin reads all and updates roles |
| **invitations**      | —    | ✓     | **Admin** only create/update/delete |
| **emailNotifications** | —  | ✓     | Authenticated **create** only (log sent emails); no client read needed |

---

## 3. Audit checklist

- [ ] **Unauthenticated:** No read or write to any collection. (`request.auth != null` for any allowed operation.)
- [ ] **insights, gospelInsights, otherInsights:** Read if authenticated. Create/update/delete only if `users/{uid}.role` is `admin` or `editor`.
- [ ] **users:** Read own document (`request.auth.uid == userId`) for profile/nav; admin can read all. Write (e.g. role change) only if `users/{request.auth.uid}.role == 'admin'`.
- [ ] **invitations:** Only admin can read/write (or at least write). If unauthenticated or non-admin can write, **tighten**.
- [ ] **emailNotifications:** Only allow **create** by authenticated users (editors/admins send notifications). Optionally deny client read.

After changing rules in the console, use **Rules Playground** or test with a non-admin account to confirm writes are denied.

---

## 4. Current rules (as of audit)

_Paste the rules from Firebase Console here so they’re documented in the repo._

```
// Replace this block with your actual rules from Firestore > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... your current rules ...
  }
}
```

---

## 5. Recommended rules

Use these as a template. They assume a `users` document per uid with a `role` field (`admin`, `editor`, or `user`).

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isEditorOrAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'editor'];
    }

    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /insights/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isEditorOrAdmin();
    }
    match /gospelInsights/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isEditorOrAdmin();
    }
    match /otherInsights/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isEditorOrAdmin();
    }

    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }

    match /invitations/{docId} {
      allow read, write: if isAdmin();
    }

    match /emailNotifications/{docId} {
      allow create: if request.auth != null;
      allow read, update, delete: if false;
    }
  }
}
```

---

## 6. If rules are too permissive

- If you currently have `allow read, write: if true` or no rules, **replace** with the recommended rules above (after testing in the Rules Playground).
- Deploy: Firebase Console → Rules → Edit → Publish, or `firebase deploy --only firestore:rules` if using a local `firestore.rules` file.
- Test: log in as a normal user (role `user`) and try from the browser console: `firebase.firestore().collection('insights').add({ title: 'x' })` — it should be denied. Same for `users` and `invitations` as non-admin.
