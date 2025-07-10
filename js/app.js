// ✅ Enhanced app.js — Improved Referral System, Secure Transactions, and Better Data Handling

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

const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const functions = firebase.functions(); // Initialize Cloud Functions

let currentUser = null;
let userData = null;

// Enhanced Auth check with error handling
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    initializeUserData(user.uid);
  } else {
    window.location.href = "login.html";
  }
});

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
        referredBy: null,
        transactions: {},
        investments: {},
        directReferrals: {},
        lastActive: Date.now(),
        accountStatus: "active",
        kycVerified: false
      };
      
      await database.ref("users/" + uid).set(defaultUserData);
      userData = defaultUserData;
    }
    
    loadUserData(uid);
    updateLastActive(uid); // Track user activity
    
  } catch (error) {
    console.error("Error initializing user data:", error);
    alert("Error loading user data. Please refresh the page.");
  }
}

function updateLastActive(uid) {
  // Update last active time every minute
  database.ref("users/" + uid + "/lastActive").set(Date.now());
  setInterval(() => {
    database.ref("users/" + uid + "/lastActive").set(Date.now());
  }, 60000);
}

async function purchasePackage(amount) {
  if (!currentUser || !userData) {
    return alert("Please wait, user data is loading...");
  }

  // Validate amount
  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    return alert("Invalid package amount");
  }

  // Check account status
  if (userData.accountStatus !== "active") {
    return alert("Your account is not active for transactions");
  }

  const uid = currentUser.uid;
  const currentBalance = parseFloat(userData.balance || 0);
  
  if (amount > currentBalance) {
    return alert("Insufficient balance");
  }

  // Show confirmation
  if (!confirm(`Confirm purchase of $${amount.toFixed(2)} package?`)) {
    return;
  }

  try {
    // Create transaction data
    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    const packageId = database.ref().child("investments").push().key;
    const txId = database.ref().child("transactions").push().key;

    // Calculate all commissions and distributions
    const adminCommission = amount * 0.10;
    const directReferral = amount * 0.10;
    const uplineCommission = amount * 0.10; // 2% × 5 levels
    const tradingPool = amount * 0.70;
    const userProfit = amount * 0.10;

    // Prepare all updates in a single object
    const updates = {};

    // User balance and profit updates
    updates[`users/${uid}/balance`] = currentBalance - amount + userProfit;
    updates[`users/${uid}/tradingProfit`] = (userData.tradingProfit || 0) + userProfit;

    // Investment record
    updates[`users/${uid}/investments/${packageId}`] = {
      amount,
      status: "active",
      purchaseDate: timestamp,
      expectedReturn: amount * 2,
      maturityDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      profitEarned: 0,
      lastProfitDate: null
    };

    // Transaction records
    updates[`transactions/${txId}`] = {
      userId: uid,
      type: "investment",
      amount,
      status: "completed",
      timestamp,
      details: `Purchased package of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    updates[`users/${uid}/transactions/${txId}`] = {
      type: "investment",
      amount,
      status: "completed",
      timestamp,
      details: `Purchased package of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    // Admin Commission (10%)
    updates[`users/${ADMIN_USER_ID}/balance`] = firebase.database.ServerValue.increment(adminCommission);
    updates[`users/${ADMIN_USER_ID}/adminEarnings`] = firebase.database.ServerValue.increment(adminCommission);
    
    // Admin transaction record
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

    // Trading Pool (70%)
    updates[`system/tradingPool`] = firebase.database.ServerValue.increment(tradingPool);
    updates[`system/poolTransactions/${txId}`] = {
      userId: uid,
      amount: tradingPool,
      timestamp,
      details: `Contribution from ${uid} package purchase`
    };

    // Direct referral (10%)
    if (userData.referredBy) {
      await handleDirectReferral(userData.referredBy, uid, amount, directReferral, timestamp, updates);
    }

    // Upline commissions (5 level × 2%)
    if (userData.referredBy) {
      await distributeUplineCommissions(userData.referredBy, uid, amount, 1, timestamp, updates);
    }

    // Execute all updates atomically
    await database.ref().update(updates);
    
    // Refresh user data
    await loadUserData(uid);
    
    // Show success message with details
    alert(`✅ Package of $${amount.toFixed(2)} purchased successfully!\n\n` +
          `• $${userProfit.toFixed(2)} added to your balance\n` +
          `• $${tradingPool.toFixed(2)} added to trading pool\n` +
          `• Commissions distributed to your network`);
    
  } catch (error) {
    console.error("Package purchase error:", error);
    alert("Error processing package purchase. Please try again.");
  }
}

async function handleDirectReferral(referrerId, userId, packageAmount, commission, timestamp, updates) {
  try {
    const refSnapshot = await database.ref(`users/${referrerId}`).once("value");
    if (!refSnapshot.exists()) return;

    const refUser = refSnapshot.val();
    const currentRefBalance = parseFloat(refUser.balance || 0);
    
    // Update referrer's balance and earnings
    updates[`users/${referrerId}/referralEarnings`] = (refUser.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/balance`] = currentRefBalance + commission;
    updates[`users/${referrerId}/directReferrals/${userId}`] = firebase.database.ServerValue.increment(1);

    // Create transaction record for referrer
    const refTxId = database.ref().child("transactions").push().key;
    updates[`users/${referrerId}/transactions/${refTxId}`] = {
      type: "referral",
      amount: commission,
      status: "completed",
      timestamp,
      details: `Direct referral commission from ${userId}`,
      balanceBefore: currentRefBalance,
      balanceAfter: currentRefBalance + commission,
      packageAmount: packageAmount
    };

  } catch (error) {
    console.error("Direct referral error:", error);
    // Continue with purchase even if referral fails
  }
}

async function distributeUplineCommissions(uplineId, userId, packageAmount, currentLevel, timestamp, updates) {
  try {
    // Stop at level 5 or if no upline
    if (!uplineId || currentLevel > 5) return;

    const uplineSnapshot = await database.ref(`users/${uplineId}`).once("value");
    if (!uplineSnapshot.exists()) return;

    const uplineUser = uplineSnapshot.val();
    const currentUplineBalance = parseFloat(uplineUser.balance || 0);
    const commission = packageAmount * 0.02; // 2% per level

    // Update upline's balance and earnings
    updates[`users/${uplineId}/teamEarnings`] = (uplineUser.teamEarnings || 0) + commission;
    updates[`users/${uplineId}/balance`] = currentUplineBalance + commission;

    // Create transaction record for upline
    const uplineTxId = database.ref().child("transactions").push().key;
    updates[`users/${uplineId}/transactions/${uplineTxId}`] = {
      type: "team_commission",
      amount: commission,
      status: "completed",
      timestamp,
      details: `Level ${currentLevel} team commission from ${userId}`,
      balanceBefore: currentUplineBalance,
      balanceAfter: currentUplineBalance + commission,
      packageAmount: packageAmount,
      level: currentLevel
    };

    // Process next level if available
    if (uplineUser.referredBy) {
      await distributeUplineCommissions(uplineUser.referredBy, userId, packageAmount, currentLevel + 1, timestamp, updates);
    }

  } catch (error) {
    console.error("Upline commission error:", error);
    // Continue with purchase even if upline commission fails
  }
}

// Enhanced user data loading with error handling
async function loadUserData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    
    if (!userData) {
      console.error("User data not found");
      return;
    }

    // Update UI elements
    document.getElementById("userBalance").textContent = `$${(userData.balance || 0).toFixed(2)}`;
    document.getElementById("tradingProfit").textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
    document.getElementById("referralEarnings").textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;
    document.getElementById("teamEarnings").textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
    
    // Load transaction history
    await loadTransactionHistory(uid);
    
    // Update referral link if available
    if (document.getElementById("referralLink")) {
      document.getElementById("referralLink").value = 
        `${window.location.origin}/register.html?ref=${uid}`;
    }

  } catch (error) {
    console.error("Error loading user data:", error);
    alert("Error loading data. Please refresh the page.");
  }
}

// Enhanced transaction history with pagination
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

// Initialize package purchase buttons
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-package]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const amount = parseFloat(btn.getAttribute("data-package"));
      if (!isNaN(amount) {
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
