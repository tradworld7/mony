// Firebase Initialization (Modular v9+)
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, set, update, push, get } from "firebase/database";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Admin details
const ADMIN_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";
const ADMIN_NAME = "Ramesh kumar Verma";

// Commission rates
const COMMISSION_RATES = {
  admin: 0.10,    // 10% to admin
  direct: 0.10,   // 10% to direct referrer
  levels: [0.02, 0.02, 0.02, 0.02, 0.02] // 2% each for levels 1-5
};

// Global Variables
let currentUser = null;
let userData = null;

// Generate invoice for package purchase
function generateInvoice(packageAmount) {
  if (!currentUser) return null;
  
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
  
  return invoiceData;
}

function getPackageName(amount) {
  switch(amount) {
    case 10: return 'Starter Package';
    case 30: return 'Standard Package';
    case 100: return 'Premium Package';
    default: return 'Custom Package';
  }
}

// Process package purchase with multi-level commissions
async function processPackagePurchase(packageAmount) {
  if (!currentUser) {
    showToast('Please login first', 'error');
    return;
  }

  try {
    // Create invoice first
    const invoice = generateInvoice(packageAmount);
    
    // Calculate total commission (30%)
    const totalCommission = packageAmount * (COMMISSION_RATES.admin + COMMISSION_RATES.direct + COMMISSION_RATES.levels.reduce((a,b) => a + b, 0));
    const tradingPool = packageAmount - totalCommission;
    
    // Prepare all updates
    const updates = {};
    
    // 1. Deduct from user balance
    updates[`users/${currentUser.uid}/balance`] = (userData.balance || 0) - packageAmount;
    
    // 2. Add to investments
    updates[`users/${currentUser.uid}/investments/${invoice.invoiceId}`] = {
      amount: packageAmount,
      purchaseDate: invoice.purchaseDate,
      status: 'active',
      expectedReturn: packageAmount * 2,
      maturityDate: invoice.maturityDate
    };
    
    // 3. Add invoice
    updates[`users/${currentUser.uid}/invoices/${invoice.invoiceId}`] = invoice;
    updates[`invoices/${invoice.invoiceId}`] = invoice;
    
    // 4. Add transaction record
    const transactionId = push(ref(database, 'transactions')).key;
    updates[`transactions/${transactionId}`] = {
      type: 'investment',
      amount: packageAmount,
      status: 'completed',
      timestamp: Date.now(),
      userId: currentUser.uid,
      details: `Purchased ${invoice.packageName}`
    };
    updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
      type: 'investment',
      amount: packageAmount,
      status: 'completed',
      timestamp: Date.now(),
      details: `Purchased ${invoice.packageName}`
    };
    
    // 5. Add admin commission (10%)
    const adminCommission = packageAmount * COMMISSION_RATES.admin;
    updates[`users/${ADMIN_ID}/tradingProfit`] = (await getValue(`users/${ADMIN_ID}/tradingProfit`)) + adminCommission;
    updates[`system/adminEarnings`] = (await getValue('system/adminEarnings')) + adminCommission;
    
    // 6. Process referral commissions (if any)
    if (userData.referredBy) {
      await processReferralCommissions(userData.referredBy, packageAmount, updates);
    }
    
    // 7. Add to trading pool (70%)
    updates[`system/tradingPool`] = (await getValue('system/tradingPool')) + tradingPool;
    
    // Execute all updates
    await update(ref(database), updates);
    
    showToast(`Successfully purchased ${invoice.packageName}`, 'success');
    loadUserData(currentUser.uid);
    
  } catch (error) {
    console.error('Package purchase error:', error);
    showToast('Failed to purchase package', 'error');
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
    commissionRate = COMMISSION_RATES.direct; // 10% for direct referrer
  } else if (currentLevel <= 6) {
    commissionRate = COMMISSION_RATES.levels[currentLevel-2]; // 2% for levels 2-6
  }
  
  const commission = packageAmount * commissionRate;
  
  if (commission > 0) {
    // Update referrer's earnings
    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
    
    // Update team structure counts
    updates[`users/${referrerId}/teamStructure/level${currentLevel}`] = (referrerData.teamStructure?.[`level${currentLevel}`] || 0) + 1;
    
    // Add transaction record for referrer
    const transactionId = push(ref(database, 'transactions')).key;
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
      type: 'referral',
      amount: commission,
      status: 'completed',
      timestamp: Date.now(),
      details: `Level ${currentLevel} referral commission from ${currentUser.email}`
    };
  }
  
  // Continue to next level if available
  if (referrerData.referredBy && currentLevel < 6) {
    await processReferralCommissions(referrerData.referredBy, packageAmount, updates, currentLevel + 1);
  }
}

async function getValue(path) {
  const snapshot = await get(ref(database, path));
  return snapshot.val() || 0;
}

// Load user data from Firebase
function loadUserData(userId) {
  const userRef = ref(database, 'users/' + userId);
  
  onValue(userRef, (snapshot) => {
    userData = snapshot.val();
    if (userData) {
      console.log("User data loaded:", userData);
      updateDashboardUI(userData);
      localStorage.setItem('tradeWorldUser', JSON.stringify(userData));
      
      // Load team structure if available
      if (userData.teamStructure) {
        updateTeamStructureUI(userData.teamStructure);
      }
    }
  }, (error) => {
    console.error("Error loading user data:", error);
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
  document.getElementById('referralProfit').textContent = `Earnings: $${(data.referralEarnings || 0).toFixed(2)}`;
  
  // Update team earnings
  document.getElementById('teamEarnings').textContent = `$${(data.teamEarnings || 0).toFixed(2)}`;
  
  // Load transactions
  loadRecentTransactions();
}

function updateTeamStructureUI(teamStructure) {
  const teamStructureDiv = document.getElementById('teamStructure');
  if (!teamStructureDiv) return;
  
  let html = '<h3>Your Team Structure</h3><ul>';
  
  for (let level = 1; level <= 5; level++) {
    const count = teamStructure[`level${level}`] || 0;
    html += `<li>Level ${level}: ${count} members</li>`;
  }
  
  html += '</ul>';
  teamStructureDiv.innerHTML = html;
}

function loadRecentTransactions() {
  if (!currentUser) return;
  
  const transactionsRef = ref(database, `users/${currentUser.uid}/transactions`);
  
  onValue(transactionsRef, (snapshot) => {
    const transactions = snapshot.val();
    const tbody = document.getElementById('transactionHistory');
    tbody.innerHTML = '';
    
    if (!transactions) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
      return;
    }
    
    // Convert to array and sort by timestamp
    const transactionsArray = Object.entries(transactions).map(([id, tx]) => ({ id, ...tx }));
    transactionsArray.sort((a, b) => b.timestamp - a.timestamp);
    
    // Show only last 5 transactions
    transactionsArray.slice(0, 5).forEach(tx => {
      const row = document.createElement('tr');
      
      const date = new Date(tx.timestamp).toLocaleDateString();
      const type = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
      const amount = `$${tx.amount?.toFixed(2) || '0.00'}`;
      const status = tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : 'Completed';
      const details = tx.details || '';
      
      row.innerHTML = `
        <td>${date}</td>
        <td>${type}</td>
        <td>${amount}</td>
        <td class="status-${tx.status || 'completed'}">${status}</td>
        <td>${details}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
  });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  setupSidebarToggle();
  
  // Firebase Auth State Listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadUserData(user.uid);
      generateTradingData();
    } else {
      // Redirect if not on auth pages
      if (!window.location.pathname.includes('login.html') && 
          !window.location.pathname.includes('signup.html')) {
        window.location.href = 'login.html';
      }
    }
  });
  
  // Setup package purchase buttons
  document.querySelectorAll('[data-package]').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseFloat(btn.getAttribute('data-package'));
      processPackagePurchase(amount);
    });
  });
  
  // Setup transfer button
  document.getElementById('submitTransfer').addEventListener('click', transferFunds);
  
  // Setup logout
  document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    logoutUser();
  });
});

async function transferFunds() {
  const recipientId = document.getElementById('recipientId').value.trim();
  const amount = parseFloat(document.getElementById('transferAmount').value);
  
  if (!recipientId || isNaN(amount) || amount <= 0) {
    showToast('Please enter valid details', 'error');
    return;
  }
  
  if (amount > (userData?.balance || 0)) {
    showToast('Insufficient balance', 'error');
    return;
  }
  
  if (recipientId === currentUser?.uid) {
    showToast('Cannot transfer to yourself', 'error');
    return;
  }
  
  try {
    const updates = {};
    const timestamp = Date.now();
    const transactionId = push(ref(database, 'transactions')).key;
    
    // Update balances
    updates[`users/${currentUser.uid}/balance`] = (userData.balance || 0) - amount;
    
    const recipientRef = ref(database, `users/${recipientId}`);
    const recipientSnap = await get(recipientRef);
    
    if (!recipientSnap.exists()) {
      showToast('Recipient not found', 'error');
      return;
    }
    
    const recipientData = recipientSnap.val();
    updates[`users/${recipientId}/balance`] = (recipientData.balance || 0) + amount;
    
    // Record transactions
    updates[`transactions/${transactionId}`] = {
      type: 'transfer',
      amount,
      status: 'completed',
      timestamp,
      from: currentUser.uid,
      to: recipientId
    };
    
    updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
      type: 'sent',
      amount,
      status: 'completed',
      timestamp,
      to: recipientId
    };
    
    updates[`users/${recipientId}/transactions/${transactionId}`] = {
      type: 'received',
      amount,
      status: 'completed',
      timestamp,
      from: currentUser.uid
    };
    
    await update(ref(database), updates);
    
    showToast(`Successfully transferred $${amount.toFixed(2)}`, 'success');
    document.getElementById('transferAmount').value = '';
    document.getElementById('recipientId').value = '';
    
  } catch (error) {
    console.error('Transfer error:', error);
    showToast('Transfer failed', 'error');
  }
}

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

function logoutUser() {
  signOut(auth).then(() => {
    showToast('Successfully logged out', 'success');
    window.location.href = 'login.html';
  }).catch((error) => {
    showToast('Error logging out', 'error');
    console.error('Logout error:', error);
  });
}
