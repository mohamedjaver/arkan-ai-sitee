// ═══════════════════════════════════════════════
//  ARKAN — إعداد Firebase المشترك
//  يُستورد في login / dashboard / admin
// ═══════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, onSnapshot, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtL-OySTK9FeyD0h-31BiupYFtGBxbJ_U",
  authDomain: "arkan-rates-prod.firebaseapp.com",
  projectId: "arkan-rates-prod",
  storageBucket: "arkan-rates-prod.firebasestorage.app",
  messagingSenderId: "1039254650364",
  appId: "1:1039254650364:web:7972ce9eb77c24004d0679"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ⚠️ ضع هنا بريدك ليُمنح صلاحية الأدمن (يطابق قواعد Firestore)
const ADMIN_EMAILS = ["Mohamedarbi0208@gmail.com"];

export {
  app, auth, db, ADMIN_EMAILS,
  onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, onSnapshot, getDocs, serverTimestamp
};
