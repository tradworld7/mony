// auth.js - Enhanced Authentication Module with Purchase Handling
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { ref, set, get, update, push } from "firebase/database";

// Constants
const ADMIN_USER_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";
const COMMISSION_RATES = {
  admin: 0.60,
  direct: 0.10,
  levels: [0.02, 0.02, 0.02, 0.02, 0.02],
  tradingPool: 0.20
};

// Track authentication state with enhanced user initialization
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const uid = user.uid;
      await initializeUserData(uid, user);
      console.log("User authentication successful");
      
      // Update last active timestamp
      updateLastActive(uid);
      
      // Initialize package purchase handlers
      initPackagePurchases();
      
    } catch (error) {
      console.error("Authentication error:", error);
      showToast("Authentication error. Please refresh the page.", "error");
    }
  } else {
    console.log("User signed out");
    // Handle signed-out state
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('signup.html')) {
      window.location.href = 'login.html';
    }
  }
});

/**
 * Initialize package purchase event listeners
 */
function initPackagePurchases() {
  document.querySelectorAll('[data-package]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseFloat(btn.getAttribute('data-package'));
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processing...';
      
      try {
        await processPackagePurchase(amount);
        showToast(`Successfully purchased $${amount} package`, 'success');
      } catch (error) {
        console.error('Purchase error:', error);
        showToast(error.message || 'Purchase failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy Now';
      }
    });
  });
}

/**
 * Process package purchase with commissions
 */
async function processPackagePurchase(amount) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please login first");
  
  const userRef = ref(db, `users/${user.uid}`);
  const userSnap = await get(userRef);
  const userData = userSnap.val();
  
  // Check balance
  if (userData.balance < amount) {
    throw new Error("Insufficient balance");
  }
  
  // Calculate commissions
  const adminCommission = amount * COMMISSION_RATES.admin;
  const directCommission = amount * COMMISSION_RATES.direct;
  const levelCommissions = COMMISSION_RATES.levels.map(rate => amount * rate);
  const tradingPool = amount * COMMISSION_RATES.tradingPool;
  
  // Prepare updates
  const updates = {};
  const invoiceId = push(ref(db, 'invoices')).key;
  const timestamp = Date.now();
  
  // 1. Deduct from user balance
  updates[`users/${user.uid}/balance`] = userData.balance - amount;
  
  // 2. Add investment record
  updates[`users/${user.uid}/investments/${invoiceId}`] = {
    amount,
    purchaseDate: new Date().toISOString(),
    expectedReturn: amount * 2,
    maturityDate: new Date(timestamp + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  };
  
  // 3. Add transaction record
  updates[`users/${user.uid}/transactions/${timestamp}`] = {
    type: "investment",
    amount,
    status: "completed",
    timestamp,
    details: `Purchased $${amount} package`
  };
  
  // 4. Admin commission
  updates[`users/${ADMIN_USER_ID}/tradingProfit`] = (await get(ref(db, `users/${ADMIN_USER_ID}/tradingProfit`))).val() + adminCommission;
  
  // 5. Process referral commissions if applicable
  if (userData.referredBy) {
    await processReferralCommissions(userData.referredBy, amount, updates);
  }
  
  // 6. Distribute to trading pool
  await distributeTradingProfit(tradingPool, updates);
  
  // Execute all updates
  await update(ref(db), updates);
}

/**
 * Process multi-level referral commissions
 */
async function processReferralCommissions(referrerId, amount, updates, level = 1) {
  if (level > 5) return;
  
  const commission = amount * COMMISSION_RATES.levels[level - 1];
  if (commission <= 0) return;
  
  const referrerRef = ref(db, `users/${referrerId}`);
  const referrerSnap = await get(referrerRef);
  if (!referrerSnap.exists()) return;
  
  const referrerData = referrerSnap.val();
  
  // Update earnings
  updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
  if (level === 1) {
    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
  }
  
  // Add transaction record
  const txId = push(ref(db, 'transactions')).key;
  updates[`users/${referrerId}/transactions/${txId}`] = {
    type: level === 1 ? "referral" : "team",
    amount: commission,
    status: "completed",
    timestamp: Date.now(),
    details: `Level ${level} commission from package purchase`
  };
  
  // Process upline if exists
  if (referrerData.referredBy && level < 5) {
    await processReferralCommissions(referrerData.referredBy, amount, updates, level + 1);
  }
}

/**
 * Distribute trading profit to all investors
 */
async function distributeTradingProfit(amount, updates) {
  const usersSnap = await get(ref(db, 'users'));
  if (!usersSnap.exists()) return;
  
  const users = usersSnap.val();
  const investors = [];
  let totalInvestment = 0;
  
  // Calculate total investment pool
  Object.entries(users).forEach(([uid, user]) => {
    if (user.totalInvestment > 0) {
      investors.push({ uid, investment: user.totalInvestment });
      totalInvestment += user.totalInvestment;
    }
  });
  
  if (totalInvestment === 0) return;
  
  // Distribute proportionally
  investors.forEach(({ uid, investment }) => {
    const share = (investment / totalInvestment) * amount;
    if (share > 0) {
      updates[`users/${uid}/tradingProfit`] = (users[uid].tradingProfit || 0) + share;
      
      const txId = push(ref(db, 'transactions')).key;
      updates[`users/${uid}/transactions/${txId}`] = {
        type: "profit",
        amount: share,
        status: "completed",
        timestamp: Date.now(),
        details: "Trading profit distribution"
      };
    }
  });
}

// Rest of your existing auth functions (initializeUserData, updateReferralCount, updateLastActive)
// ... (keep them exactly as you have them)

export const authFunctions = {
  initializeUserData,
  updateLastActive,
  processPackagePurchase
};
