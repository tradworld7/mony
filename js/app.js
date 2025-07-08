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
    setupDashboardEventListeners(); // For package purchase and transfer button etc.
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

// Load data for side menu (always updates regardless of the current page)
function loadSideMenuData() {
    if (!currentUser || !userData) {
        // If userData is not yet loaded, try to load it
        if (currentUser && !userData) {
            loadUserData(currentUser.uid); // This will trigger a full data load
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

// Check user authentication state and load specific page data
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser();
            loadUserData(user.uid); // Load essential user data

            // Determine current page and load specific data
            const currentPage = window.location.pathname.split('/').pop(); // e.g., "index.html"

            switch (currentPage) {
                case 'index.html':
                    loadDashboardData(); // Loads main dashboard stats and recent transactions
                    break;
                case 'deposit.html':
                    setupDepositPage();
                    break;
                case 'withdrawal.html':
                    setupWithdrawalPage();
                    break;
                case 'transfer.html':
                    setupTransferPage();
                    break;
                case 'trading-history.html':
                    loadTradingHistory();
                    break;
                case 'profile.html':
                    loadProfileData();
                    break;
                case 'referral.html':
                    loadReferralProgramData();
                    break;
                case 'team-structure.html':
                    loadTeamStructureData();
                    break;
                case 'packages.html':
                    loadPackagesPage(); // Loads packages to purchase AND purchased packages
                    break;
                case 'invoices.html':
                    loadInvoicesPage();
                    break;
                // login.html and signup.html don't require user-specific data loading
            }

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

// Load essential user data from database and update dashboard cards (main listener)
function loadUserData(userId) {
    database.ref('users/' + userId).on('value', (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            // Update dashboard cards (if on index.html, handled by loadDashboardData, but here for general update)
            const userBalanceElement = document.getElementById('userBalance');
            if (userBalanceElement) userBalanceElement.textContent = `$${(userData.balance || 0).toFixed(2)}`;

            const tradingProfitElement = document.getElementById('tradingProfit');
            if (tradingProfitElement) tradingProfitElement.textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;

            const directReferralsElement = document.getElementById('directReferrals');
            const directRefCount = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
            if (directReferralsElement) directReferralsElement.textContent = directRefCount;

            const referralProfitElement = document.getElementById('referralProfit');
            if (referralProfitElement) referralProfitElement.textContent = `Earnings: $${(userData.referralEarnings || 0).toFixed(2)}`;

            const teamEarningsElement = document.getElementById('teamEarnings');
            if (teamEarningsElement) teamEarningsElement.textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;

            // Store user data locally
            localStorage.setItem('userData', JSON.stringify(userData));

            // Always update side menu after user data is loaded
            loadSideMenuData();

            // Update user's last active timestamp
            database.ref('users/' + currentUser.uid + '/lastActive').set(firebase.database.ServerValue.TIMESTAMP);

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

// --- Page Specific Data Loading and Logic ---

// For index.html (Dashboard Overview)
function loadDashboardData() {
    loadTransactionHistory(); // Loads and displays recent transactions on dashboard
    // Dashboard cards are updated by loadUserData, which is called on auth state change
}

// For deposit.html
function setupDepositPage() {
    // You'll need an input field for amount and a button on deposit.html
    const depositAmountInput = document.getElementById('depositAmount');
    const submitDepositBtn = document.getElementById('submitDeposit');

    if (submitDepositBtn) {
        submitDepositBtn.addEventListener('click', async () => {
            if (!currentUser || !userData) {
                showToast('Please log in to deposit.', 'error');
                return;
            }
            const amount = parseFloat(depositAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid amount.', 'error');
                return;
            }

            // Simulate a deposit process (e.g., via a payment gateway)
            // In a real app, this would involve server-side processing for security.
            // For now, we'll directly update the balance.
            try {
                const newBalance = (userData.balance || 0) + amount;
                const timestamp = firebase.database.ServerValue.TIMESTAMP;
                const transactionId = database.ref().child('transactions').push().key;

                const updates = {};
                updates[`users/${currentUser.uid}/balance`] = newBalance;
                updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
                    type: 'deposit',
                    amount: amount,
                    status: 'completed',
                    timestamp: timestamp,
                    details: `Deposited $${amount.toFixed(2)}`
                };

                await database.ref().update(updates);
                showToast(`Successfully deposited $${amount.toFixed(2)}.`, 'success');
                depositAmountInput.value = ''; // Clear input

            } catch (error) {
                console.error('Deposit error:', error);
                showToast('Deposit failed: ' + error.message, 'error');
            }
        });
    }
}

// For withdrawal.html
function setupWithdrawalPage() {
    // You'll need input fields for amount, withdrawal method, and a button on withdrawal.html
    const withdrawalAmountInput = document.getElementById('withdrawalAmount');
    const withdrawalMethodSelect = document.getElementById('withdrawalMethod'); // e.g., bank, crypto
    const withdrawalAddressInput = document.getElementById('withdrawalAddress'); // e.g., bank account number, wallet address
    const submitWithdrawalBtn = document.getElementById('submitWithdrawal');

    if (submitWithdrawalBtn) {
        submitWithdrawalBtn.addEventListener('click', async () => {
            if (!currentUser || !userData) {
                showToast('Please log in to withdraw.', 'error');
                return;
            }
            const amount = parseFloat(withdrawalAmountInput.value);
            const method = withdrawalMethodSelect.value;
            const address = withdrawalAddressInput.value.trim();
            const currentBalance = parseFloat(userData.balance || 0);

            if (isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid amount.', 'error');
                return;
            }
            if (amount > currentBalance) {
                showToast('Insufficient balance for withdrawal.', 'error');
                return;
            }
            if (!method || !address) {
                showToast('Please select a withdrawal method and provide details.', 'error');
                return;
            }

            try {
                // In a real app, withdrawals would be pending and require admin approval.
                // For this example, we'll mark them as pending.
                const newBalance = currentBalance - amount;
                const timestamp = firebase.database.ServerValue.TIMESTAMP;
                const transactionId = database.ref().child('transactions').push().key;

                const updates = {};
                updates[`users/${currentUser.uid}/balance`] = newBalance;
                updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
                    type: 'withdrawal',
                    amount: amount,
                    method: method,
                    address: address,
                    status: 'pending', // Important: Withdrawals are usually pending
                    timestamp: timestamp,
                    details: `Withdrawal request of $${amount.toFixed(2)} via ${method}`
                };

                // Optionally, add a record for admin to review
                updates[`withdrawalRequests/${transactionId}`] = {
                    userId: currentUser.uid,
                    amount: amount,
                    method: method,
                    address: address,
                    status: 'pending',
                    timestamp: timestamp,
                    userName: userData.name || currentUser.email
                };


                await database.ref().update(updates);
                showToast(`Withdrawal request of $${amount.toFixed(2)} submitted. Status: Pending.`, 'info');
                withdrawalAmountInput.value = '';
                withdrawalAddressInput.value = '';

            } catch (error) {
                console.error('Withdrawal error:', error);
                showToast('Withdrawal failed: ' + error.message, 'error');
            }
        });
    }
}

// For transfer.html
function setupTransferPage() {
    const transferBtn = document.getElementById('submitTransfer');
    if (transferBtn) {
        transferBtn.addEventListener('click', transferFunds);
    }
}

// Transfer funds function (retained from previous update)
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

        await database.ref().update(updates);

        showToast(`Successfully transferred $${amount.toFixed(2)} to ${recipientData.name || recipientId}.`, 'success');

        // Clear form fields
        transferAmountInput.value = '';
        recipientIdInput.value = '';

    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Transfer failed: ' + error.message, 'error');
    } finally {
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = 'Transfer Funds';
    }
}


// For trading-history.html
function loadTradingHistory() {
    if (!currentUser) return;

    const tradingHistoryTableBody = document.getElementById('tradingHistoryTableBody');
    if (!tradingHistoryTableBody) return;

    database.ref('users/' + currentUser.uid + '/transactions')
        .orderByChild('timestamp')
        .on('value', (snapshot) => {
            const allTransactions = snapshot.val();
            const tradingTransactions = [];

            if (allTransactions) {
                // Filter for trading-related transactions
                Object.values(allTransactions).forEach(tx => {
                    if (tx.type === 'trading_profit_distribution' || tx.type === 'immediate_profit') {
                        tradingTransactions.push(tx);
                    }
                });
                tradingTransactions.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent
            }

            if (tradingTransactions.length === 0) {
                tradingHistoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No trading history yet.</td></tr>';
                return;
            }

            tradingHistoryTableBody.innerHTML = ''; // Clear previous entries
            tradingTransactions.forEach(tx => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(tx.timestamp)}</td>
                    <td>${tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td>$${(tx.amount || 0).toFixed(2)}</td>
                    <td>${tx.details || 'N/A'}</td>
                `;
                tradingHistoryTableBody.appendChild(row);
            });
        }, (error) => {
            console.error('Error loading trading history:', error);
            showToast('Error loading trading history.', 'error');
        });
}

// For profile.html
function loadProfileData() {
    if (!currentUser || !userData) {
        showToast('User data not available. Please log in.', 'error');
        return;
    }

    // Assume you have elements like these on profile.html
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileUserId = document.getElementById('profileUserId');
    const profileReferralCode = document.getElementById('profileReferralCode');
    const profileBalance = document.getElementById('profileBalance');
    const profileJoinDate = document.getElementById('profileJoinDate');

    if (profileName) profileName.textContent = userData.name || 'Not Set';
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileUserId) profileUserId.textContent = currentUser.uid;
    if (profileReferralCode) profileReferralCode.textContent = userData.referralCode || 'Generate one!'; // You might have a way to generate this
    if (profileBalance) profileBalance.textContent = `$${(userData.balance || 0).toFixed(2)}`;
    if (profileJoinDate) profileJoinDate.textContent = formatDate(userData.joinDate || currentUser.metadata.creationTime);

    // If there's a form to update profile, set it up
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        const inputName = document.getElementById('inputName');
        if (inputName) inputName.value = userData.name || '';

        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = inputName.value.trim();
            if (!newName) {
                showToast('Name cannot be empty.', 'error');
                return;
            }
            try {
                await database.ref('users/' + currentUser.uid + '/name').set(newName);
                showToast('Profile updated successfully!', 'success');
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Failed to update profile: ' + error.message, 'error');
            }
        });
    }
}

// For referral.html
function loadReferralProgramData() {
    if (!currentUser || !userData) {
        showToast('User data not available. Please log in.', 'error');
        return;
    }

    const referralLinkElement = document.getElementById('referralLink');
    const directReferralsCountElement = document.getElementById('directReferralsCount'); // On referral.html
    const referralEarningsElement = document.getElementById('referralEarnings'); // On referral.html
    const copyReferralLinkBtn = document.getElementById('copyReferralLink');

    const userReferralCode = userData.referralCode || currentUser.uid; // Use UID if no custom code
    const referralLink = `${window.location.origin}/signup.html?ref=${userReferralCode}`;

    if (referralLinkElement) referralLinkElement.value = referralLink;
    if (directReferralsCountElement) directReferralsCountElement.textContent = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
    if (referralEarningsElement) referralEarningsElement.textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;

    if (copyReferralLinkBtn) {
        copyReferralLinkBtn.addEventListener('click', () => {
            if (referralLinkElement) {
                referralLinkElement.select();
                document.execCommand('copy');
                showToast('Referral link copied to clipboard!', 'success');
            }
        });
    }

    // Display direct referrals details
    const directReferralsList = document.getElementById('directReferralsList');
    if (directReferralsList && userData.directReferrals) {
        directReferralsList.innerHTML = ''; // Clear previous entries
        Object.entries(userData.directReferrals).forEach(([uid, refData]) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item'; // Assuming Bootstrap list styling
            listItem.innerHTML = `
                <strong>${refData.name || 'User'}</strong> (${refData.email || 'N/A'}) - Joined: ${formatDateShort(refData.joinDate)}
                <span class="badge badge-primary float-right">Earnings: $${(refData.earnings || 0).toFixed(2)}</span>
            `;
            directReferralsList.appendChild(listItem);
        });
        if (Object.keys(userData.directReferrals).length === 0) {
            directReferralsList.innerHTML = '<p class="text-center">No direct referrals yet. Share your link!</p>';
        }
    }
}

// For team-structure.html
function loadTeamStructureData() {
    if (!currentUser || !userData) {
        showToast('User data not available. Please log in.', 'error');
        return;
    }

    const totalTeamEarningsElement = document.getElementById('totalTeamEarningsDisplay'); // On team-structure.html
    const teamStructureList = document.getElementById('teamStructureList'); // This is the UL/DIV for team members

    if (totalTeamEarningsElement) totalTeamEarningsElement.textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;

    if (teamStructureList) {
        teamStructureList.innerHTML = ''; // Clear previous entries

        if (!userData.directReferrals || Object.keys(userData.directReferrals).length === 0) {
            teamStructureList.innerHTML = '<p class="text-center">Your team is empty. Invite members to grow it!</p>';
            return;
        }

        // Fetch details for all direct referrals and then recursively for their teams
        const fetchTeamRecursive = async (userId, level = 1) => {
            const userSnap = await database.ref(`users/${userId}`).once('value');
            const user = userSnap.val();
            if (!user) return;

            const memberItem = document.createElement('li');
            memberItem.className = `team-member-item level-${level}`;
            memberItem.innerHTML = `
                <div class="member-details">
                    <span class="member-name">${user.name || 'N/A'}</span>
                    <span class="member-email">${user.email || 'N/A'}</span>
                    <span class="member-id">ID: ${userId.substring(0, 8)}...</span>
                </div>
                <div class="member-stats">
                    <span class="member-level">Level ${level}</span>
                    <span class="member-join-date">Joined: ${formatDateShort(user.joinDate || user.metadata?.creationTime)}</span>
                    <span class="member-earning">Team Earnings: $${(user.teamEarnings || 0).toFixed(2)}</span>
                    <span class="member-referral-earnings">Referral Earnings: $${(user.referralEarnings || 0).toFixed(2)}</span>
                </div>
            `;
            teamStructureList.appendChild(memberItem);

            if (user.directReferrals && level < 5) { // Limit depth to avoid infinite loops and too many reads
                for (const refId of Object.keys(user.directReferrals)) {
                    await fetchTeamRecursive(refId, level + 1);
                }
            }
        };

        // Start fetching from the current user's direct referrals
        for (const directRefId of Object.keys(userData.directReferrals)) {
            fetchTeamRecursive(directRefId);
        }
    }
}

// For packages.html
function loadPackagesPage() {
    // This function will display both available packages to buy and user's purchased packages.
    if (!currentUser) return;

    // Display available packages (static content or from Firebase if you have dynamic packages)
    // Assuming you have HTML elements with data-package for purchase buttons
    setupDashboardEventListeners(); // Re-attaches purchase listeners if needed

    // Display user's purchased packages (re-using displayInvestmentPackages)
    const userInvestmentPackagesContainer = document.getElementById('userInvestmentPackages');
    if (userInvestmentPackagesContainer && userData?.investments) {
        displayInvestmentPackages(userData.investments);
    } else if (userInvestmentPackagesContainer) {
        userInvestmentPackagesContainer.innerHTML = '<p class="text-center">You have not purchased any investment packages yet.</p>';
    }
}

// Display investment packages (for packages.html)
function displayInvestmentPackages(investments) {
    const packagesContainer = document.getElementById('userInvestmentPackages');
    if (!packagesContainer) return;

    packagesContainer.innerHTML = '';

    if (!investments || Object.keys(investments).length === 0) {
        packagesContainer.innerHTML = '<p class="text-center">You have no active investment packages.</p>';
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

// For invoices.html
function loadInvoicesPage() {
    if (!currentUser) return;

    const invoicesTableBody = document.getElementById('invoicesTableBody');
    if (!invoicesTableBody) return;

    database.ref('users/' + currentUser.uid + '/invoices')
        .orderByChild('timestamp')
        .on('value', (snapshot) => {
            const invoices = snapshot.val();
            displayInvoices(invoices);
        }, (error) => {
            console.error('Error loading invoices:', error);
            showToast('Error loading invoices.', 'error');
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

// Load transaction history for main dashboard table and side menu (generalized)
function loadTransactionHistory() {
    if (!currentUser) return;

    const transactionRef = database.ref('users/' + currentUser.uid + '/transactions').orderByChild('timestamp');

    transactionRef.on('value', (snapshot) => {
        const transactions = snapshot.val();
        if (transactions) {
            const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
            transactionsArray.sort((a, b) => b.timestamp - a.timestamp); // Sort descending

            // Update main transaction history table (if it exists on the current page)
            const mainTransactionTableBody = document.getElementById('transactionHistory');
            if (mainTransactionTableBody) {
                displayTransactions(transactionsArray, mainTransactionTableBody);
            }

            // Update side menu transactions
            updateSideMenuTransactions(transactionsArray);
        } else {
            // No transactions
            const mainTransactionTableBody = document.getElementById('transactionHistory');
            if (mainTransactionTableBody) {
                mainTransactionTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
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

// Display transactions in a given table body
function displayTransactions(transactionsArray, tbodyElement) {
    if (!tbodyElement) return;

    tbodyElement.innerHTML = '';

    if (!transactionsArray || transactionsArray.length === 0) {
        tbodyElement.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
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
        tbodyElement.appendChild(row);
    });
}


// Update transactions in side menu
function updateSideMenuTransactions(transactionsArray) {
    const sideMenuTxList = document.getElementById('sideMenuTransactions');
    if (!sideMenuTxList) return;

    sideMenuTxList.innerHTML = '';

    if (!transactionsArray || transactionsArray.length === 0) {
        sideMenuTxList.innerHTML = '<li>No transactions yet</li>';
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


// Purchase investment package (retained)
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
        const invoiceId = database.ref().child('invoices').push().key;

        // Calculate profit distribution
        const adminCommission = amount * 0.10;
        const referralCommissionsAllocation = amount * 0.10;
        const tradingProfitAllocation = amount * 0.70;
        const userImmediateProfit = amount * 0.10;

        // 1. Update user balance (subtract investment, add immediate profit)
        updates[`users/${currentUser.uid}/balance`] = currentBalance - amount + userImmediateProfit;
        updates[`users/${currentUser.uid}/tradingProfit`] = (userData.tradingProfit || 0) + userImmediateProfit;

        // 2. Add investment record for the user
        updates[`users/${currentUser.uid}/investments/${packageId}`] = {
            amount: amount,
            purchaseDate: timestamp,
            status: 'active',
            expectedReturn: amount * 2,
            maturityDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
        };

        // 3. Add transaction records for the user
        const investmentTxId = database.ref().child('transactions').push().key;
        updates[`users/${currentUser.uid}/transactions/${investmentTxId}`] = {
            type: 'investment_purchase',
            amount: -amount,
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
        updates[`users/${ADMIN_USER_ID}/tradingProfit`] = (adminData?.tradingProfit || 0) + adminCommission;

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

    } catch (error) {
        console.error('Package purchase error:', error);
        showToast('Failed to purchase package: ' + error.message, 'error');
    }
}

// Distribute trading profit equally among all active users (including admin) (retained)
async function distributeTradingProfit(totalProfit) {
    try {
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val();

        if (!users || totalProfit <= 0) return;

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
            updates[`users/${uid}/balance`] = (users[uid].balance || 0) + profitPerUser;

            const txId = database.ref().child('transactions').push().key;
            updates[`users/${uid}/transactions/${txId}`] = {
                type: 'trading_profit_distribution',
                amount: profitPerUser,
                status: 'completed',
                timestamp: timestamp,
                details: `Distributed trading profit from pool`
            };
        });

        updates['system/tradingPool'] = 0;

        await database.ref().update(updates);
        console.log(`Trading profit of $${totalProfit.toFixed(2)} distributed among ${activeUsersUids.length} users.`);

    } catch (error) {
        console.error('Error distributing trading profit:', error);
    }
}

// Distribute referral commissions (recursive function for up to 5 levels) (retained)
async function distributeReferralCommissions(referrerId, initialAmount, currentLevel, updates) {
    if (currentLevel > 5 || !referrerId) return;

    const commissionRate = 0.02;
    const commission = initialAmount * commissionRate;

    const referrerSnapshot = await database.ref(`users/${referrerId}`).once('value');
    const referrerData = referrerSnapshot.val();

    if (!referrerData) return;

    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
    updates[`users/${referrerId}/balance`] = (referrerData.balance || 0) + commission;

    const transactionId = database.ref().child('transactions').push().key;
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
        type: 'referral_commission',
        amount: commission,
        status: 'completed',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        details: `Level ${currentLevel} referral commission from new package purchase`
    };

    if (referrerData.referredBy && currentLevel < 5) {
        await distributeReferralCommissions(referrerData.referredBy, initialAmount, currentLevel + 1, updates);
    }
}

// Set up event listeners for dashboard actions (retained for purchase buttons)
function setupDashboardEventListeners() {
    document.querySelectorAll('[data-package]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const packageAmount = parseFloat(btn.getAttribute('data-package'));
            purchasePackage(packageAmount);
        });
    });
    // The transfer button listener is now in setupTransferPage
}

// Update UI for logged in user (retained)
function updateUIForLoggedInUser() {
    const logoutLink = document.getElementById('logoutLink');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');

    if (logoutLink) logoutLink.style.display = 'block';
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';
}

// Update UI for logged out user (retained)
function updateUIForLoggedOutUser() {
    const logoutLink = document.getElementById('logoutLink');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');

    if (logoutLink) logoutLink.style.display = 'none';
    if (loginLink) loginLink.style.display = 'block';
    if (signupLink) signupLink.style.display = 'block';
}

// Logout user (retained)
function logoutUser() {
    auth.signOut().then(() => {
        localStorage.removeItem('userData');
        localStorage.removeItem('transactions');
        showToast('Successfully logged out.', 'success');
        window.location.href = 'login.html';
    }).catch((error) => {
        showToast('Error logging out: ' + error.message, 'error');
        console.error('Logout error:', error);
    });
}
