// Replace these values with YOUR Firebase config from Step 2.4
const firebaseConfig = {
    apiKey: "AIzaSyCJFa3CV_9cS6JquGuSEybuHQDKpGHe360",
    authDomain: "clinic-crm-206a0.firebaseapp.com",
    projectId: "clinic-crm-206a0",
    storageBucket:  "clinic-crm-206a0.firebasestorage.app",
    messagingSenderId:  "150585183522",
    appId: "1:150585183522:web:c0a91b70e8edab78fc697b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create shortcuts to Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase initialized successfully!");