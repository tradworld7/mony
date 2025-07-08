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

// Helper function for showing toasts
function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn('Toast container not found. Message:', message);
        return;
    }
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

// Initialize the dashboard page
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigationMenu();
    checkAuthState();
    setupDashboardEventListeners();
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
            <li><a href="referral.html"><i class="fas fa-users"></i> Direct Referrals <span id="sideMenuDirectRef" class="menu-badge">0</span></a></li>
            <li><a href="team-structure.html"><i class="fas fa-money-bill-wave"></i> Total Team Earnings <span id="sideMenuTeamEarnings" class="menu-badge">$0.00</span></a></li>
            
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

    // Ensure logout link is interactive
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // Menu toggle for mobile
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close mobile menu when a navigation link is clicked
    document.querySelectorAll('.side-menu a').forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        });
    });
}

// Load data for side menu
function loadSideMenuData() {
    if (!currentUser || !userData) {
        // If userData is not yet loaded, try to load it
        if (currentUser && !userData) {
            loadUserData(currentUser.uid);
        }
        return;
    }

    // Update profile info
    document.getElementById('sideMenuUserName').textContent = userData.name || 'User';
    document.getElementById('sideMenuUserEmail').textContent = currentUser.email;
    document.getElementById('sideMenuUserBalance').textContent = `$${(userData.balance || 0).toFixed(2)}`;

    // Update referral count
    const directRefCount = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
    document.getElementById('sideMenuDirectRef').textContent = directRefCount;

    // Update team earnings
    document.getElementById('sideMenuTeamEarnings').textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
}

// Check user authentication state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser();
            loadUserData(user.uid);
            // Load transaction history for the side menu only once here.
            loadTransactionHistory();

            if (user.uid === ADMIN_USER_ID) {
                setupAdminDashboard();
            }
        } else {
            currentUser = null;
            userData = null; // Clear user data on logout
            updateUIForLoggedOutUser();

            if (!window.location.pathname.includes('login.html') &&
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Special setup for admin dashboard
function setupAdminDashboard() {
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && !pageTitle.textContent.includes('(Admin)')) {
        pageTitle.textContent += ' (Admin)';
    }
    loadAdminStats();
}

// Load admin statistics
function loadAdminStats() {
    database.ref('system/adminEarnings').on('value', (snapshot) => {
        const adminEarnings = snapshot.val() || 0;
        // Example: Display admin earnings on a specific dashboard element for admin
        const adminEarningsElement = document.getElementById('adminEarningsDisplay');
        if (adminEarningsElement) {
            adminEarningsElement.textContent = `$${adminEarnings.toFixed(2)}`;
        }
    });
}

// Load user data from database and update dashboard cards
function loadUserData(userId) {
    database.ref('users/' + userId).on('value', (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            // Update dashboard cards
            const userBalanceElement = document.getElementById('userBalance');
            if (userBalanceElement) userBalanceElement.textContent = `$${(userData.balance || 0).toFixed(2)}`;

            const tradingProfitElement = document.getElementById('tradingProfit');
            if (tradingProfitElement) tradingProfitElement.textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;

            // Calculate and update direct referrals count
            const directRefCount = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
            const directReferralsElement = document.getElementById('directReferrals');
            if (directReferralsElement) directReferralsElement.textContent = directRefCount;

            // Update referral earnings
            const referralProfitElement = document.getElementById('referralProfit');
            if (referralProfitElement) referralProfitElement.textContent = `Earnings: $${(userData.referralEarnings || 0).toFixed(2)}`;

            // Update total team earnings (sum of all levels)
            const teamEarningsElement = document.getElementById('teamEarnings');
            if (teamEarningsElement) teamEarningsElement.textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;

            // Update team structure data if on the team-structure.html page
            if (window.location.pathname.includes('team-structure.html') && userData.directReferrals) {
                updateTeamStructure(userData.directReferrals);
            }

            // Update investment packages if on packages.html
            if (window.location.pathname.includes('packages.html') && userData.investments) {
                displayInvestmentPackages(userData.investments);
            }

            // Update invoices if on invoices.html
            if (window.location.pathname.includes('invoices.html') && userData.invoices) {
                displayInvoices(userData.invoices);
            }

            // Store user data locally (consider clearing sensitive data on logout)
            localStorage.setItem('userData', JSON.stringify(userData));

            // Always update side menu after user data is loaded
            loadSideMenuData();
        } else {
            // If user data is null, ensure dashboard elements show default values
            if (document.getElementById('userBalance')) document.getElementById('userBalance').textContent = '$0.00';
            if (document.getElementById('tradingProfit')) document.getElementById('tradingProfit').textContent = '$0.00';
            if (document.getElementById('directReferrals')) document.getElementById('directReferrals').textContent = '0';
            if (document.getElementById('referralProfit')) document.getElementById('referralProfit').textContent = 'Earnings: $0.00';
            if (document.getElementById('teamEarnings')) document.getElementById('teamEarnings').textContent = '$0.00';
            loadSideMenuData(); // Update side menu with default values
        }
    }, (error) => {
        showToast('Error loading user data: ' + error.message, 'error');
        console.error('Error loading user data:', error);
    });
}

// Update team structure display (for team-structure.html)
function updateTeamStructure(directReferrals) {
    const teamList = document.getElementById('teamStructureList');
    if (!teamList) return;

    teamList.innerHTML = '';

    if (!directReferrals || Object.keys(directReferrals).length === 0) {
        teamList.innerHTML = '<li>No team members yet. Invite someone to grow your team!</li>';
        return;
    }

    Object.entries(directReferrals).forEach(([userId, refData]) => {
        const memberItem = document.createElement('li');
        memberItem.className = 'team-member-item'; // Add a class for styling
        memberItem.innerHTML = `
            <div class="member-details">
                <span class="member-name">${refData.name || 'N/A'}</span>
                <span class="member-email">${refData.email || 'N/A'}</span>
                <span class="member-id">ID: ${userId.substring(0, 8)}...</span>
            </div>
            <div class="member-stats">
                <span class="member-join-date">Joined: ${formatDate(refData.joinDate)}</span>
                <span class="member-earning">Referral Earnings: $${(refData.referralEarnings || 0).toFixed(2)}</span>
            </div>
        `;
        teamList.appendChild(memberItem);
    });
}

// Display investment packages (for packages.html)
function displayInvestmentPackages(investments) {
    const packagesContainer = document.getElementById('userInvestmentPackages');
    if (!packagesContainer) return;

    packagesContainer.innerHTML = '';

    if (!investments || Object.keys(investments).length === 0) {
        packagesContainer.innerHTML = '<p class="text-center">You have not purchased any investment packages yet.</p>';
        return;
    }

    const investmentsArray = Object.entries(investments).map(([id, inv]) => ({ id, ...inv }));
    investmentsArray.sort((a, b) => b.purchaseDate - a.purchaseDate);

    investmentsArray.forEach(inv => {
        const packageCard = document.createElement('div');
        packageCard.className = 'package-card'; // Assuming you have some CSS for this
        packageCard.innerHTML = `
            <h4>Package: $${inv.amount.toFixed(2)}</h4>
            <p>Purchase Date: ${formatDate(inv.purchaseDate)}</p>
            <p>Expected Return: $${(inv.expectedReturn || 0).toFixed(2)}</p>
            <p>Maturity Date: ${formatDate(inv.maturityDate)}</p>
            <p>Status: <span class="status-${inv.status}">${formatStatus(inv.status)}</span></p>
        `;
        packagesContainer.appendChild(packageCard);
    });
}

// Display invoices (for invoices.html)
function displayInvoices(invoices) {
    const invoicesTableBody = document.getElementById('invoicesTableBody');
    if (!invoicesTableBody) return;

    invoicesTableBody.innerHTML = '';

    if (!invoices || Object.keys(invoices).length === 0) {
        invoicesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No invoices generated yet.</td></tr>';
        return;
    }

    const invoicesArray = Object.entries(invoices).map(([id, invoice]) => ({ id, ...invoice }));
    invoicesArray.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent

    invoicesArray.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>INV-${invoice.id.substring(0, 8).toUpperCase()}</td>
            <td>${invoice.type || 'N/A'}</td>
            <td>$${(invoice.amount || 0).toFixed(2)}</td>
            <td>${formatDate(invoice.timestamp)}</td>
            <td><span class="status-${invoice.status || 'generated'}">${formatStatus(invoice.status || 'generated')}</span></td>
        `;
        invoicesTableBody.appendChild(row);
    });
}

// Load transaction history for main dashboard table and side menu
function loadTransactionHistory() {
    if (!currentUser) return;

    const transactionRef = database.ref('users/' + currentUser.uid + '/transactions').orderByChild('timestamp');

    // Attach a listener for real-time updates
    transactionRef.on('value', (snapshot) => {
        const transactions = snapshot.val();
        if (transactions) {
            const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
            transactionsArray.sort((a, b) => b.timestamp - a.timestamp); // Sort descending

            // Update main transaction history table (if it exists on the page)
            displayTransactions(transactionsArray);

            // Update side menu transactions
            updateSideMenuTransactions(transactionsArray);
        } else {
            // No transactions
            const tbody = document.getElementById('transactionHistory');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
            }
            const sideMenuTxList = document.getElementById('sideMenuTransactions');
            if (sideMenuTxList) {
                sideMenuTxList.innerHTML = '<li>No recent transactions</li>';
            }
        }
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = new Date().toLocaleTimeString();
        }
    }, (error) => {
        console.error('Error loading transaction history:', error);
        showToast('Error loading transactions', 'error');
    });
}


// Update transactions in side menu
function updateSideMenuTransactions(transactionsArray) {
    const sideMenuTxList = document.getElementById('sideMenuTransactions');
    if (!sideMenuTxList) return;

    sideMenuTxList.innerHTML = '';

    if (!transactionsArray || transactionsArray.length === 0) {
        sideMenuTxList.innerHTML = '<li>No recent transactions</li>';
        return;
    }

    // Show only last 3 in side menu
    transactionsArray.slice(0, 3).forEach(tx => {
        const txItem = document.createElement('li');
        txItem.innerHTML = `
            <span class="tx-type">${tx.type || 'Transaction'}</span>
            <span class="tx-amount">$${tx.amount?.toFixed(2) || '0.00'}</span>
            <span class="tx-date">${formatDateShort(tx.timestamp)}</span>
        `;
        sideMenuTxList.appendChild(txItem);
    });
}

// Display transactions in the main dashboard table
function displayTransactions(transactionsArray) {
    const tbody = document.getElementById('transactionHistory');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!transactionsArray || transactionsArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
        return;
    }

    transactionsArray.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(tx.timestamp)}</td>
            <td>${tx.type || 'Transaction'}</td>
            <td>$${tx.amount?.toFixed(2) || '0.00'}</td>
            <td class="status-${tx.status || 'completed'}">${formatStatus(tx.status)}</td>
            <td>${tx.details || (tx.type === 'sent' ? 'To: ' + (tx.to || '') : tx.type === 'received' ? 'From: ' + (tx.from || '') : 'N/A')}</td>
        `;
        tbody.appendChild(row);
    });
}


// Transfer funds function (for transfer.html)
async function transferFunds() {
    if (!currentUser) {
        showToast('Please log in to transfer funds.', 'error');
        window.location.href = 'login.html';
        return;
    }

    const recipientIdInput = document.getElementById('recipientId');
    const transferAmountInput = document.getElementById('transferAmount');
    const submitTransferBtn = document.getElementById('submitTransfer');

    if (!recipientIdInput || !transferAmountInput || !submitTransferBtn) {
        console.error('Transfer form elements not found.');
        return;
    }

    const recipientId = recipientIdInput.value.trim();
    const amount = parseFloat(transferAmountInput.value);
    const currentBalance = parseFloat(userData?.balance || 0);

    // Basic validation
    if (!recipientId) {
        showToast('Please enter recipient ID.', 'error');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount greater than zero.', 'error');
        return;
    }
    if (amount > currentBalance) {
        showToast('Insufficient balance.', 'error');
        return;
    }
    if (recipientId === currentUser.uid) {
        showToast('Cannot transfer funds to yourself.', 'error');
        return;
    }

    // Disable button to prevent double submission
    submitTransferBtn.disabled = true;
    submitTransferBtn.textContent = 'Transferring...';

    try {
        // Check if recipient exists
        const recipientSnapshot = await database.ref('users/' + recipientId).once('value');
        if (!recipientSnapshot.exists()) {
            showToast('Recipient ID not found.', 'error');
            return;
        }

        const updates = {};
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const transactionId = database.ref().child('transactions').push().key;

        // Sender updates
        updates[`users/${currentUser.uid}/balance`] = currentBalance - amount;
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'sent',
            to: recipientId,
            amount: amount,
            timestamp: timestamp,
            status: 'completed',
            details: `Transferred to ${recipientSnapshot.val().name || 'Unknown User'}`
        };

        // Recipient updates
        const recipientData = recipientSnapshot.val();
        updates[`users/${recipientId}/balance`] = (recipientData.balance || 0) + amount;
        updates[`users/${recipientId}/transactions/${transactionId}`] = {
            type: 'received',
            from: currentUser.uid,
            amount: amount,
            timestamp: timestamp,
            status: 'completed',
            details: `Received from ${userData.name || 'Unknown User'}`
        };

        // Global transaction record (optional, but good for admin overview)
        updates[`transactions/${transactionId}`] = {
            senderId: currentUser.uid,
            recipientId: recipientId,
            type: 'transfer',
            amount: amount,
            status: 'completed',
            timestamp: timestamp,
            details: `Transfer from ${currentUser.email} to ${recipientData.email || recipientId}`
        };

        await database.ref().update(updates);

        showToast(`Successfully transferred $${amount.toFixed(2)} to ${recipientData.name || recipientId}.`, 'success');

        // Clear form fields
        transferAmountInput.value = '';
        recipientIdInput.value = '';

        // Data will automatically refresh via loadUserData and loadTransactionHistory listeners
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Transfer failed: ' + error.message, 'error');
    } finally {
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = 'Transfer Funds';
    }
}


// Purchase investment package
async function purchasePackage(amount) {
    if (!currentUser) {
        showToast('Please log in to purchase a package.', 'error');
        window.location.href = 'login.html';
        return;
    }
    if (!userData) {
        showToast('User data not loaded. Please try again.', 'error');
        return;
    }

    const currentBalance = parseFloat(userData.balance || 0);

    if (amount <= 0 || isNaN(amount)) {
        showToast('Invalid package amount.', 'error');
        return;
    }

    if (amount > currentBalance) {
        showToast('Insufficient balance for this package.', 'error');
        return;
    }

    try {
        const updates = {};
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const packageId = database.ref().child('investments').push().key;
        const invoiceId = database.ref().child('invoices').push().key; // New invoice ID

        // Calculate profit distribution
        const adminCommission = amount * 0.10; // 10% to admin
        const referralCommissionsAllocation = amount * 0.10; // 10% for referral chain
        const tradingProfitAllocation = amount * 0.70; // 70% to trading pool
        const userImmediateProfit = amount * 0.10; // 10% immediate profit to user

        // 1. Update user balance (subtract investment, add immediate profit)
        updates[`users/${currentUser.uid}/balance`] = currentBalance - amount + userImmediateProfit;
        updates[`users/${currentUser.uid}/tradingProfit`] = (userData.tradingProfit || 0) + userImmediateProfit;

        // 2. Add investment record for the user
        updates[`users/${currentUser.uid}/investments/${packageId}`] = {
            amount: amount,
            purchaseDate: timestamp,
            status: 'active',
            expectedReturn: amount * 2, // Example: 2x return
            maturityDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days from now
        };

        // 3. Add transaction records for the user
        const investmentTxId = database.ref().child('transactions').push().key;
        updates[`users/${currentUser.uid}/transactions/${investmentTxId}`] = {
            type: 'investment_purchase',
            amount: -amount, // Negative for outflow
            status: 'completed',
            timestamp: timestamp,
            details: `Purchased $${amount} investment package`
        };

        const profitTxId = database.ref().child('transactions').push().key;
        updates[`users/${currentUser.uid}/transactions/${profitTxId}`] = {
            type: 'immediate_profit',
            amount: userImmediateProfit,
            status: 'completed',
            timestamp: timestamp,
            details: `Immediate profit from $${amount} package`
        };

        // 4. Generate invoice for the purchase
        updates[`users/${currentUser.uid}/invoices/${invoiceId}`] = {
            id: invoiceId,
            type: 'Investment Package Purchase',
            amount: amount,
            timestamp: timestamp,
            status: 'generated',
            packageId: packageId,
            details: `Invoice for purchase of $${amount} investment package.`
        };

        // 5. Distribute commissions to referral chain (5 levels)
        if (userData.referredBy) {
            await distributeReferralCommissions(userData.referredBy, referralCommissionsAllocation, 1, updates);
        }

        // 6. Add trading profit to system pool
        const tradingPoolRef = await database.ref('system/tradingPool').once('value');
        const currentPool = parseFloat(tradingPoolRef.val()) || 0;
        updates[`system/tradingPool`] = currentPool + tradingProfitAllocation;

        // 7. Credit admin commission
        const adminRef = await database.ref(`users/${ADMIN_USER_ID}`).once('value');
        const adminData = adminRef.val();
        const adminCurrentBalance = parseFloat(adminData?.balance || 0);
        updates[`users/${ADMIN_USER_ID}/balance`] = adminCurrentBalance + adminCommission;
        updates[`users/${ADMIN_USER_ID}/tradingProfit`] = (adminData?.tradingProfit || 0) + adminCommission; // Admin also gets trading profit portion

        // Record admin commission transaction
        const adminTxId = database.ref().child('transactions').push().key;
        updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
            type: 'admin_commission',
            amount: adminCommission,
            status: 'completed',
            timestamp: timestamp,
            details: `Commission from ${currentUser.email}'s package purchase`
        };

        // Update system admin earnings (for tracking)
        const adminEarningsRef = await database.ref('system/adminEarnings').once('value');
        const currentAdminEarnings = parseFloat(adminEarningsRef.val()) || 0;
        updates[`system/adminEarnings`] = currentAdminEarnings + adminCommission;

        // Execute all updates atomically
        await database.ref().update(updates);

        // 8. Distribute trading profit to all active users (after updating the pool)
        await distributeTradingProfit(tradingProfitAllocation);

        showToast(`Successfully purchased $${amount} package. You received $${userImmediateProfit.toFixed(2)} immediate profit!`, 'success');
        // No need to manually loadUserData and loadTransactionHistory here,
        // as the 'on' listener for loadUserData and loadTransactionHistory will handle updates.

    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package: ' + error.message, 'error');
    }
}

// Distribute trading profit equally among all active users (including admin)
async function distributeTradingProfit(totalProfit) {
    try {
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val();

        if (!users || totalProfit <= 0) return;

        // Filter users who are active (e.g., logged in within last 30 days or have active investments)
        // For simplicity, let's consider all users with a 'lastActive' timestamp within 30 days, plus the admin.
        const activeUsersUids = Object.keys(users).filter(uid => {
            const user = users[uid];
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            return (user.lastActive && user.lastActive > thirtyDaysAgo) || uid === ADMIN_USER_ID;
        });

        if (activeUsersUids.length === 0) return;

        const profitPerUser = totalProfit / activeUsersUids.length;
        const updates = {};
        const timestamp = firebase.database.ServerValue.TIMESTAMP;

        activeUsersUids.forEach(uid => {
            updates[`users/${uid}/tradingProfit`] = (users[uid].tradingProfit || 0) + profitPerUser;
            updates[`users/${uid}/balance`] = (users[uid].balance || 0) + profitPerUser; // Add to balance directly

            // Record profit transaction for each user
            const txId = database.ref().child('transactions').push().key;
            updates[`users/${uid}/transactions/${txId}`] = {
                type: 'trading_profit_distribution',
                amount: profitPerUser,
                status: 'completed',
                timestamp: timestamp,
                details: `Distributed trading profit from pool`
            };
        });

        // Clear the trading pool after distribution
        updates['system/tradingPool'] = 0;

        await database.ref().update(updates);
        console.log(`Trading profit of $${totalProfit.toFixed(2)} distributed among ${activeUsersUids.length} users.`);

    } catch (error) {
        console.error('Error distributing trading profit:', error);
    }
}

// Distribute referral commissions (recursive function for up to 5 levels)
async function distributeReferralCommissions(referrerId, initialAmount, currentLevel, updates) {
    if (currentLevel > 5 || !referrerId) return;

    // Commission percentage per level (example: 2% for each of 5 levels)
    const commissionRate = 0.02; // 2% of the initial package amount
    const commission = initialAmount * commissionRate;

    const referrerSnapshot = await database.ref(`users/${referrerId}`).once('value');
    const referrerData = referrerSnapshot.val();

    if (!referrerData) return; // Referrer does not exist

    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
    updates[`users/${referrerId}/balance`] = (referrerData.balance || 0) + commission; // Add commission to balance

    // Add transaction record for referrer
    const transactionId = database.ref().child('transactions').push().key;
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
        type: 'referral_commission',
        amount: commission,
        status: 'completed',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        details: `Level ${currentLevel} referral commission from new package purchase`
    };

    // Continue to next level if available
    if (referrerData.referredBy && currentLevel < 5) {
        await distributeReferralCommissions(referrerData.referredBy, initialAmount, currentLevel + 1, updates);
    }
}

// Set up event listeners for dashboard actions
function setupDashboardEventListeners() {
    // Package purchase buttons (assuming these are on index.html or packages.html)
    document.querySelectorAll('[data-package]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const packageAmount = parseFloat(btn.getAttribute('data-package'));
            purchasePackage(packageAmount);
        });
    });

    // Transfer button (assuming this is on transfer.html)
    const transferBtn = document.getElementById('submitTransfer');
    if (transferBtn) {
        transferBtn.addEventListener('click', transferFunds);
    }

    // You can add more event listeners here for other dashboard elements
    // For example, deposit, withdrawal buttons if they are on the dashboard
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const logoutLink = document.getElementById('logoutLink');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink'); // Assuming you have this ID for signup.html link

    if (logoutLink) logoutLink.style.display = 'block';
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const logoutLink = document.getElementById('logoutLink');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');

    if (logoutLink) logoutLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'block';
    if (signupLink) signupLink.style.display = 'block';
}

// Logout user
function logoutUser() {
    auth.signOut().then(() => {
        // Clear local storage data on logout
        localStorage.removeItem('userData');
        localStorage.removeItem('transactions');
        showToast('Successfully logged out.', 'success');
        window.location.href = 'login.html';
    }).catch((error) => {
        showToast('Error logging out: ' + error.message, 'error');
        console.error('Logout error:', error);
    });
}
