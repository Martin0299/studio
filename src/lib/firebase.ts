// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMiRtKb8i61yh_6YjD2iKW-2Z4OSf-YCA",
  authDomain: "lunabloom-xymbe.firebaseapp.com",
  projectId: "lunabloom-xymbe",
  storageBucket: "lunabloom-xymbe.appspot.com", // Corrected common typo: .appspot.com for storageBucket
  messagingSenderId: "190315157576",
  appId: "1:190315157576:web:41da9b6f525f24191f207d",
  measurementId: "G-T47J05Q6LD"
};

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null; // Initialize as null

// Ensure Firebase is initialized only on the client side
if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
} else {
  // Provide a fallback or handle server-side initialization if needed,
  // though Analytics is client-side. For now, app might be initialized
  // without client-side services on the server.
  // Or, more simply for client-heavy apps, initialize only if on client.
  // This example assumes `app` might be needed server-side for other services
  // but analytics specifically is client-side.
  // A common pattern for client-only init:
  // app = initializeApp(firebaseConfig); // This might be okay if config is public
  // if (typeof window !== 'undefined') {
  //   analytics = getAnalytics(app);
  // }
  // For simplicity and focus on analytics being client-side:
  // We'll stick to the conditional initialization for client-side services.
  // If you only need Firebase on the client, wrap the whole init.
}

// Export the app and analytics instances
// It's good practice to export them conditionally or ensure they are used appropriately
// if this file can be imported on the server.
export { app, analytics };
