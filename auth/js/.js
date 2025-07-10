// auth.js - Enhanced Authentication Module
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { ref, set, get, update } from "firebase/database";

// Constants
const ADMIN_USER_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";

// Track authentication state with enhanced user initialization
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const uid = user.uid;
      await initializeUserData(uid, user);
      console.log("User authentication successful");
      
      // Update last active timestamp
      updateLastActive(uid);
      
    } catch (error) {
      console.error("Authentication error:", error);
      // Handle error appropriately (e.g., show message to user)
    }
  } else {
    console.log("User signed out");
    // Handle signed-out state if needed
  }
});

/**
 * Initialize or update user data in Firebase
 * @param {string} uid - User ID
 * @param {object} user - Firebase user object
 */
async function initializeUserData(uid, user) {
  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);
  
  // Check if user exists in database
  if (!snapshot.exists()) {
    // Get referral code from URL if exists
    const urlParams = new URLSearchParams(window.location.search);
    const referralId = urlParams.get('ref');
    
    const userData = {
      name: user.displayName || "User",
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      balance: 0,
      tradingProfit: 0,
      referralEarnings: 0,
      teamEarnings: 0,
      referredBy: referralId || null,
      transactions: {},
      investments: {},
      directReferrals: {},
      lastActive: Date.now(),
      accountStatus: "active",
      kycVerified: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    await set(userRef, userData);
    
    // Update referrer's direct referrals if applicable
    if (referralId) {
      await updateReferralCount(referralId, uid);
    }
  } else {
    // Update existing user's last login
    await update(userRef, {
      lastLogin: new Date().toISOString()
    });
  }
}

/**
 * Update referrer's direct referrals count
 * @param {string} referrerId - Referrer's user ID
 * @param {string} newUserId - Newly registered user ID
 */
async function updateReferralCount(referrerId, newUserId) {
  try {
    const updates = {};
    updates[`users/${referrerId}/directReferrals/${newUserId}`] = true;
    updates[`users/${referrerId}/referralsCount`] = firebase.database.ServerValue.increment(1);
    
    await update(ref(db), updates);
    console.log("Referral count updated successfully");
  } catch (error) {
    console.error("Error updating referral count:", error);
  }
}

/**
 * Update user's last active timestamp
 * @param {string} uid - User ID
 */
function updateLastActive(uid) {
  // Update immediately
  update(ref(db, `users/${uid}`), {
    lastActive: Date.now()
  });
  
  // Update every minute while user is active
  const interval = setInterval(() => {
    if (auth.currentUser?.uid === uid) {
      update(ref(db, `users/${uid}`), {
        lastActive: Date.now()
      });
    } else {
      clearInterval(interval);
    }
  }, 60000);
}

// Export authentication functions if needed
export const authFunctions = {
  initializeUserData,
  updateLastActive
};
