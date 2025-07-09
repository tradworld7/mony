// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBshAGZScyo7PJegLHMzORbkkrCLGD6U5s",
    authDomain: "mywebsite-600d3.firebaseapp.com",
    databaseURL: "https://mywebsite-600d3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mywebsite-600d3",
    storageBucket: "mywebsite-600d3.appspot.com",
    messagingSenderId: "584485288598",
    appId: "1:584485288598:web:01856eaa18ba5ada49e0b7",
    measurementId: "G-GQ9J9QH42J"
};

const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let currentUser = null;
let userData = null;

// Auth State Check
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

// Load user data from Firebase
function loadUserData(uid) {
    database.ref('users/' + uid).on('value', snapshot => {
        userData = snapshot.val();
        updateUI(userData);
    });
}

function updateUI(data) {
    if (!data) return;
    document.getElementById('userBalance').textContent = `$${(data.balance || 0).toFixed(2)}`;
    document.getElementById('tradingProfit').textContent = `$${(data.tradingProfit || 0).toFixed(2)}`;
    document.getElementById('directReferrals').textContent = Object.keys(data.directReferrals || {}).length;
    document.getElementById('teamEarnings').textContent = `$${(data.teamEarnings || 0).toFixed(2)}`;
}
// Purchase Investment Package
async function purchasePackage(amount) {
    if (!currentUser || !userData) return;

    const balance = parseFloat(userData.balance || 0);
    if (amount > balance) return showToast('Insufficient balance', 'error');

    const updates = {};
    const timestamp = Date.now();
    const investmentId = database.ref().child('investments').push().key;

    const adminCommission = amount * 0.10;
    const userProfit = amount * 0.10;
    const referralPool = amount * 0.10;
    const tradingPool = amount * 0.70;

    // Update User
    updates[`users/${currentUser.uid}/balance`] = balance - amount + userProfit;
    updates[`users/${currentUser.uid}/tradingProfit`] = (userData.tradingProfit || 0) + userProfit;

    // Record Investment
    updates[`users/${currentUser.uid}/investments/${investmentId}`] = {
        amount,
        purchaseDate: timestamp,
        expectedReturn: amount * 2,
        status: "active",
        maturityDate: timestamp + (30 * 24 * 60 * 60 * 1000)
    };

    updates[`users/${currentUser.uid}/transactions/${investmentId}`] = {
        type: "investment",
        amount,
        status: "completed",
        timestamp,
        details: `Purchased package of $${amount}`
    };

    const profitTxId = database.ref().child('transactions').push().key;
    updates[`users/${currentUser.uid}/transactions/${profitTxId}`] = {
        type: "profit",
        amount: userProfit,
        status: "completed",
        timestamp,
        details: `Immediate profit from $${amount} package`
    };

    // Admin
    const adminSnap = await database.ref(`users/${ADMIN_USER_ID}`).once('value');
    const admin = adminSnap.val() || {};
    updates[`users/${ADMIN_USER_ID}/balance`] = (admin.balance || 0) + adminCommission;
    updates[`users/${ADMIN_USER_ID}/tradingProfit`] = (admin.tradingProfit || 0) + adminCommission;

    const adminTxId = database.ref().child('transactions').push().key;
    updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
        type: "admin_commission",
        amount: adminCommission,
        status: "completed",
        timestamp,
        details: `Commission from ${currentUser.email}`
    };

    // Admin Earnings
    const sysAdminSnap = await database.ref('system/adminEarnings').once('value');
    updates[`system/adminEarnings`] = (sysAdminSnap.val() || 0) + adminCommission;

    // Referral Commissions
    if (userData.referredBy) {
        await distributeReferral(userData.referredBy, amount, 1, updates);
    }

    // Trading Pool
    const poolSnap = await database.ref('system/tradingPool').once('value');
    updates[`system/tradingPool`] = (poolSnap.val() || 0) + tradingPool;

    await database.ref().update(updates);
    await distributeTradingProfit(tradingPool);

    showToast(`Package of $${amount} purchased successfully!`, "success");
    loadUserData(currentUser.uid);
}
// Distribute 2% referral commission up to 5 levels
async function distributeReferral(referrerId, amount, level, updates) {
    if (level > 5) return;

    const snapshot = await database.ref(`users/${referrerId}`).once('value');
    const referrer = snapshot.val();
    if (!referrer) return;

    const commission = amount * 0.02;

    updates[`users/${referrerId}/referralEarnings`] = (referrer.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrer.teamEarnings || 0) + commission;

    // Track earnings per level
    const levelPath = `referralEarningsByLevel/level${level}`;
    updates[`users/${referrerId}/${levelPath}`] = (referrer.referralEarningsByLevel?.[`level${level}`] || 0) + commission;

    // Save transaction
    const txId = database.ref().child('transactions').push().key;
    updates[`users/${referrerId}/transactions/${txId}`] = {
        type: 'referral',
        amount: commission,
        status: 'completed',
        timestamp: Date.now(),
        details: `Level ${level} referral commission from ${currentUser.email}`
    };

    if (referrer.referredBy) {
        await distributeReferral(referrer.referredBy, amount, level + 1, updates);
    }
}

// Distribute trading profit to all active users
async function distributeTradingProfit(totalProfit) {
    const snapshot = await database.ref('users').once('value');
    const users = snapshot.val();
    if (!users) return;

    const now = Date.now();
    const activeUsers = Object.entries(users).filter(([uid, data]) => {
        return data.lastActive && (now - data.lastActive) <= (30 * 24 * 60 * 60 * 1000);
    });

    if (activeUsers.length === 0) return;

    const perUser = totalProfit / activeUsers.length;
    const updates = {};

    activeUsers.forEach(([uid, data]) => {
        updates[`users/${uid}/tradingProfit`] = (data.tradingProfit || 0) + perUser;

        const txId = database.ref().child('transactions').push().key;
        updates[`users/${uid}/transactions/${txId}`] = {
            type: "profit",
            amount: perUser,
            status: "completed",
            timestamp: Date.now(),
            details: "Trading profit share"
        };
    });

    updates['system/tradingPool'] = 0;
    await database.ref().update(updates);
}
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: sans-serif;
        font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
