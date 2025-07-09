// Import necessary Firebase functions
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, push, serverTimestamp, get, onValue, set } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

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

// Function to handle user signup and save all data to Firebase
async function signUpUser(email, password, referralCode = null) {
    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Prepare user data object
        const userData = {
            email: email,
            balance: 0,
            tradingProfit: 0,
            referralEarnings: 0,
            teamEarnings: 0,
            investments: {},
            transactions: {},
            joinDate: serverTimestamp(),
            lastLogin: serverTimestamp(),
            status: 'active'
        };
        
        // If referral code exists, set the referredBy field
        if (referralCode) {
            userData.referredBy = referralCode;
        }
        
        // Save user data to database
        await set(ref(database, `users/${user.uid}`), userData);
        
        // If this user was referred, update referrer's downline count
        if (referralCode) {
            const referrerRef = ref(database, `users/${referralCode}`);
            const referrerSnapshot = await get(referrerRef);
            
            if (referrerSnapshot.exists()) {
                const updates = {};
                updates[`users/${referralCode}/directReferrals/${user.uid}`] = true;
                updates[`users/${referralCode}/totalReferrals`] = (referrerSnapshot.val().totalReferrals || 0) + 1;
                
                await update(ref(database), updates);
            }
        }
        
        return { success: true, userId: user.uid };
    } catch (error) {
        console.error("Signup error:", error);
        return { success: false, error: error.message };
    }
}

// Purchase investment package (updated with complete data saving)
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
        const referralCommissions = amount * 0.10; // 10% to referral chain (2% per level x 5 levels)
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
            maturityDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
            profitReceived: userProfit,
            profitPending: amount * 2 - userProfit
        };
        
        // Add transaction records
        updates[`transactions/${packageId}`] = {
            userId: currentUser.uid,
            type: 'investment',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            packageId: packageId
        };
        
        updates[`users/${currentUser.uid}/transactions/${packageId}`] = {
            type: 'investment',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            details: `Purchased $${amount} package`,
            packageId: packageId
        };
        
        // Add profit transaction
        const profitTxId = push(ref(database, 'transactions')).key;
        updates[`transactions/${profitTxId}`] = {
            userId: currentUser.uid,
            type: 'profit',
            amount: userProfit,
            status: 'completed',
            timestamp: timestamp,
            packageId: packageId,
            source: 'immediate_profit'
        };
        
        updates[`users/${currentUser.uid}/transactions/${profitTxId}`] = {
            type: 'profit',
            amount: userProfit,
            status: 'completed',
            timestamp: timestamp,
            details: `Immediate profit from $${amount} package`,
            packageId: packageId
        };
        
        // Save trading profit to trading pool
        const tradingPoolRef = ref(database, 'system/tradingPool');
        const tradingPoolSnapshot = await get(tradingPoolRef);
        const currentPool = parseFloat(tradingPoolSnapshot.val()) || 0;
        updates[`system/tradingPool`] = currentPool + tradingProfit;
        
        // Add trading profit allocation record
        updates[`tradingProfits/${packageId}`] = {
            userId: currentUser.uid,
            amount: tradingProfit,
            timestamp: timestamp,
            packageId: packageId,
            status: 'allocated'
        };
        
        // Distribute commissions to referral chain (5 levels)
        if (userData.referredBy) {
            await distributeReferralCommissions(userData.referredBy, amount, 1, updates, packageId);
        }
        
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
            packageId: packageId,
            sourceUserId: currentUser.uid
        };
        
        updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
            type: 'commission',
            amount: adminCommission,
            status: 'completed',
            timestamp: timestamp,
            details: `Commission from ${currentUser.email}'s package purchase`,
            packageId: packageId,
            sourceUserId: currentUser.uid
        };
        
        // Update system admin earnings
        const adminEarningsRef = ref(database, 'system/adminEarnings');
        const adminEarningsSnapshot = await get(adminEarningsRef);
        const currentAdminEarnings = parseFloat(adminEarningsSnapshot.val()) || 0;
        updates[`system/adminEarnings`] = currentAdminEarnings + adminCommission;
        
        // Execute all updates
        await update(ref(database), updates);
        
        showToast(`Successfully purchased $${amount} package. You received $${userProfit.toFixed(2)} immediate profit!`, 'success');
        loadUserData(currentUser.uid);
        loadTransactionHistory();
        
    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package', 'error');
    }
}

// Updated distributeReferralCommissions function with complete data tracking
async function distributeReferralCommissions(referrerId, amount, currentLevel, updates, packageId) {
    if (currentLevel > 5) return;
    
    // Get referrer data
    const referrerRef = ref(database, `users/${referrerId}`);
    const referrerSnapshot = await get(referrerRef);
    const referrerData = referrerSnapshot.val();
    
    if (!referrerData) return;
    
    // Calculate commission (2% per level)
    const commission = amount * 0.02;
    
    // Update referrer's balance and earnings
    const currentBalance = parseFloat(referrerData.balance || 0);
    const currentReferralEarnings = parseFloat(referrerData.referralEarnings || 0);
    const currentTeamEarnings = parseFloat(referrerData.teamEarnings || 0);
    
    updates[`users/${referrerId}/balance`] = currentBalance + commission;
    updates[`users/${referrerId}/referralEarnings`] = currentReferralEarnings + commission;
    updates[`users/${referrerId}/teamEarnings`] = currentTeamEarnings + commission;
    
    // Add transaction record for referrer
    const transactionId = push(ref(database, 'transactions')).key;
    updates[`transactions/${transactionId}`] = {
        userId: referrerId,
        type: 'referral_commission',
        amount: commission,
        status: 'completed',
        timestamp: serverTimestamp(),
        level: currentLevel,
        packageId: packageId,
        sourceUserId: currentUser.uid
    };
    
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
        type: 'referral',
        amount: commission,
        status: 'completed',
        timestamp: serverTimestamp(),
        level: currentLevel,
        details: `Level ${currentLevel} referral commission from ${currentUser.email}`,
        packageId: packageId,
        sourceUserId: currentUser.uid
    };
    
    // Save to referral commissions tracking
    updates[`referralCommissions/${transactionId}`] = {
        referrerId: referrerId,
        userId: currentUser.uid,
        amount: commission,
        level: currentLevel,
        timestamp: serverTimestamp(),
        packageId: packageId,
        packageAmount: amount
    };
    
    // Continue to next level if available
    if (referrerData.referredBy && currentLevel < 5) {
        await distributeReferralCommissions(referrerData.referredBy, amount, currentLevel + 1, updates, packageId);
    }
}

// Function to distribute trading profits to users
async function distributeTradingProfit(amount) {
    try {
        // Get all active investments
        const investmentsRef = ref(database, 'investments');
        const investmentsSnapshot = await get(investmentsRef);
        
        if (!investmentsSnapshot.exists()) return;
        
        const investments = investmentsSnapshot.val();
        const activeInvestments = Object.values(investments).filter(inv => inv.status === 'active');
        const totalActiveAmount = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        
        if (totalActiveAmount <= 0) return;
        
        const updates = {};
        const timestamp = serverTimestamp();
        
        // Distribute profit proportionally to all active investments
        for (const [investmentId, investment] of Object.entries(investments)) {
            if (investment.status !== 'active') continue;
            
            const userId = investment.userId;
            const userShare = (investment.amount / totalActiveAmount) * amount;
            
            // Get user data
            const userRef = ref(database, `users/${userId}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();
            
            if (!userData) continue;
            
            // Update user balance and trading profit
            updates[`users/${userId}/balance`] = (userData.balance || 0) + userShare;
            updates[`users/${userId}/tradingProfit`] = (userData.tradingProfit || 0) + userShare;
            
            // Add transaction record
            const transactionId = push(ref(database, 'transactions')).key;
            updates[`transactions/${transactionId}`] = {
                userId: userId,
                type: 'trading_profit',
                amount: userShare,
                status: 'completed',
                timestamp: timestamp,
                investmentId: investmentId
            };
            
            updates[`users/${userId}/transactions/${transactionId}`] = {
                type: 'profit',
                amount: userShare,
                status: 'completed',
                timestamp: timestamp,
                details: `Trading profit from investment ${investmentId}`,
                source: 'trading_pool'
            };
            
            // Update investment record
            updates[`investments/${investmentId}/profitReceived`] = (investment.profitReceived || 0) + userShare;
            updates[`investments/${investmentId}/profitPending`] = (investment.profitPending || 0) - userShare;
            
            // Check if investment has reached maturity
            if (investment.profitPending - userShare <= 0) {
                updates[`investments/${investmentId}/status`] = 'completed';
                updates[`investments/${investmentId}/completionDate`] = timestamp;
            }
        }
        
        // Update trading pool balance
        updates[`system/tradingPool`] = 0;
        
        // Execute all updates
        await update(ref(database), updates);
        
    } catch (error) {
        console.error('Trading profit distribution error:', error);
    }
}
