// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBg-pyvhI2rSrg0o-wh75R3eT3jjv-meR4",
  authDomain: "fir-project-59287.firebaseapp.com",
  projectId: "fir-project-59287",
  storageBucket: "fir-project-59287.firebasestorage.app",
  messagingSenderId: "42861926529",
  appId: "1:42861926529:web:e4874bf636adcbf9451580",
  measurementId: "G-T9MRNR6JG8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app)
const db = getFirestore(app)
export {app, analytics, auth, db};
