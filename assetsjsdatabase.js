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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Current user data
let currentUser = null;
let userData = null;

// Load user data from Firebase
function loadUserData(userId) {
    return new Promise((resolve, reject) => {
        database.ref('users/' + userId).on('value', snapshot => {
            userData = snapshot.val();
            if (userData) {
                updateUIWithUserData();
                resolve(userData);
            } else {
                reject(new Error('User data not found'));
            }
        }, error => {
            showToast('Error loading user data: ' + error.message, 'error');
            reject(error);
        });
    });
}

// Update UI with user data
function updateUIWithUserData() {
    if (!userData || !currentUser) return;

    // Helper function to safely update element
    const updateElement = (id, value, prefix = '', suffix = '') => {
        const element = document.getElementById(id);
        if (element) element.textContent = prefix + value + suffix;
    };

    // Dashboard updates
    updateElement('userBalance', (userData.balance || 0).toFixed(2), '$');
    updateElement('tradingProfit', (userData.tradingProfit || 0).toFixed(2), '$');
    updateElement('directReferrals', userData.directReferrals ? Object.keys(userData.directReferrals).length : 0);
    updateElement('referralProfit', (userData.referralProfit || 0).toFixed(2), 'Earnings: $');
    updateElement('teamEarnings', (userData.teamEarnings || 0).toFixed(2), '$');

    // Profile updates
    const profileElements = {
        'fullName': userData.name || '',
        'userEmail': currentUser.email || '',
        'mobileNumber': userData.mobile || '',
        'userId': currentUser.uid,
        'accountCreated': new Date(currentUser.metadata.creationTime).toLocaleString()
    };

    for (const [id, value] of Object.entries(profileElements)) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    }

    // Withdrawal updates
    updateElement('availableTradingProfit', (userData.availableTradingProfit || 0).toFixed(2), '$');
    updateElement('availableReferralProfit', (userData.availableReferralProfit || 0).toFixed(2), '$');

    // Update history tables if they exist
    if (userData.withdrawals) updateHistoryTable('withdrawalHistory', userData.withdrawals, formatWithdrawal);
    if (userData.directReferrals) updateHistoryTable('referralList', userData.directReferrals, formatReferral);
    if (userData.trades) updateHistoryTable('tradingHistoryList', userData.trades, formatTrade);
    if (userData.teamStructure) updateTeamStructure(userData.teamStructure);
}

// Generic function to update history tables
function updateHistoryTable(tableId, data, formatter) {
    const table = document.getElementById(tableId);
    if (!table) return;

    // Clear existing rows (except header)
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    // Add new rows
    Object.entries(data).forEach(([key, item]) => {
        const row = table.insertRow();
        formatter(row, key, item);
    });
}

// Format withdrawal row
function formatWithdrawal(row, key, withdrawal) {
    const cells = [
        new Date(withdrawal.timestamp).toLocaleString(),
        '$' + withdrawal.amount.toFixed(2),
        withdrawal.type === 'trading' ? 'Trading Profit' : 'Referral Profit',
        withdrawal.walletAddress ? withdrawal.walletAddress.substring(0, 6) + '...' + withdrawal.walletAddress.slice(-4) : 'N/A',
        withdrawal.status
    ];

    cells.forEach((text, index) => {
        const cell = row.insertCell();
        if (index === 4) { // Status cell
            const badge = document.createElement('span');
            badge.className = `badge ${withdrawal.status === 'completed' ? 'badge-success' : 
                              withdrawal.status === 'pending' ? 'badge-warning' : 'badge-danger'}`;
            badge.textContent = withdrawal.status;
            cell.appendChild(badge);
        } else {
            cell.textContent = text;
        }
    });
}

// Format referral row
function formatReferral(row, key, referral) {
    const cells = [
        referral.name || 'Unknown',
        new Date(referral.joinDate).toLocaleDateString(),
        referral.investment > 0 ? 'Active' : 'Inactive',
        '$' + (referral.investment || 0).toFixed(2),
        '$' + (referral.earnings || 0).toFixed(2)
    ];

    cells.forEach((text, index) => {
        const cell = row.insertCell();
        if (index === 2) { // Status cell
            const badge = document.createElement('span');
            badge.className = `badge ${referral.investment > 0 ? 'badge-success' : 'badge-warning'}`;
            badge.textContent = text;
            cell.appendChild(badge);
        } else {
            cell.textContent = text;
        }
    });
}

// Format trade row
function formatTrade(row, key, trade) {
    const currentValue = trade.currentValue || trade.amount * 2;
    const profit = currentValue - trade.amount;
    const profitPercent = (profit / trade.amount) * 100;
    
    const cells = [
        key.substring(0, 8),
        new Date(trade.timestamp).toLocaleDateString(),
        '$' + trade.amount.toFixed(2),
        '$' + currentValue.toFixed(2),
        '$' + profit.toFixed(2) + ' (' + profitPercent.toFixed(2) + '%)',
        trade.status === 'completed' ? 'Completed' : 'Active'
    ];

    cells.forEach((text, index) => {
        const cell = row.insertCell();
        if (index === 4) { // Profit cell
            cell.className = profit >= 0 ? 'profit' : 'loss';
            cell.textContent = text;
        } else if (index === 5) { // Status cell
            const badge = document.createElement('span');
            badge.className = `badge ${trade.status === 'completed' ? 'badge-success' : 'badge-warning'}`;
            badge.textContent = text;
            cell.appendChild(badge);
        } else {
            cell.textContent = text;
        }
    });
}

// Update team structure display
function updateTeamStructure(team) {
    const levels = [1, 2, 3, 4, 5];
    
    levels.forEach(level => {
        const countElement = document.getElementById(`level${level}Count`);
        const earningsElement = document.getElementById(`level${level}Earnings`);
        
        if (countElement) {
            countElement.textContent = team[`level${level}`] ? Object.keys(team[`level${level}`]).length : '0';
        }
        
        if (earningsElement) {
            earningsElement.textContent = '$' + (team[`level${level}Earnings`] || 0).toFixed(2);
        }
    });

    // Update team members list
    const teamMembersList = document.getElementById('teamMembersList');
    if (!teamMembersList) return;

    // Clear existing rows (except header)
    while (teamMembersList.rows.length > 1) {
        teamMembersList.deleteRow(1);
    }

    // Add members from all levels
    levels.forEach(level => {
        if (team[`level${level}`]) {
            Object.entries(team[`level${level}`]).forEach(([userId, member]) => {
                const row = teamMembersList.insertRow();
                
                [
                    member.name || 'Unknown',
                    `Level ${level}`,
                    new Date(member.joinDate).toLocaleDateString(),
                    '$' + (member.investment || 0).toFixed(2),
                    '$' + (member.earnings || 0).toFixed(2)
                ].forEach(text => {
                    row.insertCell().textContent = text;
                });
            });
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            loadUserData(user.uid).catch(error => {
                console.error('Error loading user data:', error);
            });
        }
    });
});

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || document.body;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = document.createElement('i');
    icon.className = `fas ${{
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle'}`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => toast.remove();
    
    toast.append(icon, text, closeBtn);
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
}