// Firebase configuration (Compatibility version for wider support)
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

// Constants
const ADMIN_USER_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";
const COMMISSION_STRUCTURE = {
  directReferral: 0.10,    // 10% for direct referral (level 1)
  admin: 0.30,             // 30% for admin
  level2: 0.02,            // 2% for level 2
  level3: 0.02,            // 2% for level 3
  level4: 0.02,            // 2% for level 4
  level5: 0.02,            // 2% for level 5
  tradingPool: 0.50,       // 70% for trading pool
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
        initPackagePurchaseButtons(); // Initialize package purchase buttons
      })
      .catch(error => {
        console.error("User data initialization failed:", error);
        showToast("Error loading user data. Please try again.", "error");
        auth.signOut();
      });
  } else {
    currentUser = null;
    userData = null;
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('signup.html')) {
      window.location.href = 'login.html';
    }
  }
}

async function initializeUserData(uid) {
  try {
    const userRef = database.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      // Check for referral from URL
      const urlParams = new URLSearchParams(window.location.search);
      const referralId = urlParams.get('ref');
      
      const defaultData = {
        name: currentUser.displayName || "User",
        email: currentUser.email,
        balance: 0,
        tradingProfit: 0,
        referralEarnings: 0,
        teamEarnings: 0,
        tradingPoolEarnings: 0,
        referredBy: referralId || null,
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
      
      // Update referrer's team if applicable
      if (referralId) {
        await updateReferralTeam(referralId, uid);
      }
    } else {
      userData = snapshot.val();
    }
  } catch (error) {
    console.error("Error initializing user data:", error);
    throw error;
  }
}

async function updateReferralTeam(referrerId, newUserId) {
  try {
    const updates = {};
    
    // Add to direct referrals
    updates[`users/${referrerId}/directReferrals/${newUserId}`] = true;
    updates[`users/${referrerId}/teamStructure/level1Count`] = firebase.database.ServerValue.increment(1);
    
    // Get referrer's upline
    const referrerSnap = await database.ref(`users/${referrerId}`).once('value');
    const referrerData = referrerSnap.val();
    
    // Update upline team counts
    if (referrerData.referredBy) {
      let currentUpline = referrerData.referredBy;
      for (let level = 2; level <= 5; level++) {
        if (!currentUpline) break;
        
        updates[`users/${currentUpline}/teamStructure/level${level}Count`] = 
          firebase.database.ServerValue.increment(1);
        
        const uplineSnap = await database.ref(`users/${currentUpline}`).once('value');
        currentUpline = uplineSnap.val().referredBy;
      }
    }
    
    await database.ref().update(updates);
  } catch (error) {
    console.error("Error updating referral team:", error);
  }
}

// ==================== PACKAGE PURCHASE FUNCTIONS ====================

function initPackagePurchaseButtons() {
  document.querySelectorAll('[data-package]').forEach(btn => {
    btn.addEventListener('click', async function() {
      const amount = parseFloat(this.getAttribute('data-package'));
      const originalText = this.innerHTML;
      
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      
      try {
        await purchasePackage(amount);
      } catch (error) {
        console.error("Purchase error:", error);
        showToast(error.message || "Purchase failed", "error");
      } finally {
        this.disabled = false;
        this.innerHTML = originalText;
      }
    });
  });
}

async function purchasePackage(amount) {
  if (!currentUser || !userData) {
    throw new Error("Please login to purchase packages");
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid package amount");
  }

  if (userData.accountStatus !== "active") {
    throw new Error("Your account is not active for transactions");
  }

  const uid = currentUser.uid;
  const currentBalance = parseFloat(userData.balance || 0);
  
  if (amount > currentBalance) {
    throw new Error("Insufficient balance");
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
      lastProfitDate: null,
      packageName: getPackageName(amount)
    };

    // Transaction records
    updates[`transactions/${txId}`] = {
      userId: uid,
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased ${getPackageName(amount)} package`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    updates[`users/${uid}/transactions/${txId}`] = {
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased ${getPackageName(amount)} package`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    // Admin commission
    updates[`users/${ADMIN_USER_ID}/balance`] = firebase.database.ServerValue.increment(adminCommission);
    
    const adminTxId = database.ref().child("transactions").push().key;
    updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
      type: "admin_commission",
      amount: adminCommission,
      status: "completed",
      timestamp,
      details: `Commission from user ${uid} package purchase`
    };

    // Trading pool
    updates[`system/tradingPool`] = firebase.database.ServerValue.increment(tradingPool);

    // Referral commissions
    if (userData.referredBy) {
      await handleReferralCommissions(userData.referredBy, uid, amount, timestamp, updates);
    }

    // Execute all updates
    await database.ref().update(updates);
    
    // Refresh user data
    await loadUserData(uid);
    
    showToast(`${getPackageName(amount)} purchased successfully!`, "success");
    
  } catch (error) {
    console.error("Package purchase error:", error);
    throw error;
  }
}

function getPackageName(amount) {
  switch(amount) {
    case 10: return "Starter Package";
    case 30: return "Standard Package";
    case 100: return "Premium Package";
    default: return "Custom Package";
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

async function loadUserData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    return userData;
  } catch (error) {
    console.error("Error loading user data:", error);
    throw error;
  }
}

async function loadUserDataToUI(uid) {
  try {
    const userData = await loadUserData(uid);
    if (!userData) return;

    // Update dashboard cards
    if (document.getElementById("userBalance")) {
      document.getElementById("userBalance").textContent = `$${(userData.balance || 0).toFixed(2)}`;
    }
    if (document.getElementById("tradingProfit")) {
      document.getElementById("tradingProfit").textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
    }
    if (document.getElementById("directReferrals")) {
      const refCount = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
      document.getElementById("directReferrals").textContent = refCount;
    }
    if (document.getElementById("referralProfit")) {
      document.getElementById("referralProfit").textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;
    }
    if (document.getElementById("teamEarnings")) {
      document.getElementById("teamEarnings").textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
    }

    // Load transaction history
    await loadTransactionHistory(uid);
    
  } catch (error) {
    console.error("Error loading user data to UI:", error);
    showToast("Error loading data. Please refresh the page.", "error");
  }
}

async function loadTransactionHistory(uid, limit = 5) {
  try {
    const snapshot = await database.ref(`users/${uid}/transactions`)
      .orderByChild("timestamp")
      .limitToLast(limit)
      .once("value");
    
    const container = document.getElementById("transactionHistory");
    if (!container) return;
    
    container.innerHTML = "";
    const transactions = snapshot.val();
    
    if (!transactions) {
      container.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No transactions yet</td></tr>`;
      return;
    }
    
    // Convert to array and sort by timestamp
    const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
    transactionsArray.sort((a, b) => b.timestamp - a.timestamp);
    
    // Display transactions
    transactionsArray.forEach(tx => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
        <td>${tx.type.replace(/_/g, ' ')}</td>
        <td>$${Math.abs(tx.amount).toFixed(2)}</td>
        <td><span class="badge status-${tx.status || 'completed'}">${tx.status || 'Completed'}</span></td>
        <td>${tx.details}</td>
      `;
      container.appendChild(row);
    });
    
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
    if (auth.currentUser?.uid === uid) {
      database.ref(`users/${uid}/lastActive`).set(Date.now());
    }
  }, 60000);
}

// ==================== EXPORTS ====================

window.firebaseApp = {
  auth,
  database,
  currentUser: () => currentUser,
  userData: () => userData,
  purchasePackage,
  logout: () => auth.signOut(),
  initializeUser: (name, email, password, referralId) => {
    return auth.createUserWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        await userCredential.user.updateProfile({ displayName: name });
        await initializeUserData(userCredential.user.uid);
        return userCredential.user;
      });
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize sidebar toggle
  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
  
  // Initialize logout button if exists
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      auth.signOut().then(() => {
        window.location.href = 'login.html';
      });
    });
  }
  
  // Check for referral in URL
  const urlParams = new URLSearchParams(window.location.search);
  const refId = urlParams.get('ref');
  if (refId && document.getElementById('sponsorId')) {
    document.getElementById('sponsorId').value = refId;
  }
});
