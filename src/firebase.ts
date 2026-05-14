import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyApOmVV8rWA1TDXZzJ43fLeo421DFMTzoY",
  authDomain: "sais-qr-crm.firebaseapp.com",
  projectId: "sais-qr-crm",
  storageBucket: "sais-qr-crm.firebasestorage.app",
  messagingSenderId: "821653574071",
  appId: "1:821653574071:web:6ff30ec263664c7e6f1832",
  measurementId: "G-P22P9L6763"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
