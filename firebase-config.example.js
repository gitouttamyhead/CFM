// Copy to firebase-config.js and fill in real values (or use generate-firebase-config.js + env vars).
// firebase-config.js is gitignored so the API key is never committed.
window.__FIREBASE_CONFIG__ = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(window.__FIREBASE_CONFIG__);
  window.db = firebase.firestore();
  window.auth = firebase.auth();
}
