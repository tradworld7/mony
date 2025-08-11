
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
    get 
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
const ADMIN_NAME = "Ramesh kumar Verma";

// Fixed commission rates
const COMMISSION_RATES = {
    admin: 0.60,       // 60% for admin
    direct: 0.10,      // 10% for direct referral
    levels: [0.02, 0.02, 0.02, 0.02, 0.02], // 2% each for 5 levels
    tradingPool: 0.20  // 20% for trading profit pool
};

// Global Variables
let currentUser = null;
let userData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Setup sidebar toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Check if user is logged in
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
    
    // Update referrals - now properly counting direct referrals
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
        // Create invoice
        const invoiceId = push(ref(database, 'invoices')).key;
        const purchaseDate = new Date().toISOString();
        const maturityDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const invoiceData = {
            invoiceId,
            userId: currentUser.uid,
            amount: packageAmount,
            expectedReturn: packageAmount * 2,
            purchaseDate,
            maturityDate,
            status: 'active',
            packageName: getPackageName(packageAmount)
        };
        
        // Calculate commissions
        const adminCommission = packageAmount * COMMISSION_RATES.admin;
        const directCommission = packageAmount * COMMISSION_RATES.direct;
        const levelCommissions = COMMISSION_RATES.levels.map(rate => packageAmount * rate);
        const totalCommissions = adminCommission + directCommission + levelCommissions.reduce((a, b) => a + b, 0);
        const tradingPool = packageAmount * COMMISSION_RATES.tradingPool;
        
        // Prepare all updates
        const updates = {};
        
        // 1. Deduct from user balance
        updates[`users/${currentUser.uid}/balance`] = (userData.balance || 0) - packageAmount;
        
        // 2. Add to investments and update total investment
        updates[`users/${currentUser.uid}/investments/${invoiceId}`] = {
            amount: packageAmount,
            purchaseDate: purchaseDate,
            status: 'active',
            expectedReturn: packageAmount * 2,
            maturityDate: maturityDate
        };
        updates[`users/${currentUser.uid}/totalInvestment`] = (userData.totalInvestment || 0) + packageAmount;
        
        // 3. Add invoice
        updates[`users/${currentUser.uid}/invoices/${invoiceId}`] = invoiceData;
        updates[`invoices/${invoiceId}`] = invoiceData;
        
        // 4. Add transaction record
        const transactionId = push(ref(database, 'transactions')).key;
        updates[`transactions/${transactionId}`] = {
            type: 'investment',
            amount: packageAmount,
            status: 'completed',
            timestamp: Date.now(),
            userId: currentUser.uid,
            details: `Purchased ${invoiceData.packageName}`
        };
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'investment',
            amount: packageAmount,
            status: 'completed',
            timestamp: Date.now(),
            details: `Purchased ${invoiceData.packageName}`
        };
        
        // 5. Add admin commission
        const currentAdminProfit = await getValue(`users/${ADMIN_ID}/tradingProfit`);
        updates[`users/${ADMIN_ID}/tradingProfit`] = (currentAdminProfit || 0) + adminCommission;
        updates[`system/adminEarnings`] = (await getValue('system/adminEarnings')) + adminCommission;
        
        // 6. Process referral commissions (if any)
        if (userData.referredBy) {
            await processReferralCommissions(userData.referredBy, packageAmount, updates);
        }
        
        // 7. Distribute trading profit to all investors proportionally
        await distributeTradingProfit(tradingPool, updates);
        
        // Execute all updates
        await update(ref(database), updates);
        
        showToast(`Successfully purchased ${invoiceData.packageName}`, 'success');
        loadUserData(currentUser.uid);
        return true;
        
    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package', 'error');
        return false;
    }
}

// Distribute trading profit proportionally based on investments
async function distributeTradingProfit(amount, updates) {
    try {
        const usersSnapshot = await get(ref(database, 'users'));
        if (!usersSnapshot.exists()) return;
        
        const users = usersSnapshot.val();
        const activeInvestors = [];
        let totalInvestment = 0;
        
        // Find all active investors and calculate total investment
        Object.entries(users).forEach(([userId, userData]) => {
            if (userData.totalInvestment > 0) {
                activeInvestors.push({
                    userId,
                    totalInvestment: userData.totalInvestment || 0
                });
                totalInvestment += userData.totalInvestment || 0;
            }
        });
        
        if (totalInvestment === 0) return;
        
        // Calculate and distribute profit proportionally
        activeInvestors.forEach(investor => {
            const share = (investor.totalInvestment / totalInvestment) * amount;
            if (share > 0) {
                updates[`users/${investor.userId}/tradingProfit`] = (users[investor.userId].tradingProfit || 0) + share;
                
                // Add transaction record for profit distribution
                const transactionId = push(ref(database, 'transactions')).key;
                updates[`users/${investor.userId}/transactions/${transactionId}`] = {
                    type: 'Trading Profit',
                    amount: share,
                    status: 'completed',
                    timestamp: Date.now(),
                    details: 'Trading profit'
                };
            }
        });
        
    } catch (error) {
        console.error('Error distributing trading profit:', error);
        throw error;
    }
}

// Process multi-level referral commissions
async function processReferralCommissions(referrerId, packageAmount, updates, currentLevel = 1) {
    if (currentLevel > 5) return;

    // Get referrer data
    const referrerSnapshot = await get(ref(database, `users/${referrerId}`));
    if (!referrerSnapshot.exists()) return;
    
    const referrerData = referrerSnapshot.val();
    
    // Calculate commission based on level
    let commissionRate = 0;
    if (currentLevel === 1) {
        commissionRate = COMMISSION_RATES.direct; // Direct referral commission (10%)
    } else if (currentLevel <= 5) {
        commissionRate = COMMISSION_RATES.levels[currentLevel-2]; // Level commission (2% each)
    }
    
    const commission = packageAmount * commissionRate;
    
    if (commission > 0) {
        // Update referrer's earnings
        if (currentLevel === 1) {
            updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
        }
        updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
        
        // Add transaction record for referrer
        const transactionId = push(ref(database, 'transactions')).key;
        updates[`users/${referrerId}/transactions/${transactionId}`] = {
            type: currentLevel === 1 ? 'referral' : 'team',
            amount: commission,
            status: 'completed',
            timestamp: Date.now(),
            details: currentLevel === 1 
                ? `Direct referral commission from ${userData.name || 'User'}` 
                : `Level ${currentLevel} team commission from ${userData.name || 'User'}`
        };
        
        // If referrer has an upline, continue recursively
        if (referrerData.referredBy && currentLevel < 5) {
            await processReferralCommissions(referrerData.referredBy, packageAmount, updates, currentLevel + 1);
        }
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

async function getValue(path) {
    const snapshot = await get(ref(database, path));
    return snapshot.val() || 0;
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

