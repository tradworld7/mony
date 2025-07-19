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

// Admin details
const ADMIN_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1";
const ADMIN_NAME = "Ramesh kumar Verma";

// Commission rates
const COMMISSION_RATES = {
  admin: 0.10,    // 10% to admin
  direct: 0.10,   // 10% to direct referrer
  levels: [0.02, 0.02, 0.02, 0.02, 0.02] // 2% each for levels 1-5
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();

// Global Variables
let currentUser = null;
let userData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  // Setup sidebar toggle for all pages
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
      if (!sidebar.contains(e.target) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Check if user is logged in
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      loadUserData(user.uid);
      
      // Initialize page-specific functionality based on current page
      initPageSpecificFunctions();
    } else {
      // Show login modal if not on auth pages
      if (!window.location.pathname.includes('login.html') && 
          !window.location.pathname.includes('signup.html')) {
        window.location.href = 'login.html';
      }
    }
  });
  
  // Setup logout
  const logoutLinks = document.querySelectorAll('#logoutLink, .logout-link');
  logoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  });
});

// Initialize page-specific functions
function initPageSpecificFunctions() {
  const path = window.location.pathname;
  
  if (path.includes('index.html') {
    initDashboardPage();
  } else if (path.includes('invoices.html')) {
    initInvoicesPage();
  } else if (path.includes('referral.html')) {
    initReferralPage();
  } else if (path.includes('team-structure.html')) {
    initTeamStructurePage();
  } else if (path.includes('trading-history.html')) {
    initTradingHistoryPage();
  } else if (path.includes('transfer.html')) {
    initTransferPage();
  }
}

// Dashboard Page Functions
function initDashboardPage() {
  // Setup package purchase buttons
  document.querySelectorAll('[data-package]').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseFloat(btn.getAttribute('data-package'));
      processPackagePurchase(amount);
    });
  });
  
  // Setup transfer button
  const transferBtn = document.getElementById('submitTransfer');
  if (transferBtn) {
    transferBtn.addEventListener('click', transferFunds);
  }
}

// Invoices Page Functions
function initInvoicesPage() {
  loadInvoices(currentUser.uid);
}

// Referral Page Functions
function initReferralPage() {
  // Set up copy referral link
  document.getElementById('copyReferralLink')?.addEventListener('click', copyReferralLinkToClipboard);
  
  // Set up social share buttons
  setupShareButtons();
  
  // Update referral link
  updateReferralLink();
}

// Team Structure Page Functions
function initTeamStructurePage() {
  loadTeamStructure(currentUser.uid);
}

// Trading History Page Functions
function initTradingHistoryPage() {
  // Set up filter buttons
  document.getElementById('applyFilters')?.addEventListener('click', applyTransactionFilters);
  document.getElementById('resetFilters')?.addEventListener('click', resetTransactionFilters);
  
  // Load initial transactions
  loadTransactionHistory(currentUser.uid);
}

// Transfer Page Functions
function initTransferPage() {
  // Update current balance display
  updateCurrentBalance();
  
  // Set up transfer button
  document.getElementById('submitTransfer')?.addEventListener('click', transferFunds);
}

// Load user data from Firebase
function loadUserData(userId) {
  const userRef = database.ref('users/' + userId);
  
  onValue(userRef, (snapshot) => {
    userData = snapshot.val();
    if (userData) {
      updateDashboardUI(userData);
      localStorage.setItem('tradeWorldUser', JSON.stringify(userData));
      
      // Load team structure if available
      if (userData.teamStructure) {
        updateTeamStructureUI(userData.teamStructure);
      }
      
      // Update current balance on transfer page
      updateCurrentBalance();
    }
  }, (error) => {
    console.error("Error loading user data:", error);
    showToast("Error loading user data", "error");
  });
}

function updateDashboardUI(data) {
  if (!data) return;
  
  // Update balance
  const balanceElement = document.getElementById('userBalance');
  if (balanceElement) {
    balanceElement.textContent = `$${(data.balance || 0).toFixed(2)}`;
  }
  
  // Update trading profit
  const profitElement = document.getElementById('tradingProfit');
  if (profitElement) {
    profitElement.textContent = `$${(data.tradingProfit || 0).toFixed(2)}`;
  }
  
  // Update referrals
  const referralCount = data.directReferrals ? Object.keys(data.directReferrals).length : 0;
  const directReferralsElement = document.getElementById('directReferrals');
  if (directReferralsElement) {
    directReferralsElement.textContent = referralCount;
  }
  
  const referralProfitElement = document.getElementById('referralProfit');
  if (referralProfitElement) {
    referralProfitElement.textContent = `$${(data.referralEarnings || 0).toFixed(2)}`;
  }
  
  // Update team earnings
  const teamEarningsElement = document.getElementById('teamEarnings');
  if (teamEarningsElement) {
    teamEarningsElement.textContent = `$${(data.teamEarnings || 0).toFixed(2)}`;
  }
  
  // Load transactions
  loadRecentTransactions();
}

function updateCurrentBalance() {
  const currentBalanceElement = document.getElementById('currentBalance');
  if (currentBalanceElement && userData) {
    currentBalanceElement.textContent = `$${(userData.balance || 0).toFixed(2)}`;
  }
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
  
  const transactionsRef = database.ref(`users/${currentUser.uid}/transactions`);
  
  onValue(transactionsRef, (snapshot) => {
    const transactions = snapshot.val();
    const tbody = document.getElementById('transactionHistory');
    if (!tbody) return;
    
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
    
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = new Date().toLocaleTimeString();
    }
  });
}

// Process package purchase with multi-level commissions
async function processPackagePurchase(packageAmount) {
  if (!currentUser) {
    showToast('Please login first', 'error');
    return;
  }

  if ((userData.balance || 0) < packageAmount) {
    showToast('Insufficient balance', 'error');
    return;
  }

  try {
    // Create invoice
    const invoiceId = database.ref().child('invoices').push().key;
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
    
    // Calculate total commission (30%)
    const totalCommission = packageAmount * (COMMISSION_RATES.admin + COMMISSION_RATES.direct + COMMISSION_RATES.levels.reduce((a,b) => a + b, 0));
    const tradingPool = packageAmount - totalCommission;
    
    // Prepare all updates
    const updates = {};
    
    // 1. Deduct from user balance
    updates[`users/${currentUser.uid}/balance`] = (userData.balance || 0) - packageAmount;
    
    // 2. Add to investments
    updates[`users/${currentUser.uid}/investments/${invoiceId}`] = {
      amount: packageAmount,
      purchaseDate: purchaseDate,
      status: 'active',
      expectedReturn: packageAmount * 2,
      maturityDate: maturityDate
    };
    
    // 3. Add invoice
    updates[`users/${currentUser.uid}/invoices/${invoiceId}`] = invoiceData;
    updates[`invoices/${invoiceId}`] = invoiceData;
    
    // 4. Add transaction record
    const transactionId = database.ref().child('transactions').push().key;
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
    await database.ref().update(updates);
    
    showToast(`Successfully purchased ${invoiceData.packageName}`, 'success');
    loadUserData(currentUser.uid);
    
  } catch (error) {
    console.error('Package purchase error:', error);
    showToast('Failed to purchase package', 'error');
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
  const snapshot = await database.ref(path).once('value');
  return snapshot.val() || 0;
}

// Process multi-level referral commissions
async function processReferralCommissions(referrerId, packageAmount, updates, currentLevel = 1) {
  if (currentLevel > 5) return;

  // Get referrer data
  const referrerSnapshot = await database.ref(`users/${referrerId}`).once('value');
  if (!referrerSnapshot.exists()) return;
  
  const referrerData = referrerSnapshot.val();
  
  // Calculate commission based on level
  let commissionRate = 0;
  if (currentLevel === 1) {
    commissionRate = COMMISSION_RATES.direct; // 10% for direct referrer
  } else if (currentLevel <= 5) {
    commissionRate = COMMISSION_RATES.levels[currentLevel-2]; // 2% for levels 2-5
  }
  
  const commission = packageAmount * commissionRate;
  
  if (commission > 0) {
    // Update referrer's earnings
    updates[`users/${referrerId}/referralEarnings`] = (referrerData.referralEarnings || 0) + commission;
    updates[`users/${referrerId}/teamEarnings`] = (referrerData.teamEarnings || 0) + commission;
    
    // Add transaction record for referrer
    const transactionId = database.ref().child('transactions').push().key;
    updates[`users/${referrerId}/transactions/${transactionId}`] = {
      type: 'referral',
      amount: commission,
      status: 'completed',
      timestamp: Date.now(),
      details: `Level ${currentLevel} referral commission from ${userData.name}`
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
    return;
  }
  
  const recipientId = document.getElementById('recipientId')?.value;
  const amount = parseFloat(document.getElementById('transferAmount')?.value);
  
  if (!recipientId || !amount || amount <= 0) {
    showToast('Please enter valid recipient and amount', 'error');
    return;
  }
  
  if (amount > (userData.balance || 0)) {
    showToast('Insufficient balance', 'error');
    return;
  }
  
  try {
    // Check if recipient exists
    const recipientSnapshot = await database.ref(`users/${recipientId}`).once('value');
    if (!recipientSnapshot.exists()) {
      showToast('Recipient not found', 'error');
      return;
    }
    
    const recipientData = recipientSnapshot.val();
    
    // Prepare updates
    const updates = {};
    const transactionId = database.ref().child('transactions').push().key;
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
      details: `Transfer to ${recipientData.name || recipientId}`,
      recipientId: recipientId
    };
    
    updates[`users/${recipientId}/transactions/${transactionId}_received`] = {
      type: 'transfer',
      amount: amount,
      status: 'completed',
      timestamp: timestamp,
      details: `Transfer from ${userData.name || currentUser.uid}`,
      senderId: currentUser.uid
    };
    
    // Execute updates
    await database.ref().update(updates);
    
    showToast(`Successfully transferred $${amount.toFixed(2)}`, 'success');
    document.getElementById('transferAmount').value = '';
    document.getElementById('recipientId').value = '';
    
  } catch (error) {
    console.error('Transfer error:', error);
    showToast('Failed to transfer funds', 'error');
  }
}

// Load invoices for user
function loadInvoices(userId) {
  const invoiceContainer = document.getElementById('invoiceContainer');
  if (!invoiceContainer) return;

  database.ref('investments/' + userId).orderByChild('date').once('value')
    .then(snapshot => {
      const invoices = snapshot.val();
      invoiceContainer.innerHTML = '';

      if (!invoices) {
        invoiceContainer.innerHTML = `
          <div class="no-invoices">
            <i class="fas fa-file-invoice"></i>
            <p>No investment invoices found</p>
          </div>
        `;
        return;
      }

      // Convert to array and sort by date (newest first)
      const invoicesArray = Object.entries(invoices).map(([id, invoice]) => ({ id, ...invoice }));
      invoicesArray.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Load user data to get name and email
      database.ref('users/' + userId).once('value').then(userSnapshot => {
        const userData = userSnapshot.val();
        const userName = userData?.name || 'User';
        const userEmail = userData?.email || '';

        // Display each invoice
        invoicesArray.forEach(invoice => {
          const invoiceElement = document.createElement('div');
          invoiceElement.className = 'invoice-card';
          invoiceElement.innerHTML = `
            <div class="invoice-header">
              <div>
                <div class="invoice-company">Trade World</div>
                <div class="invoice-address">London SE1 4SU, United Kingdom</div>
              </div>
              <div class="invoice-title">INVOICE</div>
            </div>
            
            <div class="invoice-meta">
              <div class="invoice-to">
                <span class="invoice-label">INVOICE TO:</span>
                <div>${userName}</div>
                <div>${userEmail}</div>
              </div>
              <div class="invoice-details">
                <div><span class="invoice-label">Invoice ID:</span> ${invoice.invoiceId || invoice.id}</div>
                <div><span class="invoice-label">Date:</span> ${formatDate(invoice.date)}</div>
              </div>
            </div>
            
            <table class="invoice-table">
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${invoice.packageName || 'Investment Package'}</td>
                  <td>$${invoice.amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="invoice-total">
              <div class="total-row">
                <span class="total-label">Total:</span>
                <span class="total-amount">$${invoice.amount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Expected Return:</span>
                <span class="total-amount" style="color: var(--success-color);">$${(invoice.amount * 2).toFixed(2)}</span>
              </div>
            </div>
            
            <div class="invoice-footer">
              <p>Thank you for your investment. Your package will mature on ${formatDate(invoice.maturityDate)}</p>
              <button class="print-btn" onclick="window.print()"><i class="fas fa-print"></i> Print Invoice</button>
            </div>
          `;
          invoiceContainer.appendChild(invoiceElement);
        });
      });
    })
    .catch(error => {
      console.error("Error loading invoices:", error);
      showToast("Error loading invoices. Please try again.", "error");
    });
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Referral program functions
function updateReferralLink() {
  if (!currentUser) return;
  const referralLink = `https://tradworld7.github.io/mony/signup.html?ref=${currentUser.uid}`;
  const referralLinkInput = document.getElementById('referralLink');
  if (referralLinkInput) {
    referralLinkInput.value = referralLink;
  }
}

function copyReferralLinkToClipboard() {
  const referralInput = document.getElementById('referralLink');
  if (!referralInput) return;
  
  referralInput.select();
  document.execCommand('copy');
  showToast('Referral link copied to clipboard!', 'success');
}

function setupShareButtons() {
  if (!currentUser) return;
  const referralLink = `https://tradworld7.github.io/mony/signup.html?ref=${currentUser.uid}`;
  const shareMessage = `Join Trade World using my referral link and earn together! ${referralLink}`;
  
  // WhatsApp
  const whatsappBtn = document.querySelector('.btn[style*="background-color: #25D366"]');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
    });
  }
  
  // Telegram
  const telegramBtn = document.querySelector('.btn[style*="background-color: #0088cc"]');
  if (telegramBtn) {
    telegramBtn.addEventListener('click', () => {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Trade World with my referral link!')}`, '_blank');
    });
  }
  
  // Twitter
  const twitterBtn = document.querySelector('.btn[style*="background-color: #1DA1F2"]');
  if (twitterBtn) {
    twitterBtn.addEventListener('click', () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank');
    });
  }
}

// Team structure functions
async function loadTeamStructure(userId) {
  try {
    // Initialize level stats
    const levelStats = {
      1: { count: 0, earnings: 0, members: [] },
      2: { count: 0, earnings: 0, members: [] },
      3: { count: 0, earnings: 0, members: [] },
      4: { count: 0, earnings: 0, members: [] },
      5: { count: 0, earnings: 0, members: [] }
    };
    
    // Clear the table
    const teamMembersList = document.getElementById('teamMembersList');
    if (teamMembersList) {
      teamMembersList.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading team members...</td></tr>';
    }
    
    // First, get all users to build the referral tree
    const allUsersSnapshot = await database.ref('users').once('value');
    const allUsers = allUsersSnapshot.val() || {};
    
    // Build referral tree
    const referralTree = buildReferralTree(allUsers, userId);
    
    // Process each level
    for (let level = 1; level <= 5; level++) {
      const levelUsers = getUsersAtLevel(referralTree, level);
      levelStats[level].count = levelUsers.length;
      
      // Process each user in this level
      for (const userId of levelUsers) {
        const userData = allUsers[userId];
        if (userData) {
          await processTeamMember(userId, level, levelStats, allUsers);
        }
      }
    }
    
    // Update the UI
    updateLevelStats(levelStats);
    renderTeamMembers(levelStats);
    
  } catch (error) {
    console.error('Error loading team structure:', error);
    showToast('Error loading team data', 'error');
    const teamMembersList = document.getElementById('teamMembersList');
    if (teamMembersList) {
      teamMembersList.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: red;">Error loading team data. Please try again.</td>
        </tr>
      `;
    }
  }
}

// Build referral tree structure
function buildReferralTree(allUsers, rootUserId) {
  const tree = {
    userId: rootUserId,
    children: []
  };
  
  // Map to find users quickly
  const userMap = {};
  userMap[rootUserId] = tree;
  
  // First pass - build the tree structure
  for (const userId in allUsers) {
    if (userId === rootUserId) continue;
    
    const user = allUsers[userId];
    if (user.referredBy) {
      const node = {
        userId: userId,
        children: []
      };
      
      userMap[userId] = node;
    }
  }
  
  // Second pass - connect children to parents
  for (const userId in userMap) {
    if (userId === rootUserId) continue;
    
    const user = allUsers[userId];
    if (user.referredBy && userMap[user.referredBy]) {
      userMap[user.referredBy].children.push(userMap[userId]);
    }
  }
  
  return tree;
}

// Get all user IDs at a specific level in the referral tree
function getUsersAtLevel(tree, targetLevel, currentLevel = 1, result = []) {
  if (currentLevel === targetLevel) {
    result.push(tree.userId);
    return result;
  }
  
  for (const child of tree.children) {
    getUsersAtLevel(child, targetLevel, currentLevel + 1, result);
  }
  
  return result;
}

// Process team member data
async function processTeamMember(userId, level, levelStats, allUsers) {
  try {
    const userData = allUsers[userId];
    if (!userData) return;
    
    // Calculate total investment
    let totalInvestment = 0;
    if (userData.investments) {
      Object.values(userData.investments).forEach(investment => {
        totalInvestment += parseFloat(investment.amount) || 0;
      });
    }
    
    // Calculate earnings for this level based on commission rate
    const commissionPercentage = level === 1 ? 10 : 2; // 10% for L1, 2% for others
    const earnings = totalInvestment * (commissionPercentage / 100);
    levelStats[level].earnings += earnings;
    
    // Format join date
    const joinDate = new Date(userData.joinDate || Date.now());
    const formattedDate = joinDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    // Get referrer name
    let referrerName = "Direct";
    if (level > 1 && userData.referredBy) {
      const referrerData = allUsers[userData.referredBy];
      referrerName = referrerData?.name || referrerData?.email || "Unknown";
    }
    
    // Add to members list for this level
    levelStats[level].members.push({
      name: userData.name || userData.email || "Unknown",
      level,
      joinDate: formattedDate,
      investment: totalInvestment,
      earnings,
      referredBy: level === 1 ? "You" : referrerName
    });
    
  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
  }
}

// Render all team members in the table
function renderTeamMembers(levelStats) {
  const teamMembersList = document.getElementById('teamMembersList');
  if (!teamMembersList) return;
  
  // Combine all members from all levels
  const allMembers = [];
  for (let level = 1; level <= 5; level++) {
    allMembers.push(...levelStats[level].members);
  }
  
  if (allMembers.length === 0) {
    teamMembersList.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">No team members found</td>
      </tr>
    `;
    return;
  }
  
  // Sort by level (optional)
  allMembers.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  
  // Add rows to table
  allMembers.forEach(member => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${member.name}</td>
      <td><span class="level-badge level-${member.level}">Level ${member.level}</span></td>
      <td>${member.joinDate}</td>
      <td>$${member.investment.toFixed(2)}</td>
      <td>$${member.earnings.toFixed(2)} (${member.level === 1 ? '10' : '2'}%)</td>
      <td>${member.referredBy}</td>
    `;
    teamMembersList.appendChild(row);
  });
}

// Update level statistics display
function updateLevelStats(stats) {
  for (const level in stats) {
    if (stats.hasOwnProperty(level)) {
      const countElement = document.getElementById(`level${level}Count`);
      const earningsElement = document.getElementById(`level${level}Earnings`);
      
      if (countElement) {
        countElement.textContent = stats[level].count;
      }
      if (earningsElement) {
        earningsElement.textContent = `$${stats[level].earnings.toFixed(2)}`;
      }
    }
  }
}

// Transaction history functions
function loadTransactionHistory(userId, filters = {}) {
  const transactionsRef = database.ref(`users/${userId}/transactions`);
  const transactionHistoryList = document.getElementById('transactionHistoryList');
  if (!transactionHistoryList) return;
  
  transactionsRef.on('value', (snapshot) => {
    const transactions = snapshot.val();
    transactionHistoryList.innerHTML = '';
    
    if (transactions) {
      // Convert to array and sort by timestamp (newest first)
      let transactionsArray = Object.entries(transactions).map(([id, tx]) => ({
        id,
        ...tx
      })).sort((a, b) => b.timestamp - a.timestamp);
      
      // Apply filters
      transactionsArray = applyTransactionFilters(transactionsArray, filters);
      
      if (transactionsArray.length > 0) {
        transactionsArray.forEach(transaction => {
          const row = document.createElement('tr');
          
          // Format date
          const txDate = new Date(transaction.timestamp);
          const formattedDate = txDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Determine transaction type and styling
          let typeClass = '';
          let typeText = '';
          let amountClass = '';
          let amountPrefix = '';
          let details = '';
          
          switch(transaction.type) {
            case 'investment':
              typeClass = 'type-investment';
              typeText = 'Investment';
              amountClass = 'amount-negative';
              amountPrefix = '-';
              details = `Package: ${transaction.packageName || 'N/A'}`;
              break;
            case 'deposit':
              typeClass = 'type-deposit';
              typeText = 'Deposit';
              amountClass = 'amount-positive';
              amountPrefix = '+';
              details = `Method: ${transaction.method || 'N/A'}`;
              break;
            case 'withdrawal':
              typeClass = 'type-withdrawal';
              typeText = 'Withdrawal';
              amountClass = 'amount-negative';
              amountPrefix = '-';
              details = `To: ${transaction.account || 'N/A'}`;
              break;
            case 'transfer':
              if (transaction.direction === 'sent') {
                typeClass = 'type-transfer-sent';
                typeText = 'Transfer Sent';
                amountClass = 'amount-negative';
                amountPrefix = '-';
                details = `To: ${transaction.recipientName || transaction.recipientEmail || 'N/A'}`;
              } else {
                typeClass = 'type-transfer-received';
                typeText = 'Transfer Received';
                amountClass = 'amount-positive';
                amountPrefix = '+';
                details = `From: ${transaction.senderName || transaction.senderEmail || 'N/A'}`;
              }
              break;
            default:
              typeClass = '';
              typeText = transaction.type;
          }
          
          // Status styling
          let statusClass = '';
          switch(transaction.status) {
            case 'completed':
              statusClass = 'status-completed';
              break;
            case 'pending':
              statusClass = 'status-pending';
              break;
            case 'failed':
              statusClass = 'status-failed';
              break;
            case 'processing':
              statusClass = 'status-processing';
              break;
          }
          
          row.innerHTML = `
            <td>${transaction.id.substring(0, 8)}</td>
            <td>${formattedDate}</td>
            <td><span class="transaction-type ${typeClass}">${typeText}</span></td>
            <td class="${amountClass}">${amountPrefix}$${transaction.amount.toFixed(2)}</td>
            <td>${details}</td>
            <td><span class="status-badge ${statusClass}">${transaction.status}</span></td>
          `;
          
          transactionHistoryList.appendChild(row);
        });
      } else {
        transactionHistoryList.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center;">No transactions found matching your filters</td>
          </tr>
        `;
      }
    } else {
      transactionHistoryList.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center;">No transaction history found</td>
        </tr>
      `;
    }
  }, (error) => {
    showToast('Error loading transaction history', 'error');
    console.error('Error loading transaction history:', error);
  });
}

// Apply filters to transactions
function applyTransactionFilters(transactions, filters) {
  return transactions.filter(tx => {
    // Type filter
    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) {
      return false;
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all' && tx.status !== filters.status) {
      return false;
    }
    
    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (tx.timestamp < fromDate.getTime()) {
        return false;
      }
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (tx.timestamp > toDate.getTime()) {
        return false;
      }
    }
    
    return true;
  });
}

// Apply transaction filters
function applyTransactionFilters() {
  const filters = {
    type: document.getElementById('transactionTypeFilter')?.value,
    status: document.getElementById('statusFilter')?.value,
    dateFrom: document.getElementById('dateFromFilter')?.value,
    dateTo: document.getElementById('dateToFilter')?.value
  };
  
  if (currentUser) {
    loadTransactionHistory(currentUser.uid, filters);
  }
}

// Reset transaction filters
function resetTransactionFilters() {
  const transactionTypeFilter = document.getElementById('transactionTypeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const dateFromFilter = document.getElementById('dateFromFilter');
  const dateToFilter = document.getElementById('dateToFilter');
  
  if (transactionTypeFilter) transactionTypeFilter.value = 'all';
  if (statusFilter) statusFilter.value = 'all';
  if (dateFromFilter) dateFromFilter.value = '';
  if (dateToFilter) dateToFilter.value = '';
  
  if (currentUser) {
    loadTransactionHistory(currentUser.uid);
  }
}

// Logout user
function logoutUser() {
  auth.signOut().then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    console.error("Logout error:", error);
    showToast("Error logging out. Please try again.", "error");
  });
}

// Show toast notification
function showToast(message, type = "error") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;
  
  const toast = document.createElement("div");
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
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });
}
