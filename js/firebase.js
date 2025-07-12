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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();
const functions = firebase.functions();

// Constants
const ADMIN_USER_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";
const COMMISSION_STRUCTURE = {
  directReferral: 0.10,    // 10% for direct referral (level 1)
  admin: 0.10,             // 10% for admin
  level2: 0.02,            // 2% for level 2
  level3: 0.02,            // 2% for level 3
  level4: 0.02,            // 2% for level 4
  level5: 0.02,            // 2% for level 5
  tradingPool: 0.70,       // 70% for trading pool
  userProfit: 0.02         // 2% immediate profit for user
};

// Current user state
let currentUser = null;
let userData = null;

// Authentication state observer
auth.onAuthStateChanged(handleAuthStateChange);

// ==================== CORE FUNCTIONS ====================

function handleAuthStateChange(user) {
  if (user) {
    currentUser = user;
    initializeUserData(user.uid)
      .then(() => {
        updateLastActive(user.uid);
        loadUserDataToUI(user.uid);
      })
      .catch(error => {
        console.error("User data initialization failed:", error);
        showToast("Error loading user data. Please try again.", "error");
        auth.signOut();
      });
  } else {
    currentUser = null;
    userData = null;
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  }
}

async function initializeUserData(uid) {
  try {
    const userRef = database.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      const defaultData = {
        name: currentUser.displayName || "User",
        email: currentUser.email,
        balance: 0,
        tradingProfit: 0,
        referralEarnings: 0,
        teamEarnings: 0,
        tradingPoolEarnings: 0,
        referredBy: null,
        transactions: {},
        investments: {},
        directReferrals: {},
        teamStructure: {
          level1Count: 0,
          level2Count: 0,
          level3Count: 0,
          level4Count: 0,
          level5Count: 0
        },
        lastActive: Date.now(),
        accountStatus: "active",
        kycVerified: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await userRef.set(defaultData);
      userData = defaultData;
    } else {
      userData = snapshot.val();
    }
  } catch (error) {
    console.error("Error initializing user data:", error);
    throw error;
  }
}

// ==================== TRANSACTION FUNCTIONS ====================

async function purchasePackage(amount) {
  if (!currentUser || !userData) {
    showToast("Please wait, user data is loading...", "error");
    return;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    showToast("Invalid package amount", "error");
    return;
  }

  if (userData.accountStatus !== "active") {
    showToast("Your account is not active for transactions", "error");
    return;
  }

  const uid = currentUser.uid;
  const currentBalance = parseFloat(userData.balance || 0);
  
  if (amount > currentBalance) {
    showToast("Insufficient balance", "error");
    return;
  }

  try {
    const updates = {};
    const timestamp = Date.now();
    const packageId = database.ref().child("investments").push().key;
    const txId = database.ref().child("transactions").push().key;

    // Calculate commissions
    const adminCommission = amount * COMMISSION_STRUCTURE.admin;
    const directReferralCommission = amount * COMMISSION_STRUCTURE.directReferral;
    const tradingPool = amount * COMMISSION_STRUCTURE.tradingPool;
    const userProfit = amount * COMMISSION_STRUCTURE.userProfit;

    // User updates
    updates[`users/${uid}/balance`] = currentBalance - amount + userProfit;
    updates[`users/${uid}/tradingProfit`] = (userData.tradingProfit || 0) + userProfit;

    // Investment record
    updates[`users/${uid}/investments/${packageId}`] = {
      amount,
      status: "active",
      purchaseDate: timestamp,
      expectedReturn: amount * 2,
      maturityDate: timestamp + 30 * 24 * 60 * 60 * 1000,
      profitEarned: 0,
      lastProfitDate: null
    };

    // Transaction records
    updates[`transactions/${txId}`] = {
      userId: uid,
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased package of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    updates[`users/${uid}/transactions/${txId}`] = {
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased package of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    // Admin commission
    updates[`users/${ADMIN_USER_ID}/balance`] = firebase.database.ServerValue.increment(adminCommission);
    updates[`users/${ADMIN_USER_ID}/adminEarnings`] = firebase.database.ServerValue.increment(adminCommission);
    
    const adminTxId = database.ref().child("transactions").push().key;
    updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
      type: "admin_commission",
      amount: adminCommission,
      status: "completed",
      timestamp,
      details: `Commission from user ${uid} package purchase`,
      balanceBefore: (await database.ref(`users/${ADMIN_USER_ID}/balance`).once("value")).val() || 0,
      balanceAfter: firebase.database.ServerValue.increment(adminCommission)
    };

    // Trading pool
    updates[`system/tradingPool`] = firebase.database.ServerValue.increment(tradingPool);
    updates[`system/poolTransactions/${txId}`] = {
      userId: uid,
      amount: tradingPool,
      timestamp,
      details: `Contribution from ${uid} package purchase`
    };

    // Distribute trading pool to active users
    await distributeTradingPool(tradingPool, timestamp, updates);

    // Referral commissions
    if (userData.referredBy) {
      await handleReferralCommissions(userData.referredBy, uid, amount, timestamp, updates);
    }

    // Execute all updates
    await database.ref().update(updates);
    
    // Refresh data
    await loadUserData(uid);
    await loadTeamStructure(uid);
    
    showToast(`Package of $${amount.toFixed(2)} purchased successfully!`, "success");
    
  } catch (error) {
    console.error("Package purchase error:", error);
    showToast("Error processing package purchase. Please try again.", "error");
  }
}

async function distributeTradingPool(amount, timestamp, updates) {
  try {
    const activeUsersSnapshot = await database.ref("users")
      .orderByChild("accountStatus")
      .equalTo("active")
      .once("value");
    
    const activeUsers = activeUsersSnapshot.val() || {};
    const activeUserIds = Object.keys(activeUsers);
    
    if (activeUserIds.length === 0) return;
    
    const sharePerUser = amount / activeUserIds.length;
    
    activeUserIds.forEach(uid => {
      updates[`users/${uid}/balance`] = firebase.database.ServerValue.increment(sharePerUser);
      updates[`users/${uid}/tradingPoolEarnings`] = firebase.database.ServerValue.increment(sharePerUser);
      
      const txId = database.ref().child("transactions").push().key;
      updates[`users/${uid}/transactions/${txId}`] = {
        type: "trading_pool_share",
        amount: sharePerUser,
        status: "completed",
        timestamp,
        details: `Trading pool distribution from system`,
        balanceBefore: (activeUsers[uid].balance || 0),
        balanceAfter: (activeUsers[uid].balance || 0) + sharePerUser
      };
    });
    
  } catch (error) {
    console.error("Error distributing trading pool:", error);
  }
}

async function handleReferralCommissions(referrerId, userId, packageAmount, timestamp, updates) {
  try {
    let currentUpline = referrerId;
    const commissionRates = [
      COMMISSION_STRUCTURE.directReferral,
      COMMISSION_STRUCTURE.level2,
      COMMISSION_STRUCTURE.level3,
      COMMISSION_STRUCTURE.level4,
      COMMISSION_STRUCTURE.level5
    ];
    
    for (let level = 0; level < 5 && currentUpline; level++) {
      const commission = packageAmount * commissionRates[level];
      const uplineTxId = database.ref().child("transactions").push().key;
      
      updates[`users/${currentUpline}/balance`] = firebase.database.ServerValue.increment(commission);
      
      if (level === 0) {
        updates[`users/${currentUpline}/referralEarnings`] = firebase.database.ServerValue.increment(commission);
      } else {
        updates[`users/${currentUpline}/teamEarnings`] = firebase.database.ServerValue.increment(commission);
      }
      
      updates[`users/${currentUpline}/transactions/${uplineTxId}`] = {
        type: level === 0 ? "direct_referral" : `team_level_${level+1}`,
        amount: commission,
        status: "completed",
        timestamp,
        details: level === 0 
          ? `Direct referral commission from ${userId}`
          : `Level ${level+1} team commission from ${userId}`,
        packageAmount,
        level: level + 1
      };
      
      const uplineSnapshot = await database.ref(`users/${currentUpline}/referredBy`).once("value");
      currentUpline = uplineSnapshot.val();
    }
    
  } catch (error) {
    console.error("Referral commission error:", error);
  }
}

// ==================== UI FUNCTIONS ====================

async function loadUserDataToUI(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    
    if (!userData) return;

    // Update UI elements
    if (document.getElementById("userBalance")) {
      document.getElementById("userBalance").textContent = `$${(userData.balance || 0).toFixed(2)}`;
    }
    if (document.getElementById("tradingProfit")) {
      document.getElementById("tradingProfit").textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
    }
    if (document.getElementById("referralEarnings")) {
      document.getElementById("referralEarnings").textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;
    }
    if (document.getElementById("teamEarnings")) {
      document.getElementById("teamEarnings").textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
    }
    if (document.getElementById("tradingPoolEarnings")) {
      document.getElementById("tradingPoolEarnings").textContent = `$${(userData.tradingPoolEarnings || 0).toFixed(2)}`;
    }
    
    // Load transaction history
    await loadTransactionHistory(uid);
    
  } catch (error) {
    console.error("Error loading user data to UI:", error);
    showToast("Error loading data. Please refresh the page.", "error");
  }
}

async function loadTransactionHistory(uid, limit = 10) {
  try {
    const snapshot = await database.ref(`users/${uid}/transactions`)
      .orderByChild("timestamp")
      .limitToLast(limit)
      .once("value");
    
    const container = document.getElementById("transactionHistory");
    if (!container) return;
    
    container.innerHTML = "";
    const data = snapshot.val();
    
    if (data) {
      Object.values(data).reverse().forEach((tx) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${new Date(tx.timestamp).toLocaleString()}</td>
          <td>${tx.type.replace(/_/g, ' ').toUpperCase()}</td>
          <td class="${tx.amount >= 0 ? 'text-success' : 'text-danger'}">
            $${Math.abs(tx.amount).toFixed(2)}
          </td>
          <td>${tx.status}</td>
          <td>${tx.details}</td>
          <td>$${(tx.balanceAfter || 0).toFixed(2)}</td>
        `;
        container.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
  }
}

function showToast(message, type) {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
  
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });
}

function updateLastActive(uid) {
  database.ref(`users/${uid}/lastActive`).set(Date.now());
  setInterval(() => {
    database.ref(`users/${uid}/lastActive`).set(Date.now());
  }, 60000);
}

// ==================== EXPORTS ====================

window.firebaseUtils = {
  purchasePackage,
  logout: () => auth.signOut(),
  getCurrentUser: () => currentUser,
  getUserData: () => userData
};

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Package purchase buttons
  document.querySelectorAll('[data-package]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const amount = parseFloat(btn.getAttribute('data-package'));
      if (!isNaN(amount)) {
        purchasePackage(amount);
      }
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      auth.signOut().catch(error => {
        console.error("Logout error:", error);
        showToast("Error logging out. Please try again.", "error");
      });
    });
  }
});
