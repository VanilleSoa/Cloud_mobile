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
  apiKey: "AIzaSyCykKeXJlzssjXyCqEWsSHZ_T6ljabYTbM",
  authDomain: "cloud-web-mobile.firebaseapp.com",
  projectId: "cloud-web-mobile",
  storageBucket: "cloud-web-mobile.firebasestorage.app",
  messagingSenderId: "259432446366",
  appId: "1:259432446366:web:127d6b1adb0febf47bbe8f",
  measurementId: "G-FNRL8RY0W6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app)
const db = getFirestore(app)
export {app, analytics, auth, db};
