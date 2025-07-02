// auth.js - Fixed Authentication System

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCzHmIimieea8H9KzYFDSqD0lGOCZjxHYw",
    authDomain: "myapp-ee226.firebaseapp.com",
    databaseURL: "https://myapp-ee226-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "myapp-ee226",
    storageBucket: "myapp-ee226.appspot.com",
    messagingSenderId: "272405753135",
    appId: "1:272405753135:web:1b5f9a7c2a8c8e8f8a8b8b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Current user data
let currentUser = null;
let userData = null;

// Check authentication state with session persistence
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            currentUser = user;
            
            // Save to local storage
            localStorage.setItem('tradeWorldUser', JSON.stringify({
                uid: user.uid,
                email: user.email,
                lastLogin: Date.now()
            }));
            
            // Load user data
            loadUserData(user.uid);
            
        } else {
            // No user is signed in
            currentUser = null;
            userData = null;
            localStorage.removeItem('tradeWorldUser');
            
            // Redirect to login if not on auth pages
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Login user with session persistence
function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
    }
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            return auth.signInWithEmailAndPassword(email, password);
        })
        .then((userCredential) => {
            // Signed in successfully
            showToast('Login successful!', 'success');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        })
        .catch((error) => {
            showToast('Login error: ' + error.message, 'error');
        });
}

// Other auth functions (signup, logout, etc.) remain same as before
// ...