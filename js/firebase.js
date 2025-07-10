// firebase.js - Complete Firebase Configuration and Utilities

// Firebase configuration
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
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();
const functions = firebase.functions();
const analytics = firebase.analytics();

// Constants
const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";
const COMMISSION_RATES = {
  admin: 0.10,
  directReferral: 0.10,
  uplinePerLevel: 0.02,
  tradingPool: 0.70
};

// Current user state
let currentUser = null;
let userData = null;

// Authentication state observer
auth.onAuthStateChanged(handleAuthStateChange);

// ==================== CORE FUNCTIONS ====================

/**
 * Handles authentication state changes
 * @param {firebase.User} user - The user object
 */
function handleAuthStateChange(user) {
  if (user) {
    currentUser = user;
    initializeUserData(user.uid)
      .then(() => {
        logUserActivity('login');
        updateLastActive(user.uid);
      })
      .catch(error => {
        console.error("User data initialization failed:", error);
        auth.signOut();
      });
  } else {
    currentUser = null;
    userData = null;
    redirectToLogin();
  }
}

/**
 * Initializes user data in Firebase
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
async function initializeUserData(uid) {
  const userRef = database.ref(`users/${uid}`);
  const snapshot = await userRef.once('value');
  
  if (!snapshot.exists()) {
    const defaultData = createDefaultUserData();
    await userRef.set(defaultData);
    userData = defaultData;
  } else {
    userData = snapshot.val();
  }
  
  // Load additional user data to UI
  loadUserDataToUI(uid);
}

/**
 * Creates default user data structure
 * @returns {object} Default user data
 */
function createDefaultUserData() {
  return {
    name: currentUser.displayName || "User",
    email: currentUser.email,
    phoneNumber: currentUser.phoneNumber || "",
    balance: 0,
    tradingProfit: 0,
    referralEarnings: 0,
    teamEarnings: 0,
    totalInvested: 0,
    totalWithdrawn: 0,
    referredBy: null,
    referralsCount: 0,
    transactions: {},
    investments: {},
    directReferrals: {},
    lastActive: Date.now(),
    accountStatus: "active",
    kycVerified: false,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    lastLogin: firebase.database.ServerValue.TIMESTAMP
  };
}

// ==================== TRANSACTION FUNCTIONS ====================

/**
 * Handles package purchase
 * @param {number} amount - Package amount
 * @returns {Promise<void>}
 */
async function purchasePackage(amount) {
  if (!validatePurchase(amount)) return;

  try {
    const uid = currentUser.uid;
    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    const updates = {};
    
    // Generate IDs
    const packageId = database.ref().child('investments').push().key;
    const txId = database.ref().child('transactions').push().key;

    // Calculate distributions
    const distributions = calculateDistributions(amount);
    
    // Prepare updates
    prepareUserUpdates(uid, amount, distributions, packageId, txId, timestamp, updates);
    prepareAdminUpdates(distributions.admin, timestamp, updates);
    prepareTradingPoolUpdates(distributions.tradingPool, uid, timestamp, updates);
    
    // Handle referrals
    if (userData.referredBy) {
      await handleReferrals(userData.referredBy, uid, amount, timestamp, updates);
    }

    // Execute all updates
    await database.ref().update(updates);
    
    // Refresh and show success
    await loadUserData(uid);
    showPurchaseSuccess(amount, distributions);
    
  } catch (error) {
    handleTransactionError(error, 'package purchase');
  }
}

/**
 * Validates purchase requirements
 * @param {number} amount 
 * @returns {boolean}
 */
function validatePurchase(amount) {
  if (!currentUser || !userData) {
    showAlert("Please wait, user data is loading...");
    return false;
  }

  if (isNaN(amount) {
    showAlert("Invalid package amount");
    return false;
  }

  if (userData.accountStatus !== "active") {
    showAlert("Your account is not active for transactions");
    return false;
  }

  if (amount > userData.balance) {
    showAlert("Insufficient balance");
    return false;
  }

  return confirm(`Confirm purchase of $${amount.toFixed(2)} package?`);
}

/**
 * Calculates all distribution amounts
 * @param {number} amount 
 * @returns {object}
 */
function calculateDistributions(amount) {
  return {
    admin: amount * COMMISSION_RATES.admin,
    directReferral: amount * COMMISSION_RATES.directReferral,
    tradingPool: amount * COMMISSION_RATES.tradingPool,
    userProfit: amount * COMMISSION_RATES.userProfit,
    perLevelCommission: amount * COMMISSION_RATES.uplinePerLevel
  };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Updates user's last active timestamp
 * @param {string} uid 
 */
function updateLastActive(uid) {
  database.ref(`users/${uid}/lastActive`).set(Date.now());
  setInterval(() => {
    database.ref(`users/${uid}/lastActive`).set(Date.now());
  }, 60000);
}

/**
 * Logs user activity
 * @param {string} activityType 
 */
function logUserActivity(activityType) {
  if (!currentUser) return;
  
  const logRef = database.ref(`userLogs/${currentUser.uid}`).push();
  logRef.set({
    activity: activityType,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    ipAddress: '', // Would be set from client or cloud function
    userAgent: navigator.userAgent
  });
}

/**
 * Redirects to login page
 */
function redirectToLogin() {
  if (!window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
  }
}

/**
 * Displays alert message
 * @param {string} message 
 */
function showAlert(message) {
  alert(message);
}

// ==================== EXPORTS ====================
// Export functions that need to be available globally
window.firebaseUtils = {
  purchasePackage,
  loadUserData,
  getCurrentUser: () => currentUser,
  getUserData: () => userData,
  logout: () => auth.signOut().then(redirectToLogin)
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize package buttons
  document.querySelectorAll('[data-package]').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseFloat(btn.getAttribute('data-package'));
      if (!isNaN(amount)) {
        purchasePackage(amount);
      }
    });
  });

  // Initialize logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.signOut());
  }
});
