import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJgjzcrYcP356OsJWYW254DYqqaZ3cMpI",
  authDomain: "entre-capitulos.firebaseapp.com",
  projectId: "entre-capitulos",
  storageBucket: "entre-capitulos.firebasestorage.app",
  messagingSenderId: "827641162456",
  appId: "1:827641162456:web:036058f1fecf09f66a05ad",
  measurementId: "G-D5J0FJW5SZ"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };