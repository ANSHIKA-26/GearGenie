import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBv6Hj9KKzS2azZfxsIj7DMuxkIp0x-fz8",
  authDomain: "tekion-a6b95.firebaseapp.com",
  projectId: "tekion-a6b95",
  storageBucket: "tekion-a6b95.firebasestorage.app",
  messagingSenderId: "905316982744",
  appId: "1:905316982744:web:2f54343d3ff5801ae8dcad",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

