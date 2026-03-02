// client/src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Cấu hình Firebase 
// THAY THẾ CÁC GIÁ TRỊ NÀY BẰNG CẤU HÌNH THỰC TẾ TỪ CONSOLE FIREBASE 
const firebaseConfig = {
  apiKey: "AIzaSyD8N225oVzauXPXpch_XFYmwOQrYGPdc8M",
  authDomain: "appkltn-c6315.firebaseapp.com",
  projectId: "appkltn-c6315",
  storageBucket: "appkltn-c6315.firebasestorage.app",
  messagingSenderId: "756510518354",
  appId: "1:756510518354:web:786598552de285a0de438b",
  measurementId: "G-DWLXK5G419"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Lấy đối tượng Auth
const googleProvider = new GoogleAuthProvider(); // Lấy đối tượng Google Auth Provider

export { auth, googleProvider };