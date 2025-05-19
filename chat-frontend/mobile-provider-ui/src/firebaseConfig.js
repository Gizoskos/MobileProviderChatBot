// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBzcW9ly1jLk2SuPEUx1M08MzAM7IAwsFY",
    authDomain: "mobileproviderai.firebaseapp.com",
    projectId: "mobileproviderai",
    storageBucket: "mobileproviderai.firebasestorage.app",
    messagingSenderId: "648965665067",
    appId: "1:648965665067:web:d36d15e131ac12ba19956e",
    measurementId: "G-5HG423TCWH"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

