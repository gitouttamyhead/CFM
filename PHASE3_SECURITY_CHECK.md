# Phase 3 security check (Task 15)

Confirm that the hardening from Phase 3 actually works. Run through these steps and check off as you go.

---

## 1. XSS sanitization

- [ ] **Insight content:** As an editor, create or edit an insight and put this in the body:  
  `<script>alert('xss')</script>`  
  Save, then view the insight as a reader. The script should **not** run; the text may appear stripped or escaped.
- [ ] **Search/category:** If you put HTML/script in an insight **title** or **summary**, open the category page and search results — no script should run, and the title/summary should be safe.

---

## 2. Firestore rules

- [ ] Log in as a **normal user** (role `user`, not admin).
- [ ] Open browser dev tools (F12) → Console.
- [ ] Run:  
  `firebase.firestore().collection('users').get()`  
  (or `window.db.collection('users').get()` if your app exposes `db` on window.)
- [ ] You should get a **permission-denied** (or similar) error. Non-admins must not read the whole `users` collection.
- [ ] (Optional) As the same user, try writing to an insight collection, e.g.  
  `window.db.collection('insights').add({ title: 'test', content: 'x' })`  
  — should also be denied.

---

## 3. Admin dashboard

- [ ] Log in as an **admin**.
- [ ] Open the Admin Dashboard. It should load and show the user table.
- [ ] Use **Make User**, **Make Editor**, and **Make Admin** (with confirmation) and confirm the list refreshes and roles update as expected.

---

## 4. Editor flows

- [ ] Log in as an **editor** (or admin).
- [ ] Create a new insight on a category page; save and confirm it appears.
- [ ] Edit an existing insight and save; confirm changes show.
- [ ] On an insight detail page, use **Create Related Insight** if available; save and confirm the related insight appears.

---

When all items are checked, Phase 3 security verification is done. If anything fails, fix the relevant control (sanitization, Firestore rules, or UI) and re-test.
