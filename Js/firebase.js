import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmbNc9M0WsB0Fg1Vh8TofGQQRiPdDM-Jg",
  authDomain: "hr-capital-7d2ad.firebaseapp.com",
  projectId: "hr-capital-7d2ad",
  storageBucket: "hr-capital-7d2ad.firebasestorage.app",
  messagingSenderId: "1075074139027",
  appId: "1:1075074139027:web:2ca2bc09d89369116d1e66"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Every page that talks to Firestore first needs an authenticated
// session (Firestore Security Rules require request.auth != null).
// We use anonymous auth since this app doesn't have real Firebase
// Authentication wired into its custom mobile/password login yet.
// `authReady` resolves once a session exists, so pages can:
//   await authReady;
// before running their first Firestore read/write.
const authReady = new Promise((resolve, reject) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      resolve(user);
    } else {
      signInAnonymously(auth).catch(reject);
    }
  });
});

export {
  db,
  auth,
  authReady,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
};
