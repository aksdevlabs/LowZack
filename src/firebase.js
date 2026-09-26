import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

import { getAuth } from "firebase/auth";

import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyCAAAW7uFeoPL_Al3FvN40HuGfTTxtcZOg",
  authDomain: "lowzack-15af4.firebaseapp.com",
  projectId: "lowzack-15af4",
  storageBucket: "lowzack-15af4.firebasestorage.app",
  messagingSenderId: "648742262920",
  appId: "1:648742262920:web:82400e39d4f740a2ac673d",
  measurementId: "G-JMJH0RKDPX"
};


const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);


export default app;