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
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const logoutLink = document.getElementById('logoutLink');
const submitTransferBtn = document.getElementById('submitTransfer');
const recipientIdInput = document.getElementById('recipientId');
const transferAmountInput = document.getElementById('transferAmount');
const currentBalanceSpan = document.getElementById('currentBalance');
const toastContainer = document.getElementById('toastContainer');

// Current user and data
let currentUser = null;
let userData = null;

// Helper function for showing toasts
function showToast(message, type) {
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

// Menu toggle for mobile
if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// Close mobile menu when a navigation link is clicked
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    });
});

// Logout user
if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            showToast('Successfully logged out.', 'success');
            window.location.href = 'login.html';
        }).catch((error) => {
            showToast('Error logging out: ' + error.message, 'error');
            console.error('Logout error:', error);
        });
    });
}

// Transfer funds function
async function transferFunds() {
    if (!currentUser) {
        showToast('Please log in to transfer funds.', 'error');
        window.location.href = 'login.html';
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
    if (isNaN(amount)) {
        showToast('Please enter a valid amount.', 'error');
        return;
    }
    if (amount <= 0) {
        showToast('Amount must be greater than zero.', 'error');
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
    submitTransferBtn.textContent = 'Processing...';

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

        // Refresh user data
        loadUserData(currentUser.uid);

    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Transfer failed: ' + error.message, 'error');
    } finally {
        submitTransferBtn.disabled = false;
        submitTransferBtn.textContent = 'Transfer Funds';
    }
}

// Load user data
function loadUserData(userId) {
    database.ref('users/' + userId).on('value', (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            // Update balance display
            currentBalanceSpan.textContent = `$${(userData.balance || 0).toFixed(2)}`;
        }
    }, (error) => {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    });
}

// Check auth state
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

// Event listeners
if (submitTransferBtn) {
    submitTransferBtn.addEventListener('click', transferFunds);
}

// Prevent form submission on enter key
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
});