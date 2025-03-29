// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAp5VeIRdM6huGk-wp2D1_aa4UtpsLQZf4",
  authDomain: "extrator-f93c3.firebaseapp.com",
  projectId: "extrator-f93c3",
  storageBucket: "extrator-f93c3.firebasestorage.app",
  messagingSenderId: "924953076131",
  appId: "1:924953076131:web:6a98af6eefe220fae57a16",
  measurementId: "G-BM9TZVQK1M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
