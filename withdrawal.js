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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let currentUser = null;
let userData = null;

// Initialize the withdrawal page
document.addEventListener('DOMContentLoaded', function() {
    // Check auth state
    checkAuthState();
    
    // Set up event listeners
    setupWithdrawalEventListeners();
});

// Check user authentication state
function checkAuthState() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            loadUserData(user.uid);
            loadWithdrawalHistory(user.uid);
        } else {
            // User is signed out
            window.location.href = 'login.html';
        }
    });
}

// Load user data from database
function loadUserData(userId) {
    database.ref('users/' + userId).on('value', (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            // Update available balances
            const tradingProfit = userData.tradingProfit || 0;
            const referralEarnings = userData.referralEarnings || 0;
            const totalBalance = tradingProfit + referralEarnings;
            
            document.getElementById('availableTradingProfit').textContent = 
                `$${tradingProfit.toFixed(2)}`;
            document.getElementById('availableReferralProfit').textContent = 
                `$${referralEarnings.toFixed(2)}`;
            document.getElementById('totalBalance').textContent = 
                `$${totalBalance.toFixed(2)}`;
        }
    }, (error) => {
        showToast('Error loading user data', 'error');
        console.error('Error loading user data:', error);
    });
}

// Load withdrawal history
function loadWithdrawalHistory(userId) {
    database.ref('withdrawals/' + userId).orderByChild('timestamp').limitToLast(10).once('value').then((snapshot) => {
        const withdrawals = snapshot.val();
        const tbody = document.getElementById('withdrawalHistory');
        tbody.innerHTML = '';
        
        if (!withdrawals || Object.keys(withdrawals).length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No withdrawal history found</td></tr>';
            return;
        }
        
        // Convert to array and sort by timestamp (newest first)
        const withdrawalsArray = Object.entries(withdrawals).map(([id, wd]) => ({ id, ...wd }));
        withdrawalsArray.sort((a, b) => b.timestamp - a.timestamp);
        
        withdrawalsArray.forEach(wd => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(wd.timestamp)}</td>
                <td>$${wd.amount?.toFixed(2) || '0.00'}</td>
                <td>${wd.type === 'trading' ? 'Trading Profit' : 'Referral Profit'}</td>
                <td>${wd.walletAddress || ''}</td>
                <td class="status-${wd.status || 'pending'}">${formatStatus(wd.status)}</td>
            `;
            tbody.appendChild(row);
        });
    }).catch((error) => {
        showToast('Error loading withdrawal history', 'error');
        console.error('Error loading withdrawal history:', error);
    });
}

// Format timestamp
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Format status
function formatStatus(status) {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Set up event listeners
function setupWithdrawalEventListeners() {
    // Withdrawal type change
    document.getElementById('withdrawalType').addEventListener('change', updateWithdrawalMinAmount);
    
    // Submit withdrawal
    document.getElementById('submitWithdrawal').addEventListener('click', submitWithdrawalRequest);
    
    // Logout
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });
    
    // Menu toggle for mobile
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

// Update minimum withdrawal amount based on type
function updateWithdrawalMinAmount() {
    const type = document.getElementById('withdrawalType').value;
    if (type === 'trading') {
        document.getElementById('withdrawalMinAmount').textContent = 'Minimum withdrawal: $20 for trading profit';
    } else {
        document.getElementById('withdrawalMinAmount').textContent = 'Minimum withdrawal: $10 for referral profit';
    }
}

// Submit withdrawal request
async function submitWithdrawalRequest() {
    const type = document.getElementById('withdrawalType').value;
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const walletAddress = document.getElementById('walletAddress').value.trim();
    
    // Validation
    if (!walletAddress) {
        showToast('Please enter your USDT BEP20 wallet address', 'error');
        return;
    }
    
    if (isNaN(amount) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    // Check minimum amount based on type
    const minAmount = type === 'trading' ? 20 : 10;
    if (amount < minAmount) {
        showToast(`Minimum withdrawal amount is $${minAmount}`, 'error');
        return;
    }
    
    // Check available balance
    const availableBalance = type === 'trading' ? 
        (userData?.tradingProfit || 0) : 
        (userData?.referralEarnings || 0);
    
    if (amount > availableBalance) {
        showToast('Insufficient balance for this withdrawal', 'error');
        return;
    }
    
    try {
        // Create withdrawal record
        const withdrawalId = database.ref().child('withdrawals').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const withdrawalData = {
            userId: currentUser.uid,
            type: type,
            amount: amount,
            walletAddress: walletAddress,
            status: 'pending',
            timestamp: timestamp
        };
        
        // Update user's balance
        const updates = {};
        updates[`withdrawals/${currentUser.uid}/${withdrawalId}`] = withdrawalData;
        
        if (type === 'trading') {
            updates[`users/${currentUser.uid}/tradingProfit`] = (userData.tradingProfit || 0) - amount;
        } else {
            updates[`users/${currentUser.uid}/referralEarnings`] = (userData.referralEarnings || 0) - amount;
        }
        
        // Execute all updates atomically
        await database.ref().update(updates);
        
        showToast('Withdrawal request submitted successfully', 'success');
        
        // Clear form
        document.getElementById('withdrawalAmount').value = '';
        document.getElementById('walletAddress').value = '';
        
        // Refresh data
        loadUserData(currentUser.uid);
        loadWithdrawalHistory(currentUser.uid);
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        showToast('Withdrawal failed: ' + error.message, 'error');
    }
}

// Logout user
function logoutUser() {
    firebase.auth().signOut().then(() => {
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