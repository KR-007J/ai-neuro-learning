import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  projectId: "neurolearn-ai-932b3e",
  appId: "1:565317568870:web:e1e8c3ab74e00c875a60a7",
  storageBucket: "neurolearn-ai-932b3e.firebasestorage.app",
  apiKey: "AIzaSyD9MC5OVwjZdINiBMYfeaSJbftv-aneetk",
  authDomain: "neurolearn-ai-932b3e.firebaseapp.com",
  messagingSenderId: "565317568870"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged };
