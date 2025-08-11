// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    setPersistence,
    browserSessionPersistence
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

// Set persistence to keep users logged in
setPersistence(auth, browserSessionPersistence)
    .catch((error) => {
        console.error("Error setting auth persistence:", error);
    });

// Admin details
const ADMIN_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";
const ADMIN_NAME = "Ramesh kumar Verma";

// Global Variables
let currentUser = null;
let userData = null;
let systemSettings = {
    adminCommission: 0.60,
    directCommission: 0.10,
    levelCommissions: [0.02, 0.02, 0.02, 0.02, 0.02],
    tradingProfitPool: 0.20
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Setup sidebar toggle
    document.getElementById('menuToggle')?.addEventListener('click', function() {
        document.getElementById('sidebar')?.classList.toggle('open');
    });
    
    // Check auth state on all pages
    checkAuthState();
    
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
    document.getElementById('submitTransfer')?.addEventListener('click', async () => {
        const btn = document.getElementById('submitTransfer');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Processing...';
        await transferFunds();
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Transfer Now';
    });
    
    // Setup logout
    document.getElementById('logoutLink')?.addEventListener('click', (e) => {
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

// Check auth state on all pages
function checkAuthState() {
    // Load system settings first
    loadSystemSettings().then(() => {
        // Check if user is logged in
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                loadUserData(user.uid);
                
                // Hide auth modals if showing
                document.getElementById('loginModal')?.style.display = 'none';
                document.getElementById('signupModal')?.style.display = 'none';
                
                // Show main content if exists
                document.getElementById('mainContent')?.style.display = 'block';
                
                // Update user avatar
                updateUserAvatar(user.email || 'User');
                
                // Check for referral parameter in URL
                checkReferralFromURL();
                
                // Update sidebar menu for logged in user
                updateSidebarMenu(true);
            } else {
                // Update sidebar menu for logged out user
                updateSidebarMenu(false);
                
                // Show login modal if not on auth pages
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('signup.html') &&
                    !window.location.pathname.includes('forgot-password.html')) {
                    showLoginModal();
                }
            }
        });
    });
}

// Update sidebar menu based on auth state
function updateSidebarMenu(isLoggedIn) {
    const authLinks = document.querySelectorAll('.auth-link');
    const protectedLinks = document.querySelectorAll('.protected-link');
    
    if (isLoggedIn) {
        authLinks.forEach(link => link.style.display = 'none');
        protectedLinks.forEach(link => link.style.display = 'block');
    } else {
        authLinks.forEach(link => link.style.display = 'block');
        protectedLinks.forEach(link => link.style.display = 'none');
    }
}

// Load system settings
async function loadSystemSettings() {
    try {
        const settingsSnapshot = await get(ref(database, 'system/settings'));
        if (settingsSnapshot.exists()) {
            systemSettings = settingsSnapshot.val();
            
            // Ensure all old users get trading profit by checking their investments
            await checkOldUsersInvestments();
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        showToast('Error loading system settings', 'error');
    }
}

// Check and update old users' investments to ensure they receive trading profit
async function checkOldUsersInvestments() {
    try {
        const usersSnapshot = await get(ref(database, 'users'));
        if (!usersSnapshot.exists()) return;
        
        const users = usersSnapshot.val();
        const updates = {};
        let needsUpdate = false;
        
        // Check each user for missing trading profit distribution
        Object.entries(users).forEach(([userId, userData]) => {
            if (userData.investments && Object.keys(userData.investments).length > 0) {
                // Check if tradingProfit exists, if not initialize it
                if (typeof userData.tradingProfit === 'undefined') {
                    updates[`users/${userId}/tradingProfit`] = 0;
                    needsUpdate = true;
                }
                
                // Check if transactions exist for investments
                Object.entries(userData.investments).forEach(([investmentId, investment]) => {
                    if (investment.status === 'active') {
                        // Check if transaction exists for this investment
                        let hasTransaction = false;
                        if (userData.transactions) {
                            Object.values(userData.transactions).forEach(tx => {
                                if (tx.details && tx.details.includes(investmentId)) {
                                    hasTransaction = true;
                                }
                            });
                        }
                        
                        if (!hasTransaction) {
                            // Create missing transaction
                            const transactionId = push(ref(database, 'transactions')).key;
                            updates[`users/${userId}/transactions/${transactionId}`] = {
                                type: 'investment',
                                amount: investment.amount,
                                status: 'completed',
                                timestamp: investment.purchaseDate || Date.now(),
                                details: `Purchased investment ${investmentId}`
                            };
                            needsUpdate = true;
                        }
                    }
                });
            }
        });
        
        // Execute updates if needed
        if (needsUpdate) {
            await update(ref(database), updates);
            console.log('Updated old users investments and transactions');
        }
        
    } catch (error) {
        console.error('Error checking old users investments:', error);
    }
}

// [Rest of your existing functions remain the same...]
// All your existing functions like updateUserAvatar, showLoginModal, loginUser, 
// signupUser, updateReferrerTeamStructure, logoutUser, loadUserData, 
// updateDashboardUI, loadRecentTransactions, processPackagePurchase,
// distributeTradingProfit, processReferralCommissions, transferFunds,
// getPackageName, getValue, showToast remain exactly the same as in your original code

// Only the following function needs to be modified to ensure proper profit distribution:

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
        const purchaseDate = Date.now();
        const maturityDate = purchaseDate + 30 * 24 * 60 * 60 * 1000; // 30 days later
        
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
        const adminCommission = packageAmount * systemSettings.adminCommission;
        const directCommission = packageAmount * systemSettings.directCommission;
        const levelCommissions = systemSettings.levelCommissions.map(rate => packageAmount * rate);
        const totalCommissions = adminCommission + directCommission + levelCommissions.reduce((a, b) => a + b, 0);
        const tradingPool = packageAmount - totalCommissions;
        
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
            maturityDate: maturityDate,
            packageName: invoiceData.packageName
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
            timestamp: purchaseDate,
            userId: currentUser.uid,
            details: `Purchased ${invoiceData.packageName} (${invoiceId})`
        };
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'investment',
            amount: packageAmount,
            status: 'completed',
            timestamp: purchaseDate,
            details: `Purchased ${invoiceData.packageName} (${invoiceId})`
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
        await distributeTradingProfit(tradingPool, updates, purchaseDate);
        
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

// Modified distributeTradingProfit to ensure proper distribution
async function distributeTradingProfit(amount, updates, timestamp = Date.now()) {
    try {
        const usersSnapshot = await get(ref(database, 'users'));
        if (!usersSnapshot.exists()) return;
        
        const users = usersSnapshot.val();
        const activeInvestors = [];
        let totalInvestment = 0;
        
        // Find all active investors and calculate total investment
        Object.entries(users).forEach(([userId, userData]) => {
            const investment = userData.totalInvestment || 0;
            if (investment > 0) {
                activeInvestors.push({
                    userId,
                    totalInvestment: investment
                });
                totalInvestment += investment;
            }
        });
        
        if (totalInvestment === 0) return;
        
        // Calculate and distribute profit proportionally
        activeInvestors.forEach(investor => {
            const share = (investor.totalInvestment / totalInvestment) * amount;
            if (share > 0) {
                const currentProfit = users[investor.userId]?.tradingProfit || 0;
                updates[`users/${investor.userId}/tradingProfit`] = currentProfit + share;
                
                // Add transaction record for profit distribution
                const transactionId = push(ref(database, 'transactions')).key;
                updates[`users/${investor.userId}/transactions/${transactionId}`] = {
                    type: 'Trading Profit',
                    amount: share,
                    status: 'completed',
                    timestamp: timestamp,
                    details: 'Trading profit distribution'
                };
                
                // Also update last profit distribution date
                updates[`users/${investor.userId}/lastProfitDistribution`] = timestamp;
            }
        });
        
    } catch (error) {
        console.error('Error distributing trading profit:', error);
        throw error;
    }
}
