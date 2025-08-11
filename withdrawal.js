// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    push, 
    update,
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
            
            // Update user avatar
            updateUserAvatar(user.email || 'User');
        } else {
            window.location.href = 'login.html';
        }
    });
    
    // Setup withdrawal type change
    document.getElementById('withdrawalType').addEventListener('change', function() {
        updateMinAmountText();
    });
    
    // Setup withdrawal button
    document.getElementById('submitWithdrawal').addEventListener('click', async function() {
        const btn = document.getElementById('submitWithdrawal');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Processing...';
        
        await processWithdrawal();
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Withdrawal';
    });
    
    // Setup logout
    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });
});

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

// Update minimum amount text based on withdrawal type
function updateMinAmountText() {
    const type = document.getElementById('withdrawalType').value;
    const minAmountText = document.getElementById('minAmountText');
    
    if (type === 'trading') {
        minAmountText.textContent = 'Minimum withdrawal: $20 for Trading Profit';
    } else if (type === 'referral') {
        minAmountText.textContent = 'Minimum withdrawal: $10 for Referral Profit';
    } else if (type === 'team') {
        minAmountText.textContent = 'Minimum withdrawal: $10 for Team Earnings';
    }
}

// Load user data from Firebase
function loadUserData(userId) {
    const userRef = ref(database, 'users/' + userId);
    
    onValue(userRef, (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            updateWithdrawalUI(userData);
            loadWithdrawalHistory(userId);
        }
    }, (error) => {
        console.error("Error loading user data:", error);
        showToast('Error loading user data', 'error');
    });
}

// Update withdrawal UI with user data
function updateWithdrawalUI(data) {
    if (!data) return;
    
    // Update trading profit
    document.getElementById('availableTradingProfit').textContent = `$${(data.tradingProfit || 0).toFixed(2)}`;
    
    // Update referral profit
    document.getElementById('availableReferralProfit').textContent = `$${(data.referralEarnings || 0).toFixed(2)}`;
    
    // Update team earnings
    document.getElementById('availableTeamEarnings').textContent = `$${(data.teamEarnings || 0).toFixed(2)}`;
    
    // Update total balance
    const totalBalance = (data.tradingProfit || 0) + (data.referralEarnings || 0) + (data.teamEarnings || 0);
    document.getElementById('totalBalance').textContent = `$${totalBalance.toFixed(2)}`;
}

// Load withdrawal history with real-time status updates
function loadWithdrawalHistory(userId) {
    const withdrawalsRef = ref(database, `withdrawals`);
    
    onValue(withdrawalsRef, (snapshot) => {
        const allWithdrawals = snapshot.val();
        const tbody = document.getElementById('withdrawalHistory');
        tbody.innerHTML = '';
        
        if (!allWithdrawals) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No withdrawals yet</td></tr>';
            return;
        }
        
        // Filter withdrawals for this user
        const userWithdrawals = Object.entries(allWithdrawals)
            .filter(([id, wd]) => wd.userId === userId)
            .map(([id, wd]) => ({ id, ...wd }));
        
        if (userWithdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No withdrawals yet</td></tr>';
            return;
        }
        
        // Sort by timestamp (newest first)
        userWithdrawals.sort((a, b) => b.timestamp - a.timestamp);
        
        // Display all withdrawals with real-time status
        userWithdrawals.forEach(wd => {
            const row = document.createElement('tr');
            
            const date = new Date(wd.timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let type = '';
            if (wd.type === 'trading') type = 'Trading Profit';
            else if (wd.type === 'referral') type = 'Referral Profit';
            else if (wd.type === 'team') type = 'Team Earnings';
            
            const amount = `$${wd.amount.toFixed(2)}`;
            const status = wd.status.charAt(0).toUpperCase() + wd.status.slice(1);
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${type}</td>
                <td>${amount}</td>
                <td>${wd.walletAddress || 'N/A'}</td>
                <td><span class="badge status-${wd.status}">${status}</span></td>
            `;
            
            tbody.appendChild(row);
        });
    });
}

// Process withdrawal request with immediate balance deduction
async function processWithdrawal() {
    if (!currentUser || !userData) {
        showToast('Please login first', 'error');
        return false;
    }
    
    const type = document.getElementById('withdrawalType').value;
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const walletAddress = document.getElementById('walletAddress').value.trim();
    
    // Validate inputs
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return false;
    }
    
    if (!walletAddress) {
        showToast('Please enter your wallet address', 'error');
        return false;
    }
    
    // Check minimum amount based on type
    if (type === 'trading' && amount < 20) {
        showToast('Minimum withdrawal for trading profit is $20', 'error');
        return false;
    }
    
    if ((type === 'referral' || type === 'team') && amount < 10) {
        showToast(`Minimum withdrawal for ${type} profit is $10`, 'error');
        return false;
    }
    
    // Check available balance
    let availableBalance = 0;
    let balanceField = '';
    
    if (type === 'trading') {
        availableBalance = userData.tradingProfit || 0;
        balanceField = 'tradingProfit';
    } else if (type === 'referral') {
        availableBalance = userData.referralEarnings || 0;
        balanceField = 'referralEarnings';
    } else if (type === 'team') {
        availableBalance = userData.teamEarnings || 0;
        balanceField = 'teamEarnings';
    }
    
    if (amount > availableBalance) {
        showToast('Insufficient balance for this withdrawal', 'error');
        return false;
    }
    
    try {
        // Create withdrawal record
        const withdrawalId = push(ref(database, 'withdrawals')).key;
        const timestamp = Date.now();
        
        const withdrawalData = {
            id: withdrawalId,
            userId: currentUser.uid,
            type: type,
            amount: amount,
            walletAddress: walletAddress,
            status: 'pending',
            timestamp: timestamp,
            name: userData.name || 'User',
            email: currentUser.email || '',
            approvedAt: null,
            rejectedAt: null
        };
        
        // Prepare updates
        const updates = {};
        
        // Add to global withdrawals
        updates[`withdrawals/${withdrawalId}`] = withdrawalData;
        
        // Add to user's withdrawals
        updates[`users/${currentUser.uid}/withdrawals/${withdrawalId}`] = withdrawalData;
        
        // Add to admin's pending withdrawals
        updates[`admin/pendingWithdrawals/${withdrawalId}`] = withdrawalData;
        
        // Update the correct balance based on withdrawal type
        updates[`users/${currentUser.uid}/${balanceField}`] = availableBalance - amount;
        
        // Add transaction record
        const transactionId = push(ref(database, 'transactions')).key;
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'withdrawal',
            amount: amount,
            status: 'pending',
            timestamp: timestamp,
            details: `Withdrawal request for ${type}`
        };
        
        // Execute all updates atomically
        await update(ref(database), updates);
        
        // Clear form
        document.getElementById('withdrawalAmount').value = '';
        document.getElementById('walletAddress').value = '';
        
        showToast('Withdrawal request submitted successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        showToast('Failed to process withdrawal', 'error');
        return false;
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