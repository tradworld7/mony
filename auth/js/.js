// auth.js - Optimized Authentication System

// Import Firebase modules (version 9+)
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  signInWithEmailAndPassword,
  browserLocalPersistence,
  onAuthStateChanged 
} from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";

// Firebase configuration (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBshAGZScyo7PJegLHMzORbkkrCLGD6U5s",
  authDomain: "mywebsite-600d3.firebaseapp.com",
  databaseURL: "https://mywebsite-600d3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mywebsite-600d3",
  storageBucket: "mywebsite-600d3.firebasestorage.app",
  messagingSenderId: "584485288598",
  appId: "1:584485288598:web:01856eaa18ba5ada49e0b7",
  measurementId: "G-GQ9J9QH42J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Current user data
let currentUser = null;
let userData = null;

// Check authentication state with session persistence
function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
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
async function loginUser() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value.trim();
  
  if (!email || !password) {
    showToast('Please enter both email and password', 'error');
    return;
  }
  
  try {
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Signed in successfully
    showToast('Login successful!', 'success');
    
    // Redirect to dashboard after 1 second
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (error) {
    showToast('Login error: ' + error.message, 'error');
  }
}

// Load user data from Firebase
function loadUserData(userId) {
  const userRef = ref(database, 'users/' + userId);
  
  onValue(userRef, (snapshot) => {
    userData = snapshot.val();
    if (userData) {
      console.log("User data loaded:", userData);
      updateUIWithUserData();
    }
  }, (error) => {
    console.error("Error loading user data:", error);
    showToast('Error loading user data', 'error');
  });
}

// Update UI with user data
function updateUIWithUserData() {
  if (!userData || !currentUser) return;

  // Update dashboard elements
  const updateElement = (id, value, prefix = '', suffix = '') => {
    const element = document.getElementById(id);
    if (element) element.textContent = prefix + value + suffix;
  };

  // Update profile elements
  if (document.getElementById('userEmail')) {
    document.getElementById('userEmail').value = currentUser.email || '';
  }
}

// Show toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// Initialize auth system when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  
  // Add login form submit handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loginUser();
    });
  }
});

// Export functions if using modules
export { auth, database, loginUser, checkAuthState };
