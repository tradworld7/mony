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

const ADMIN_USER_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const functions = firebase.functions();

let currentUser = null;
let userData = null;

// Auth state listener
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    initializeUserData(user.uid);
  } else {
    window.location.href = "login.html";
  }
});

// Initialize user data
async function initializeUserData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    
    if (!userData) {
      const defaultUserData = {
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
        kycVerified: false
      };
      
      await database.ref("users/" + uid).set(defaultUserData);
      userData = defaultUserData;
    }
    
    loadUserData(uid);
    updateLastActive(uid);
    
  } catch (error) {
    console.error("Error initializing user data:", error);
    showToast("Error loading user data. Please refresh the page.", "error");
  }
}

// Update last active time
function updateLastActive(uid) {
  database.ref("users/" + uid + "/lastActive").set(Date.now());
  setInterval(() => {
    database.ref("users/" + uid + "/lastActive").set(Date.now());
  }, 60000);
}

// Purchase package function with updated commission structure
async function purchasePackage(amount) {
  if (!currentUser || !userData) {
    return showToast("Please wait, user data is loading...", "error");
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    return showToast("Invalid package amount", "error");
  }

  if (userData.accountStatus !== "active") {
    return showToast("Your account is not active for transactions", "error");
  }

  const uid = currentUser.uid;
  const currentBalance = parseFloat(userData.balance || 0);
  
  if (amount > currentBalance) {
    return showToast("Insufficient balance", "error");
  }

  try {
    const updates = {};
    const timestamp = Date.now();
    const packageId = database.ref().child("investments").push().key;
    const txId = database.ref().child("transactions").push().key;

    // Updated Commission Structure
    const directReferralCommission = amount * 0.10; // 10% for direct referral
    const adminCommission = amount * 0.10;         // 10% for admin
    const level2Commission = amount * 0.02;       // 2% for level 2
    const level3Commission = amount * 0.02;       // 2% for level 3
    const level4Commission = amount * 0.02;       // 2% for level 4
    const level5Commission = amount * 0.02;       // 2% for level 5
    const tradingPool = amount * 0.70;            // 70% for trading pool
    const userProfit = amount * 0.02;             // 2% remaining as user profit

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

    // Referral commissions - updated structure
    if (userData.referredBy) {
      await handleReferralCommissions(userData.referredBy, uid, amount, timestamp, updates);
    }

    // Execute all updates
    await database.ref().update(updates);
    
    // Refresh data
    await loadUserData(uid);
    await loadTeamStructure(uid);
    
    showToast(`✅ Package of $${amount.toFixed(2)} purchased successfully!`, "success");
    
  } catch (error) {
    console.error("Package purchase error:", error);
    showToast("Error processing package purchase. Please try again.", "error");
  }
}

// Distribute trading pool to active users
async function distributeTradingPool(amount, timestamp, updates) {
  try {
    // Get all active users
    const activeUsersSnapshot = await database.ref("users")
      .orderByChild("accountStatus")
      .equalTo("active")
      .once("value");
    
    const activeUsers = activeUsersSnapshot.val() || {};
    const activeUserIds = Object.keys(activeUsers);
    
    if (activeUserIds.length === 0) return;
    
    const sharePerUser = amount / activeUserIds.length;
    
    // Distribute equal shares to all active users
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

// Updated referral commission handler
async function handleReferralCommissions(referrerId, userId, packageAmount, timestamp, updates) {
  try {
    let currentUpline = referrerId;
    const commissionRates = [0.10, 0.02, 0.02, 0.02, 0.02]; // 10% for level 1, 2% for levels 2-5
    
    for (let level = 0; level < 5 && currentUpline; level++) {
      const commission = packageAmount * commissionRates[level];
      const uplineTxId = database.ref().child("transactions").push().key;
      
      // Update upline balance
      updates[`users/${currentUpline}/balance`] = firebase.database.ServerValue.increment(commission);
      
      // Update earnings based on level
      if (level === 0) {
        updates[`users/${currentUpline}/referralEarnings`] = firebase.database.ServerValue.increment(commission);
      } else {
        updates[`users/${currentUpline}/teamEarnings`] = firebase.database.ServerValue.increment(commission);
      }
      
      // Create transaction record
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
      
      // Get next upline
      const uplineSnapshot = await database.ref(`users/${currentUpline}/referredBy`).once("value");
      currentUpline = uplineSnapshot.val();
    }
    
  } catch (error) {
    console.error("Referral commission error:", error);
  }
}

// Load user data
async function loadUserData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    
    if (!userData) {
      console.error("User data not found");
      return;
    }

    // Update UI
    document.getElementById("userBalance").textContent = `$${(userData.balance || 0).toFixed(2)}`;
    document.getElementById("tradingProfit").textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
    document.getElementById("referralEarnings").textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;
    document.getElementById("teamEarnings").textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
    document.getElementById("tradingPoolEarnings").textContent = `$${(userData.tradingPoolEarnings || 0).toFixed(2)}`;
    
    // Load transaction history
    await loadTransactionHistory(uid);
    
    // Update referral link
    if (document.getElementById("referralLink")) {
      document.getElementById("referralLink").value = 
        `${window.location.origin}/register.html?ref=${uid}`;
    }

  } catch (error) {
    console.error("Error loading user data:", error);
    showToast("Error loading data. Please refresh the page.", "error");
  }
}

// Load team structure
async function loadTeamStructure(uid) {
  try {
    // Load direct referrals
    const directRefsSnapshot = await database.ref(`users/${uid}/directReferrals`).once("value");
    const directRefs = directRefsSnapshot.val() || {};
    
    document.getElementById("level1Members").innerHTML = 
      Object.keys(directRefs).length > 0 
        ? Object.keys(directRefs).map(id => `<div class="team-member">${id}</div>`).join("")
        : '<div class="text-muted">No direct referrals</div>';
    
    // Load team counts and earnings for all levels
    for (let level = 1; level <= 5; level++) {
      const earnings = await calculateLevelEarnings(uid, level);
      document.getElementById(`level${level}Earnings`).textContent = earnings.toFixed(2);
      
      if (level > 1) {
        const count = await getLevelCount(uid, level);
        document.getElementById(`level${level}Members`).innerHTML = 
          count > 0 
            ? `<div class="team-count">${count} members</div>`
            : '<div class="text-muted">No members</div>';
      }
    }
    
  } catch (error) {
    console.error("Error loading team structure:", error);
  }
}

// Calculate earnings for a specific level
async function calculateLevelEarnings(uid, level) {
  const snapshot = await database.ref(`users/${uid}/transactions`)
    .orderByChild("level")
    .equalTo(level)
    .once("value");
  
  const transactions = snapshot.val() || {};
  return Object.values(transactions).reduce((sum, tx) => sum + (tx.amount || 0), 0);
}

// Get member count for a level
async function getLevelCount(uid, level) {
  const snapshot = await database.ref(`users/${uid}/teamStructure/level${level}Count`).once("value");
  return snapshot.val() || 0;
}

// Load transaction history
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
    } else {
      container.innerHTML = `<tr><td colspan="6" class="text-center">No transactions found</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    const container = document.getElementById("transactionHistory");
    if (container) {
      container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading transactions</td></tr>`;
    }
  }
}

// Show toast notification
function showToast(message, type) {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.remove();
  }, 5000);
  
  // Close button
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });
}

// Initialize package purchase buttons
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-package]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const amount = parseFloat(btn.getAttribute("data-package"));
      if (!isNaN(amount)) {
        purchasePackage(amount);
      }
    });
  });

  // Add logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "login.html";
      });
    });
  }
});
