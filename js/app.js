// Import necessary Firebase functions
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, push, serverTimestamp, get, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";

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
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Admin configuration
const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";
const ADMIN_NAME = "Ramesh Kumar Verma";

// Purchase investment package (updated for Firebase v9+)
async function purchasePackage(amount) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const currentBalance = parseFloat(userData?.balance || 0);
    
    if (amount > currentBalance) {
        showToast('Insufficient balance for this package', 'error');
        return;
    }
    
    try {
        const updates = {};
        const timestamp = serverTimestamp();
        const packageId = push(ref(database, 'investments')).key;
        
        // Calculate profit distribution
        const adminCommission = amount * 0.10; // 10% to admin
        const referralCommissions = amount * 0.10; // 10% to referral chain
        const tradingProfit = amount * 0.70; // 70% to trading pool
        const userProfit = amount * 0.10; // 10% immediate profit to user
        
        // Update user balance (subtract investment, add immediate profit)
        updates[`users/${currentUser.uid}/balance`] = currentBalance - amount + userProfit;
        updates[`users/${currentUser.uid}/tradingProfit`] = (userData.tradingProfit || 0) + userProfit;
        
        // Add investment record
        updates[`users/${currentUser.uid}/investments/${packageId}`] = {
            amount: amount,
            purchaseDate: timestamp,
            status: 'active',
            expectedReturn: amount * 2,
            maturityDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days from now
        };
        
        // Add transaction records
        updates[`transactions/${packageId}`] = {
            userId: currentUser.uid,
            type: 'investment',
            amount: amount,
            status: 'completed',
            timestamp: timestamp
        };
        
        updates[`users/${currentUser.uid}/transactions/${packageId}`] = {
            type: 'investment',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            details: `Purchased $${amount} package`
        };
        
        // Add profit transaction
        const profitTxId = push(ref(database, 'transactions')).key;
        updates[`users/${currentUser.uid}/transactions/${profitTxId}`] = {
            type: 'profit',
            amount: userProfit,
            status: 'completed',
            timestamp: timestamp,
            details: `Immediate profit from $${amount} package`
        };
        
        // Distribute commissions to referral chain (5 levels)
        if (userData.referredBy) {
            await distributeReferralCommissions(userData.referredBy, amount, 1, updates);
        }
        
        // Add trading profit to pool
        const tradingPoolRef = ref(database, 'system/tradingPool');
        const tradingPoolSnapshot = await get(tradingPoolRef);
        const currentPool = parseFloat(tradingPoolSnapshot.val()) || 0;
        updates[`system/tradingPool`] = currentPool + tradingProfit;
        
        // Credit admin commission
        const adminRef = ref(database, `users/${ADMIN_USER_ID}`);
        const adminSnapshot = await get(adminRef);
        const adminData = adminSnapshot.val();
        const adminCurrentBalance = parseFloat(adminData?.balance || 0);
        const adminCurrentProfit = parseFloat(adminData?.tradingProfit || 0);
        
        updates[`users/${ADMIN_USER_ID}/balance`] = adminCurrentBalance + adminCommission;
        updates[`users/${ADMIN_USER_ID}/tradingProfit`] = adminCurrentProfit + adminCommission;
        
        // Add transaction record for admin
        const adminTxId = push(ref(database, 'transactions')).key;
        updates[`transactions/${adminTxId}`] = {
            userId: ADMIN_USER_ID,
            type: 'admin_commission',
            amount: adminCommission,
            status: 'completed',
            timestamp: timestamp,
            details: `Commission from ${currentUser.email}'s package purchase`
        };
        
        updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
            type: 'commission',
            amount: adminCommission,
            status: 'completed',
            timestamp: timestamp,
            details: `Commission from ${currentUser.email}'s package purchase`
        };
        
        // Update system admin earnings
        const adminEarningsRef = ref(database, 'system/adminEarnings');
        const adminEarningsSnapshot = await get(adminEarningsRef);
        const currentAdminEarnings = parseFloat(adminEarningsSnapshot.val()) || 0;
        updates[`system/adminEarnings`] = currentAdminEarnings + adminCommission;
        
        // Execute all updates
        await update(ref(database), updates);
        
        // Distribute trading profit
        await distributeTradingProfit(tradingProfit);
        
        showToast(`Successfully purchased $${amount} package. You received $${userProfit.toFixed(2)} immediate profit!`, 'success');
        loadUserData(currentUser.uid);
        loadTransactionHistory();
        
    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package', 'error');
    }
}

// Updated distributeReferralCommissions function for Firebase v9+
async function distributeReferralCommissions(referrerId, amount, currentLevel, updates) {
    if (currentLevel > 5) return;
    
    // Get referrer data
    const referrerRef = ref(database, `users/${referrerId}`);
    const referrerSnapshot = await get(referrerRef);
    const referrerData = referrerSnapshot.val();
    
    if (!referrerData) return;
    
    // Calculate commission (2% per level)
    const commission = amount * 0.02;
    
    // Update referrer's balance and earnings
    updates[`users/${referrerId}/balance`] = (referrerData.balance || 0) + commission;
    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
    
    // Add transaction record for referrer
    const transactionId = push(ref(database, 'transactions')).key;
    updates[`transactions/${transactionId}`] = {
        userId: referrerId,
        type: 'referral_commission',
        amount: commission,
        status: 'completed',
        timestamp: serverTimestamp(),
        details: `Level ${currentLevel} referral commission from ${currentUser.email}`
    };
    
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
        type: 'referral',
        amount: commission,
        status: 'completed',
        timestamp: serverTimestamp(),
        details: `Level ${currentLevel} referral commission from ${currentUser.email}`
    };
    
    // Continue to next level if available
    if (referrerData.referredBy && currentLevel < 5) {
        await distributeReferralCommissions(referrerData.referredBy, amount, currentLevel + 1, updates);
    }
}
