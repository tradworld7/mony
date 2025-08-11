// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    set, 
    update, 
    push, 
    get,
    child
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Admin details
const ADMIN_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";

// Fixed Commission Structure
const COMMISSION = {
    ADMIN: 60,        // 60% for admin
    DIRECT: 10,       // 10% for direct referral
    LEVELS: [2, 2, 2, 2, 2], // 2% each for 5 levels
    TRADING_POOL: 20  // 20% for trading profit pool
};

// Global Variables
let currentUser = null;
let userData = null;
let allUsersData = {};

// Load all users data
async function loadAllUsersData() {
    const snapshot = await get(ref(database, 'users'));
    if (snapshot.exists()) {
        allUsersData = snapshot.val();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Load all users data first
    loadAllUsersData().then(() => {
        // Check auth state
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                loadUserData(user.uid);
                
                // Hide auth modals if showing
                document.getElementById('loginModal').style.display = 'none';
                document.getElementById('signupModal').style.display = 'none';
                
                // Show main content
                document.getElementById('mainContent').style.display = 'block';
                
                // Update user avatar
                updateUserAvatar(user.email || 'User');
                
                // Check for referral parameter in URL
                checkReferralFromURL();
            } else {
                // Show login modal if not on auth pages
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('signup.html')) {
                    showLoginModal();
                }
            }
        });
    });
    
    // Setup package purchase buttons
    document.querySelectorAll('[data-package]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const amount = parseFloat(btn.getAttribute('data-package'));
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processing...';
            await processPackagePurchase(amount);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy Now';
        });
    });
    
    // Setup transfer button
    document.getElementById('submitTransfer').addEventListener('click', async () => {
        const btn = document.getElementById('submitTransfer');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Processing...';
        await transferFunds();
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Transfer Now';
    });
    
    // Setup logout
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });
    
    // Setup auth modal toggles
    document.getElementById('showSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('signupModal').style.display = 'flex';
    });
    
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupModal').style.display = 'none';
        document.getElementById('loginModal').style.display = 'flex';
    });
    
    // Setup login form
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        const loginBtn = document.getElementById('loginBtn');
        const loginBtnText = document.getElementById('loginBtnText');
        const loginSpinner = document.getElementById('loginSpinner');
        
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Logging in...';
        loginSpinner.style.display = 'inline-block';
        
        await loginUser(email, password);
        
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Login';
        loginSpinner.style.display = 'none';
    });
    
    // Setup signup form
    document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const referralId = document.getElementById('signupReferral').value;
        
        const signupBtn = document.getElementById('signupBtn');
        const signupBtnText = document.getElementById('signupBtnText');
        const signupSpinner = document.getElementById('signupSpinner');
        
        signupBtn.disabled = true;
        signupBtnText.textContent = 'Creating account...';
        signupSpinner.style.display = 'inline-block';
        
        await signupUser(name, email, password, referralId);
        
        signupBtn.disabled = false;
        signupBtnText.textContent = 'Sign Up';
        signupSpinner.style.display = 'none';
    });
});

// Check for referral parameter in URL
function checkReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId && currentUser) {
        // Save the referral if it's not already set
        if (!userData.referredBy) {
            update(ref(database, `users/${currentUser.uid}`), {
                referredBy: refId
            });
            
            // Update referrer's team structure
            updateReferrerTeamStructure(refId, currentUser.uid);
        }
    }
}

// Update user avatar with initials
function updateUserAvatar(email) {
    const avatar = document.getElementById('userAvatar');
    if (!avatar) return;
    
    // Extract initials from email or name
    let initials = 'U';
    if (email) {
        const namePart = email.split('@')[0];
        if (namePart.includes('.')) {
            initials = namePart.split('.').map(n => n[0]).join('').toUpperCase();
        } else {
            initials = namePart.substring(0, 2).toUpperCase();
        }
    }
    
    avatar.textContent = initials;
}

// Show login modal
function showLoginModal() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('signupModal').style.display = 'none';
}

// Login user
async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // User logged in
        showToast('Login successful!', 'success');
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        return true;
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}

// Signup new user
async function signupUser(name, email, password, referralId) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const userRef = ref(database, 'users/' + user.uid);
        const userData = {
            uid: user.uid,
            name: name,
            email: email,
            balance: 0,
            tradingProfit: 0,
            referralEarnings: 0,
            teamEarnings: 0,
            totalInvestment: 0,
            createdAt: Date.now(),
            lastActive: Date.now(),
            teamStructure: {
                level1: 0,
                level2: 0,
                level3: 0,
                level4: 0,
                level5: 0
            },
            deposits: {},
            withdrawals: {},
            investments: {},
            invoices: {},
            transactions: {},
            directReferrals: {}
        };
        
        // Add referral data if provided
        if (referralId) {
            userData.referredBy = referralId;
        }
        
        await set(userRef, userData);
        showToast('Account created successfully!', 'success');
        
        // If referral ID was provided, update referrer's team structure
        if (referralId) {
            await updateReferrerTeamStructure(referralId, user.uid);
        }
        
        document.getElementById('signupModal').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        return true;
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}

// Update referrer's team structure when new user signs up
async function updateReferrerTeamStructure(referrerId, newUserId) {
    try {
        const updates = {};
        
        // Get referrer data
        const referrerSnapshot = await get(ref(database, `users/${referrerId}`));
        if (!referrerSnapshot.exists()) return;
        
        const referrerData = referrerSnapshot.val();
        
        // Add new user to referrer's direct referrals
        updates[`users/${referrerId}/directReferrals/${newUserId}`] = {
            userId: newUserId,
            joinedAt: Date.now()
        };
        
        // Update team structure counts
        updates[`users/${referrerId}/teamStructure/level1`] = (referrerData.teamStructure?.level1 || 0) + 1;
        
        // If referrer has an upline, update their team structure recursively
        if (referrerData.referredBy) {
            await updateUplineTeamStructure(referrerData.referredBy, 2, updates);
        }
        
        // Execute all updates
        await update(ref(database), updates);
        
    } catch (error) {
        console.error('Error updating referrer team structure:', error);
        showToast('Error updating referral data', 'error');
    }
}

// Recursively update upline team structure
async function updateUplineTeamStructure(uplineId, currentLevel, updates) {
    if (currentLevel > 5) return;
    
    // Get upline data
    const uplineSnapshot = await get(ref(database, `users/${uplineId}`));
    if (!uplineSnapshot.exists()) return;
    
    const uplineData = uplineSnapshot.val();
    
    // Update this upline's team structure for current level
    updates[`users/${uplineId}/teamStructure/level${currentLevel}`] = 
        (uplineData.teamStructure?.[`level${currentLevel}`] || 0) + 1;
    
    // If upline has an upline, continue recursively
    if (uplineData.referredBy && currentLevel < 5) {
        await updateUplineTeamStructure(uplineData.referredBy, currentLevel + 1, updates);
    }
}

// Logout user
async function logoutUser() {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'success');
        window.location.href = 'login.html';
    } catch (error) {
        showToast('Error logging out: ' + error.message, 'error');
    }
}

// Load user data from Firebase
function loadUserData(userId) {
    const userRef = ref(database, 'users/' + userId);
    
    onValue(userRef, (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            updateDashboardUI(userData);
            localStorage.setItem('tradeWorldUser', JSON.stringify(userData));
            
            // Update user avatar with name if available
            if (userData.name) {
                updateUserAvatar(userData.name);
            }
        }
    }, (error) => {
        console.error("Error loading user data:", error);
        showToast('Error loading user data', 'error');
    });
}

function updateDashboardUI(data) {
    if (!data) return;
    
    // Update balance
    document.getElementById('userBalance').textContent = `$${(data.balance || 0).toFixed(2)}`;
    
    // Update trading profit
    document.getElementById('tradingProfit').textContent = `$${(data.tradingProfit || 0).toFixed(2)}`;
    
    // Update referrals
    const referralCount = data.directReferrals ? Object.keys(data.directReferrals).length : 0;
    document.getElementById('directReferrals').textContent = referralCount;
    document.getElementById('referralProfit').textContent = `$${(data.referralEarnings || 0).toFixed(2)}`;
    
    // Update team earnings
    document.getElementById('teamEarnings').textContent = `$${(data.teamEarnings || 0).toFixed(2)}`;
    
    // Load transactions
    loadRecentTransactions();
}

function loadRecentTransactions() {
    if (!currentUser) return;
    
    const transactionsRef = ref(database, `users/${currentUser.uid}/transactions`);
    
    onValue(transactionsRef, (snapshot) => {
        const transactions = snapshot.val();
        const tbody = document.getElementById('transactionHistory');
        tbody.innerHTML = '';
        
        if (!transactions) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions yet</td></tr>';
            return;
        }
        
        // Convert to array and sort by timestamp
        const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
        transactionsArray.sort((a, b) => b.timestamp - a.timestamp);
        
        // Show only last 5 transactions
        transactionsArray.slice(0, 5).forEach(tx => {
            const row = document.createElement('tr');
            
            const date = new Date(tx.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const type = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
            const amount = `$${tx.amount?.toFixed(2) || '0.00'}`;
            const status = tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : 'Completed';
            const details = tx.details || '';
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${type}</td>
                <td>${amount}</td>
                <td><span class="badge status-${tx.status || 'completed'}">${status}</span></td>
                <td>${details}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    });
}

// Process package purchase with multi-level commissions
async function processPackagePurchase(packageAmount) {
    if (!currentUser) {
        showToast('Please login first', 'error');
        return false;
    }

    if ((userData.balance || 0) < packageAmount) {
        showToast('Insufficient balance', 'error');
        return false;
    }

    try {
        await loadAllUsersData(); // Refresh all users data

        // Calculate commissions
        const adminAmount = (packageAmount * COMMISSION.ADMIN) / 100;
        const directAmount = (packageAmount * COMMISSION.DIRECT) / 100;
        const levelAmounts = COMMISSION.LEVELS.map(lvl => (packageAmount * lvl) / 100);
        const tradingPool = (packageAmount * COMMISSION.TRADING_POOL) / 100;

        // Prepare all updates
        const updates = {};
        const timestamp = Date.now();
        const invoiceId = push(child(ref(database), 'invoices')).key;

        // 1. Deduct from buyer
        updates[`users/${currentUser.uid}/balance`] = (userData.balance || 0) - packageAmount;
        
        // 2. Add to investments
        updates[`users/${currentUser.uid}/investments/${invoiceId}`] = {
            amount: packageAmount,
            date: timestamp,
            package: getPackageName(packageAmount),
            status: 'active'
        };
        updates[`users/${currentUser.uid}/totalInvestment`] = (userData.totalInvestment || 0) + packageAmount;

        // 3. Admin commission
        updates[`users/${ADMIN_ID}/earnings/admin`] = (allUsersData[ADMIN_ID]?.earnings?.admin || 0) + adminAmount;

        // 4. Process referrals (if any)
        if (userData.referredBy) {
            await processReferralCommissions(userData.referredBy, packageAmount, updates);
        }

        // 5. Distribute trading pool
        await distributeTradingPool(tradingPool, updates);

        // 6. Add transaction records
        const txId = push(child(ref(database), 'transactions')).key;
        updates[`users/${currentUser.uid}/transactions/${txId}`] = {
            type: 'investment',
            amount: packageAmount,
            status: 'completed',
            timestamp: timestamp,
            details: `Purchased ${getPackageName(packageAmount)}`
        };

        // Execute all updates
        await update(ref(database), updates);
        
        showToast(`Successfully purchased ${getPackageName(packageAmount)}`, 'success');
        loadUserData(currentUser.uid);
        return true;
        
    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package', 'error');
        return false;
    }
}

// Distribute trading pool to all active investors
async function distributeTradingPool(amount, updates) {
    let totalInvestment = 0;
    const investors = [];

    // Calculate total investment from all users
    Object.entries(allUsersData).forEach(([uid, user]) => {
        if (user.investments) {
            const userInvestment = Object.values(user.investments)
                .reduce((sum, inv) => sum + (inv.amount || 0), 0);
            
            if (userInvestment > 0) {
                totalInvestment += userInvestment;
                investors.push({ uid, investment: userInvestment });
            }
        }
    });

    if (totalInvestment === 0) return;

    // Distribute proportionally
    investors.forEach(({ uid, investment }) => {
        const share = (investment / totalInvestment) * amount;
        if (share > 0) {
            updates[`users/${uid}/tradingProfit`] = (allUsersData[uid]?.tradingProfit || 0) + share;
            
            // Add transaction record
            const txId = push(child(ref(database), 'transactions')).key;
            updates[`users/${uid}/transactions/${txId}`] = {
                type: 'trading_profit',
                amount: share,
                status: 'completed',
                timestamp: Date.now(),
                details: 'Trading profit distribution'
            };
        }
    });
}

// Process multi-level referral commissions
async function processReferralCommissions(referrerId, packageAmount, updates, currentLevel = 1) {
    if (currentLevel > 5 || !allUsersData[referrerId]) return;

    // Calculate commission based on level
    const commission = currentLevel === 1 
        ? (packageAmount * COMMISSION.DIRECT) / 100
        : (packageAmount * COMMISSION.LEVELS[currentLevel-2]) / 100;

    // Update referrer's earnings
    if (currentLevel === 1) {
        updates[`users/${referrerId}/referralEarnings`] = 
            (allUsersData[referrerId]?.referralEarnings || 0) + commission;
    }
    updates[`users/${referrerId}/teamEarnings`] = 
        (allUsersData[referrerId]?.teamEarnings || 0) + commission;

    // Add transaction record
    const txId = push(child(ref(database), 'transactions')).key;
    updates[`users/${referrerId}/transactions/${txId}`] = {
        type: currentLevel === 1 ? 'referral' : `level_${currentLevel}_referral`,
        amount: commission,
        status: 'completed',
        timestamp: Date.now(),
        details: currentLevel === 1 
            ? `Direct referral commission from ${userData.name || 'User'}` 
            : `Level ${currentLevel} team commission from ${userData.name || 'User'}`
    };

    // Process next level if available
    if (allUsersData[referrerId]?.referredBy && currentLevel < 5) {
        await processReferralCommissions(allUsersData[referrerId].referredBy, packageAmount, updates, currentLevel + 1);
    }
}

// Transfer funds to another user
async function transferFunds() {
    if (!currentUser) {
        showToast('Please login first', 'error');
        return false;
    }
    
    const recipientId = document.getElementById('recipientId').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    if (!recipientId || !amount || amount <= 0) {
        showToast('Please enter valid recipient and amount', 'error');
        return false;
    }
    
    if (amount > (userData.balance || 0)) {
        showToast('Insufficient balance', 'error');
        return false;
    }
    
    try {
        // Check if recipient exists
        const recipientSnapshot = await get(ref(database, `users/${recipientId}`));
        if (!recipientSnapshot.exists()) {
            showToast('Recipient not found', 'error');
            return false;
        }
        
        const recipientData = recipientSnapshot.val();
        
        // Can't transfer to yourself
        if (recipientId === currentUser.uid) {
            showToast('Cannot transfer to yourself', 'error');
            return false;
        }
        
        // Prepare updates
        const updates = {};
        const transactionId = push(ref(database, 'transactions')).key;
        const timestamp = Date.now();
        
        // Deduct from sender
        updates[`users/${currentUser.uid}/balance`] = (userData.balance || 0) - amount;
        
        // Add to recipient
        updates[`users/${recipientId}/balance`] = (recipientData.balance || 0) + amount;
        
        // Add transaction records
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'transfer',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            details: `Transfer to ${recipientData.name || 'User'}`,
            recipientId: recipientId
        };
        
        updates[`users/${recipientId}/transactions/${transactionId}_received`] = {
            type: 'transfer',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            details: `Transfer from ${userData.name || 'User'}`,
            senderId: currentUser.uid
        };
        
        // Execute updates
        await update(ref(database), updates);
        
        showToast(`Successfully transferred $${amount.toFixed(2)}`, 'success');
        document.getElementById('transferAmount').value = '';
        document.getElementById('recipientId').value = '';
        loadUserData(currentUser.uid);
        return true;
        
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Failed to transfer funds', 'error');
        return false;
    }
}

function getPackageName(amount) {
    switch(amount) {
        case 10: return 'Starter Package';
        case 30: return 'Standard Package';
        case 100: return 'Premium Package';
        default: return 'Custom Package';
    }
}

// Show toast notification
function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
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
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
}
