// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCp2SDLJGTTW5JfUrZ-UBPRby8LTsNz2H8",
  authDomain: "pancita-98930.firebaseapp.com",
  projectId: "pancita-98930",
  storageBucket: "pancita-98930.firebasestorage.app",
  messagingSenderId: "840504117692",
  appId: "1:840504117692:web:73813fcd3ad58061af03b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export app para usar en otros archivos
export { app };