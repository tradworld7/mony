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

// Admin configuration
const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";
const ADMIN_NAME = "Ramesh Kumar Verma";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let currentUser = null;
let userData = null;

// Initialize the dashboard page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize navigation menu
    initializeNavigationMenu();
    
    // Check auth state
    checkAuthState();
    
    // Load transaction history
    loadTransactionHistory();
    
    // Set up event listeners
    setupDashboardEventListeners();
    
    // Transfer button handler
    const transferBtn = document.getElementById('submitTransfer');
    if (transferBtn) {
        transferBtn.addEventListener('click', transferFunds);
    }
    
    // Load side menu data
    loadSideMenuData();
});

// Initialize navigation menu
function initializeNavigationMenu() {
    const menuContainer = document.getElementById('sideMenu');
    if (!menuContainer) return;

    // Create menu HTML structure
    menuContainer.innerHTML = `
        <div class="menu-header">
            <div class="user-info">
                <h3 id="sideMenuUserName">Loading...</h3>
                <span id="sideMenuUserEmail">user@example.com</span>
            </div>
            <div class="balance-info">
                <span>Balance</span>
                <h2 id="sideMenuUserBalance">$0.00</h2>
            </div>
        </div>
        
        <div class="menu-divider"></div>
        
        <ul class="menu-items">
            <li class="menu-title">Dashboard</li>
            <li><a href="index.html"><i class="fas fa-home"></i> Overview</a></li>
            <li><a href="#" class="dashboard-submenu"><i class="fas fa-users"></i> Direct Referrals <span id="sideMenuDirectRef" class="menu-badge">0</span></a></li>
            <li><a href="#" class="dashboard-submenu"><i class="fas fa-money-bill-wave"></i> Total Team Earnings <span id="sideMenuTeamEarnings" class="menu-badge">$0.00</span></a></li>
            
            <li class="menu-title">Transactions</li>
            <li><a href="deposit.html"><i class="fas fa-money-bill-alt"></i> Deposit</a></li>
            <li><a href="withdrawal.html"><i class="fas fa-wallet"></i> Withdrawal</a></li>
            <li><a href="transfer.html"><i class="fas fa-exchange-alt"></i> Transfer</a></li>
            <li><a href="trading-history.html"><i class="fas fa-chart-line"></i> Trading History</a></li>
            
            <li class="menu-title">Account</li>
            <li><a href="profile.html"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="referral.html"><i class="fas fa-user-plus"></i> Referral Program</a></li>
            <li><a href="team-structure.html"><i class="fas fa-sitemap"></i> Team Structure</a></li>
            <li><a href="packages.html"><i class="fas fa-box-open"></i> Investment Packages</a></li>
            <li><a href="invoices.html"><i class="fas fa-file-invoice"></i> Invoices</a></li>
            
            <li class="menu-title">Authentication</li>
            <li><a href="login.html" id="loginLink"><i class="fas fa-sign-in-alt"></i> Login</a></li>
            <li><a href="signup.html"><i class="fas fa-user-plus"></i> Sign Up</a></li>
            <li><a href="#" id="logoutLink" style="display:none"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        </ul>
        
        <div class="menu-footer">
            <div class="recent-transactions">
                <h4>Recent Transactions</h4>
                <ul id="sideMenuTransactions">
                    <li>No recent transactions</li>
                </ul>
            </div>
        </div>
    `;
}

// Load data for side menu
function loadSideMenuData() {
    if (!currentUser) return;
    
    database.ref('users/' + currentUser.uid).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Update profile info
            document.getElementById('sideMenuUserName').textContent = data.name || 'User';
            document.getElementById('sideMenuUserEmail').textContent = currentUser.email;
            document.getElementById('sideMenuUserBalance').textContent = `$${(data.balance || 0).toFixed(2)}`;
            
            // Update referral count
            const directRefCount = data.directReferrals ? Object.keys(data.directReferrals).length : 0;
            document.getElementById('sideMenuDirectRef').textContent = directRefCount;
            
            // Update team earnings
            document.getElementById('sideMenuTeamEarnings').textContent = `$${(data.teamEarnings || 0).toFixed(2)}`;
            
            // Update investment count
            const investmentCount = data.investments ? Object.keys(data.investments).length : 0;
            document.getElementById('sideMenuInvestments').textContent = investmentCount;
        }
    });
}

// Check user authentication state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            updateUIForLoggedInUser();
            loadUserData(user.uid);
            
            // Special handling for admin dashboard
            if (user.uid === ADMIN_USER_ID) {
                setupAdminDashboard();
            }
        } else {
            // User is signed out
            currentUser = null;
            updateUIForLoggedOutUser();
            
            // Redirect to login if not on auth pages
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Special setup for admin dashboard
function setupAdminDashboard() {
    // Add admin-specific UI elements if needed
    document.querySelector('.page-title').textContent += ' (Admin)';
    
    // Load admin-specific data
    loadAdminStats();
}

// Load admin statistics
function loadAdminStats() {
    database.ref('system/adminEarnings').on('value', (snapshot) => {
        const adminEarnings = snapshot.val() || 0;
        // Display somewhere in admin dashboard
        console.log(`Admin total earnings: $${adminEarnings.toFixed(2)}`);
    });
}

// Load user data from database
function loadUserData(userId) {
    database.ref('users/' + userId).on('value', (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            // Update dashboard cards
            document.getElementById('userBalance').textContent = `$${(userData.balance || 0).toFixed(2)}`;
            document.getElementById('tradingProfit').textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
            
            // Calculate direct referrals count
            const directRefCount = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
            document.getElementById('directReferrals').textContent = directRefCount;
            
            // Update referral earnings
            document.getElementById('referralProfit').textContent = `Earnings: $${(userData.referralEarnings || 0).toFixed(2)}`;
            
            // Update team earnings (sum of all levels)
            document.getElementById('teamEarnings').textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
            
            // Also update the team structure data
            if (userData.directReferrals) {
                updateTeamStructure(userData.directReferrals);
            }
            
            // Store user data locally
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update side menu
            loadSideMenuData();
        }
    }, (error) => {
        showToast('Error loading user data', 'error');
        console.error('Error loading user data:', error);
    });
}

// Update team structure display
function updateTeamStructure(directReferrals) {
    const teamList = document.getElementById('teamStructureList');
    if (!teamList) return;
    
    teamList.innerHTML = '';
    
    if (!directReferrals || Object.keys(directReferrals).length === 0) {
        teamList.innerHTML = '<li>No team members yet</li>';
        return;
    }
    
    Object.entries(directReferrals).forEach(([userId, refData]) => {
        const memberItem = document.createElement('li');
        memberItem.innerHTML = `
            <div class="team-member">
                <span class="member-id">${userId.substring(0, 8)}...</span>
                <span class="member-name">${refData.name || 'No name'}</span>
                <span class="member-join-date">${formatDate(refData.joinDate)}</span>
                <span class="member-earning">Earnings: $${(refData.earnings || 0).toFixed(2)}</span>
            </div>
        `;
        teamList.appendChild(memberItem);
    });
}

// Load transaction history
function loadTransactionHistory() {
    if (!currentUser) return;
    
    // Check local storage first
    const localTransactions = localStorage.getItem('transactions');
    if (localTransactions) {
        displayTransactions(JSON.parse(localTransactions));
    }
    
    database.ref('transactions/' + currentUser.uid).orderByChild('timestamp').limitToLast(5).once('value').then((snapshot) => {
        const transactions = snapshot.val();
        
        if (transactions) {
            // Store transactions locally
            localStorage.setItem('transactions', JSON.stringify(transactions));
            displayTransactions(transactions);
            
            // Also update the transaction history in side menu
            updateSideMenuTransactions(transactions);
        } else if (!localTransactions) {
            document.getElementById('transactionHistory').innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
        }
        
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    }).catch((error) => {
        console.error('Error loading transaction history:', error);
        showToast('Error loading transactions', 'error');
    });
}

// Update transactions in side menu
function updateSideMenuTransactions(transactions) {
    const sideMenuTxList = document.getElementById('sideMenuTransactions');
    if (!sideMenuTxList) return;
    
    sideMenuTxList.innerHTML = '';
    
    if (!transactions || Object.keys(transactions).length === 0) {
        sideMenuTxList.innerHTML = '<li>No transactions yet</li>';
        return;
    }
    
    // Convert to array and sort by timestamp
    const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
    transactionsArray.sort((a, b) => b.timestamp - a.timestamp);
    
    // Show only last 3 in side menu
    transactionsArray.slice(0, 3).forEach(tx => {
        const txItem = document.createElement('li');
        txItem.innerHTML = `
            <span class="tx-type">${tx.type || 'Transfer'}</span>
            <span class="tx-amount">$${tx.amount?.toFixed(2) || '0.00'}</span>
            <span class="tx-date">${formatDateShort(tx.timestamp)}</span>
        `;
        sideMenuTxList.appendChild(txItem);
    });
}

// Display transactions in the table
function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionHistory');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!transactions || Object.keys(transactions).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
        return;
    }
    
    // Convert to array and sort by timestamp
    const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
    transactionsArray.sort((a, b) => b.timestamp - a.timestamp);
    
    transactionsArray.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(tx.timestamp)}</td>
            <td>${tx.type || 'Transfer'}</td>
            <td>$${tx.amount?.toFixed(2) || '0.00'}</td>
            <td class="status-${tx.status || 'completed'}">${formatStatus(tx.status)}</td>
            <td>${tx.details || (tx.type === 'sent' ? 'To: ' + (tx.to || '') : 'From: ' + (tx.from || ''))}</td>
        `;
        tbody.appendChild(row);
    });
}

// Format timestamp
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Format short date for side menu
function formatDateShort(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
}

// Format status
function formatStatus(status) {
    if (!status) return 'Completed';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Transfer funds function
async function transferFunds() {
    const recipientId = document.getElementById('recipientId').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const currentBalance = parseFloat(userData?.balance || 0);
    
    // Validation
    if (!recipientId) {
        showToast('Please enter recipient ID', 'error');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter valid amount', 'error');
        return;
    }
    
    if (amount > currentBalance) {
        showToast('Insufficient balance', 'error');
        return;
    }
    
    if (recipientId === currentUser?.uid) {
        showToast('Cannot transfer to yourself', 'error');
        return;
    }
    
    try {
        // Check if recipient exists
        const recipientRef = database.ref('users/' + recipientId);
        const snapshot = await recipientRef.once('value');
        
        if (!snapshot.exists()) {
            showToast('Recipient not found', 'error');
            return;
        }
        
        // Start transaction
        const updates = {};
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const transactionId = database.ref().child('transactions').push().key;
        
        // Update sender balance
        updates[`users/${currentUser.uid}/balance`] = currentBalance - amount;
        
        // Update recipient balance
        const recipientBalance = parseFloat(snapshot.val().balance || 0);
        updates[`users/${recipientId}/balance`] = recipientBalance + amount;
        
        // Record transaction
        updates[`transactions/${transactionId}`] = {
            userId: currentUser.uid,
            type: 'transfer',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            details: `Transfer to ${recipientId}`
        };
        
        // Save sender transaction history
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'sent',
            to: recipientId,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };
        
        // Save recipient transaction history
        updates[`users/${recipientId}/transactions/${transactionId}`] = {
            type: 'received',
            from: currentUser.uid,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };
        
        // Execute all updates atomically
        await database.ref().update(updates);
        
        showToast(`Successfully transferred $${amount.toFixed(2)}`, 'success');
        
        // Refresh data
        loadUserData(currentUser.uid);
        loadTransactionHistory();
        document.getElementById('transferAmount').value = '';
        document.getElementById('recipientId').value = '';
        
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Transfer failed: ' + error.message, 'error');
    }
}

// Purchase investment package
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
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const packageId = database.ref().child('investments').push().key;
        
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
            maturityDate: timestamp + (30 * 24 * 60 * 60 * 1000) // 30 days from now
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
        const profitTxId = database.ref().child('transactions').push().key;
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
        
        // Add trading profit to pool (will be distributed equally among all active users)
        const tradingPoolRef = await database.ref('system/tradingPool').once('value');
        const currentPool = parseFloat(tradingPoolRef.val()) || 0;
        updates[`system/tradingPool`] = currentPool + tradingProfit;
        
        // Credit admin commission directly to admin's wallet
        const adminRef = await database.ref(`users/${ADMIN_USER_ID}`).once('value');
        const adminData = adminRef.val();
        const adminCurrentBalance = parseFloat(adminData?.balance || 0);
        const adminCurrentProfit = parseFloat(adminData?.tradingProfit || 0);
        
        updates[`users/${ADMIN_USER_ID}/balance`] = adminCurrentBalance + adminCommission;
        updates[`users/${ADMIN_USER_ID}/tradingProfit`] = adminCurrentProfit + adminCommission;
        
        // Add transaction record for admin
        const adminTxId = database.ref().child('transactions').push().key;
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
        const adminEarningsRef = await database.ref('system/adminEarnings').once('value');
        const currentAdminEarnings = parseFloat(adminEarningsRef.val()) || 0;
        updates[`system/adminEarnings`] = currentAdminEarnings + adminCommission;
        
        // Execute all updates
        await database.ref().update(updates);
        
        // Distribute trading profit to all active users (including admin)
        await distributeTradingProfit(tradingProfit);
        
        showToast(`Successfully purchased $${amount} package. You received $${userProfit.toFixed(2)} immediate profit!`, 'success');
        loadUserData(currentUser.uid);
        loadTransactionHistory();
        
    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package', 'error');
    }
}

// Distribute trading profit equally among all active users (including admin)
async function distributeTradingProfit(totalProfit) {
    try {
        // Get all active users (including admin)
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val();
        
        if (!users) return;
        
        // Filter active users (active within 30 days) including admin
        const activeUsers = Object.keys(users).filter(uid => {
            return users[uid].lastActive && (Date.now() - users[uid].lastActive) < (30 * 24 * 60 * 60 * 1000);
        });
        
        if (activeUsers.length === 0) return;
        
        const profitPerUser = totalProfit / activeUsers.length;
        const updates = {};
        
        activeUsers.forEach(uid => {
            updates[`users/${uid}/tradingProfit`] = (users[uid].tradingProfit || 0) + profitPerUser;
            
            // Record profit transaction
            const txId = database.ref().child('transactions').push().key;
            updates[`users/${uid}/transactions/${txId}`] = {
                type: 'profit',
                amount: profitPerUser,
                status: 'completed',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                details: `Trading profit from pool`
            };
        });
        
        // Clear the trading pool
        updates['system/tradingPool'] = 0;
        
        await database.ref().update(updates);
        
    } catch (error) {
        console.error('Error distributing trading profit:', error);
    }
}

// Distribute referral commissions (recursive function for 5 levels)
async function distributeReferralCommissions(referrerId, amount, currentLevel, updates) {
    if (currentLevel > 5) return;
    
    // Get referrer data
    const referrerSnapshot = await database.ref(`users/${referrerId}`).once('value');
    const referrerData = referrerSnapshot.val();
    
    if (!referrerData) return;
    
    // Calculate commission (2% per level)
    const commission = amount * 0.02;
    
    // Update referrer's earnings
    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
    
    // Add transaction record for referrer
    const transactionId = database.ref().child('transactions').push().key;
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
        type: 'referral',
        amount: commission,
        status: 'completed',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        details: `Level ${currentLevel} referral commission`
    };
    
    // Continue to next level if available
    if (referrerData.referredBy && currentLevel < 5) {
        await distributeReferralCommissions(referrerData.referredBy, amount, currentLevel + 1, updates);
    }
}

// Set up event listeners
function setupDashboardEventListeners() {
    // Package purchase buttons
    document.querySelectorAll('[data-package]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const packageAmount = parseFloat(btn.getAttribute('data-package'));
            purchasePackage(packageAmount);
        });
    });
    
    // Logout
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });
    
    // Menu toggle for mobile
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Navigation links
    document.querySelectorAll('.side-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Close mobile menu when a link is clicked
            document.getElementById('sidebar').classList.remove('open');
        });
    });
}

// Logout user
function logoutUser() {
    auth.signOut().then(() => {
        showToast('Successfully logged out', 'success');
        window.location.href = 'login.html';
    }).catch((error) => {
        showToast('Error logging out', 'error');
        console.error('Logout error:', error);
    });
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

// Update UI for logged in user
function updateUIForLoggedInUser() {
    document.getElementById('logoutLink').style.display = 'block';
    document.getElementById('loginLink').style.display = 'none';
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    document.getElementById('logoutLink').style.display = 'none';
    document.getElementById('loginLink').style.display = 'block';
}
