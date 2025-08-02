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

const ADMIN_USER_ID = "KtdjLWRdN5M5uOA1xDokUtrxfe93";

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();
const functions = firebase.functions();

let currentUser = null;
let userData = null;

// Auth state listener - handles redirection for all pages
auth.onAuthStateChanged((user) => {
  const currentPage = window.location.pathname.split('/').pop();
  
  if (user) {
    currentUser = user;
    initializeUserData(user.uid);
    
    // Update UI based on auth state
    updateAuthUI(true);
    
    // Redirect away from auth pages if already logged in
    if (currentPage === 'login.html' || currentPage === 'signup.html') {
      window.location.href = "index.html";
    }
  } else {
    // Update UI based on auth state
    updateAuthUI(false);
    
    // Allow access to auth pages when not logged in
    if (currentPage !== 'login.html' && currentPage !== 'signup.html') {
      window.location.href = "login.html";
    }
  }
});

// Update UI elements based on auth state
function updateAuthUI(isLoggedIn) {
  // Header buttons
  const loginBtn = document.getElementById('loginBtnHeader');
  const signupBtn = document.getElementById('signupBtnHeader');
  const dashboardBtn = document.getElementById('dashboardBtnHeader');
  
  if (loginBtn && signupBtn && dashboardBtn) {
    if (isLoggedIn) {
      loginBtn.style.display = 'none';
      signupBtn.style.display = 'none';
      dashboardBtn.style.display = 'inline-block';
    } else {
      loginBtn.style.display = 'inline-block';
      signupBtn.style.display = 'inline-block';
      dashboardBtn.style.display = 'none';
    }
  }
  
  // Sidebar - show/hide logout button
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.style.display = isLoggedIn ? 'block' : 'none';
  }
}

// Initialize user data - common for all pages
async function initializeUserData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    
    if (!userData) {
      const defaultUserData = {
        name: currentUser.displayName || "User",
        email: currentUser.email,
        balance: 0,
        tradingProfit: 0,
        directreferrals: 0,
        referralEarnings: 0,
        teamEarnings: 0,
        tradingPoolEarnings: 0,
        referredBy: null,
        transactions: {},
        investments: {},
        directReferrals: {},
        teamStructure: {
          level1Count: 0,
          level2Count: 0,
          level3Count: 0,
          level4Count: 0,
          level5Count: 0
        },
        lastActive: Date.now(),
        accountStatus: "active",
        kycVerified: false,
        walletAddress: "",
        mobileNumber: ""
      };
      
      await database.ref("users/" + uid).set(defaultUserData);
      userData = defaultUserData;
    }
    
    loadPageSpecificData(uid);
    updateLastActive(uid);
    
  } catch (error) {
    console.error("Error initializing user data:", error);
    showToast("Error loading user data. Please refresh the page.", "error");
  }
}

// Update last active time
function updateLastActive(uid) {
  database.ref("users/" + uid + "/lastActive").set(Date.now());
  setInterval(() => {
    database.ref("users/" + uid + "/lastActive").set(Date.now());
  }, 60000);
}

// Load data specific to each page
async function loadPageSpecificData(uid) {
  const currentPage = window.location.pathname.split('/').pop();
  
  // Common data for all pages
  await loadCommonUserData(uid);
  
  // Page-specific data loading
  switch(currentPage) {
    case 'index.html':
      await loadDashboardData(uid);
      break;
      
    case 'profile.html':
      await loadProfileData(uid);
      break;
      
    case 'packages.html':
      await loadPackagesData(uid);
      break;
      
    case 'referral.html':
      await loadReferralData(uid);
      break;
      
    case 'team-structure.html':
      await loadTeamStructure(uid);
      break;
      
    case 'trading-history.html':
      await loadTransactionHistory(uid, 50);
      break;
      
    case 'transfer.html':
      // No additional data needed
      break;
      
    case 'withdrawal.html':
      await loadWithdrawalData(uid);
      break;
      
    case 'deposit.html':
      await loadDepositData(uid);
      break;
      
    case 'invoices.html':
      await loadInvoices(uid);
      break;
  }
}

// Load common user data for all pages
async function loadCommonUserData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    userData = snapshot.val();
    
    // Update balance display if element exists
    if (document.getElementById("userBalance")) {
      document.getElementById("userBalance").textContent = `$${(userData.balance || 0).toFixed(2)}`;
    }
    
    // Update user name display if element exists
    if (document.getElementById("userName")) {
      document.getElementById("userName").textContent = userData.name || "User";
    }
    
    // Update referral link if element exists
    if (document.getElementById("referralLink")) {
      document.getElementById("referralLink").value = 
        `${window.location.origin}/signup.html?ref=${uid}`;
    }
    
    // Update profile page fields if they exist
    if (document.getElementById("fullName")) {
      document.getElementById("fullName").value = userData.name || "";
      document.getElementById("userEmail").value = userData.email || "";
      document.getElementById("mobileNumber").value = userData.mobileNumber || "";
      document.getElementById("userId").value = uid;
      
      if (userData.joinDate) {
        const joinDate = new Date(userData.joinDate);
        document.getElementById("accountCreated").value = joinDate.toLocaleDateString();
      }
    }
    
  } catch (error) {
    console.error("Error loading common user data:", error);
  }
}

// Dashboard specific data
async function loadDashboardData(uid) {
  try {
    // Update dashboard cards
    if (document.getElementById("tradingProfit")) {
      document.getElementById("tradingProfit").textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
    }
    
    if (document.getElementById("referralProfit")) {
      document.getElementById("referralProfit").textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;
    }
    
    if (document.getElementById("teamEarnings")) {
      document.getElementById("teamEarnings").textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
    }
    
    if (document.getElementById("directReferrals")) {
      const referralsCount = userData.directReferrals ? Object.keys(userData.directReferrals).length : 0;
      document.getElementById("directReferrals").textContent = referralsCount;
    }
    
    // Load recent transactions
    await loadTransactionHistory(uid, 5);
    
    // Load active investments
    await loadActiveInvestments(uid);
    
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

// Load active investments
async function loadActiveInvestments(uid) {
  try {
    const container = document.getElementById("activeInvestments");
    if (!container) return;
    
    const snapshot = await database.ref(`users/${uid}/investments`)
      .orderByChild("status")
      .equalTo("active")
      .once("value");
    
    const investments = snapshot.val() || {};
    container.innerHTML = "";
    
    if (Object.keys(investments).length > 0) {
      Object.entries(investments).forEach(([id, investment]) => {
        const maturityDate = new Date(investment.maturityDate);
        const daysLeft = Math.ceil((maturityDate - Date.now()) / (1000 * 60 * 60 * 24));
        
        const row = document.createElement("div");
        row.className = "investment-item";
        row.innerHTML = `
          <div>$${investment.amount.toFixed(2)}</div>
          <div>${daysLeft} days left</div>
          <div>$${investment.profitEarned?.toFixed(2) || '0.00'} earned</div>
        `;
        container.appendChild(row);
      });
    } else {
      container.innerHTML = `<div class="text-muted">No active investments</div>`;
    }
  } catch (error) {
    console.error("Error loading investments:", error);
  }
}

// Load transaction history (used in multiple pages)
async function loadTransactionHistory(uid, limit = 10) {
  try {
    const container = document.getElementById("transactionHistory");
    if (!container) return;
    
    const snapshot = await database.ref(`users/${uid}/transactions`)
      .orderByChild("timestamp")
      .limitToLast(limit)
      .once("value");
    
    container.innerHTML = "";
    const data = snapshot.val();
    
    if (data) {
      Object.values(data).reverse().forEach((tx) => {
        const row = document.createElement("tr");
        
        // Format based on page requirements
        if (window.location.pathname.includes('trading-history.html')) {
          row.innerHTML = `
            <td>${tx.txId || 'N/A'}</td>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td>$${Math.abs(tx.amount).toFixed(2)}</td>
            <td>$${(tx.currentValue || tx.amount * 2).toFixed(2)}</td>
            <td class="${tx.amount >= 0 ? 'text-success' : 'text-danger'}">
              $${((tx.currentValue || tx.amount * 2) - Math.abs(tx.amount)).toFixed(2)}
            </td>
            <td>${tx.status || 'completed'}</td>
          `;
        } else {
          row.innerHTML = `
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td>${tx.type.replace(/_/g, ' ').toUpperCase()}</td>
            <td class="${tx.amount >= 0 ? 'text-success' : 'text-danger'}">
              $${Math.abs(tx.amount).toFixed(2)}
            </td>
            <td>${tx.status}</td>
            <td>${tx.details}</td>
          `;
        }
        
        container.appendChild(row);
      });
    } else {
      container.innerHTML = `<tr><td colspan="6" class="text-center">No transactions found</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading transactions:", error);
    const container = document.getElementById("transactionHistory");
    if (container) {
      container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading transactions</td></tr>`;
    }
  }
}

// Load profile data
async function loadProfileData(uid) {
  try {
    const snapshot = await database.ref("users/" + uid).once("value");
    const user = snapshot.val();
    
    if (user) {
      document.getElementById("fullName").value = user.name || "";
      document.getElementById("userEmail").value = user.email || "";
      document.getElementById("mobileNumber").value = user.mobileNumber || "";
      document.getElementById("userId").value = uid;
      
      if (user.joinDate) {
        const joinDate = new Date(user.joinDate);
        document.getElementById("accountCreated").value = joinDate.toLocaleDateString();
      }
    }
  } catch (error) {
    console.error("Error loading profile data:", error);
    showToast("Error loading profile data", "error");
  }
}

// Load packages data
async function loadPackagesData(uid) {
  try {
    // Check if packages are already loaded in the HTML
    const packagesContainer = document.querySelector(".packages-grid");
    if (!packagesContainer || packagesContainer.children.length === 0) {
      // Load packages from database if not in HTML
      const snapshot = await database.ref("packages").once("value");
      const packages = snapshot.val();
      
      if (packages) {
        packagesContainer.innerHTML = "";
        Object.entries(packages).forEach(([id, pkg]) => {
          const packageCard = document.createElement("div");
          packageCard.className = "package-card";
          packageCard.innerHTML = `
            <h3 class="package-name">${pkg.name}</h3>
            <div class="package-price">$${pkg.price}</div>
            <div class="package-return">Returns $${pkg.returnAmount} (${pkg.returnPercentage}% Profit)</div>
            <ul class="package-features">
              ${pkg.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}
            </ul>
            <button class="btn btn-primary" data-package="${pkg.price}" data-name="${pkg.name}">Buy Now</button>
          `;
          packagesContainer.appendChild(packageCard);
        });
      }
    }
    
    // Add event listeners to package buttons
    document.querySelectorAll("[data-package]").forEach(btn => {
      btn.addEventListener("click", () => {
        const amount = parseFloat(btn.getAttribute("data-package"));
        const packageName = btn.getAttribute("data-name");
        purchasePackage(amount, packageName);
      });
    });
    
  } catch (error) {
    console.error("Error loading packages:", error);
  }
}

// Load referral data
async function loadReferralData(uid) {
  try {
    const snapshot = await database.ref(`users/${uid}/directReferrals`).once("value");
    const referrals = snapshot.val() || {};
    const container = document.getElementById("referralList");
    
    container.innerHTML = "";
    
    if (Object.keys(referrals).length > 0) {
      // Get details for each referral
      const referralPromises = Object.keys(referrals).map(async (refId) => {
        const refSnapshot = await database.ref(`users/${refId}`).once("value");
        return refSnapshot.val();
      });
      
      const referralUsers = await Promise.all(referralPromises);
      
      referralUsers.forEach((user, index) => {
        if (user) {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${user.name || 'User'}</td>
            <td>${new Date(user.joinDate).toLocaleDateString()}</td>
            <td>Active</td>
            <td>$${(user.totalInvested || 0).toFixed(2)}</td>
            <td>$${(user.referralEarnings || 0).toFixed(2)}</td>
          `;
          container.appendChild(row);
        }
      });
    } else {
      container.innerHTML = `<tr><td colspan="5" class="text-center">No referrals yet</td></tr>`;
    }
    
  } catch (error) {
    console.error("Error loading referral data:", error);
  }
}

// Load team structure
async function loadTeamStructure(uid) {
  try {
    const snapshot = await database.ref(`users/${uid}/teamStructure`).once("value");
    const teamStructure = snapshot.val() || {};
    
    // Update team stats
    document.getElementById("total-members").textContent = 
      (teamStructure.level1Count || 0) + 
      (teamStructure.level2Count || 0) + 
      (teamStructure.level3Count || 0) + 
      (teamStructure.level4Count || 0) + 
      (teamStructure.level5Count || 0);
    
    document.getElementById("active-members").textContent = 
      (teamStructure.level1Count || 0); // Assuming only level 1 is active
    
    document.getElementById("team-earnings").textContent = 
      `$${(userData.teamEarnings || 0).toFixed(2)}`;
    
    // Load members for each level
    for (let level = 1; level <= 5; level++) {
      await loadTeamMembers(uid, level);
    }
    
  } catch (error) {
    console.error("Error loading team structure:", error);
  }
}

// Load team members for a specific level
async function loadTeamMembers(uid, level) {
  try {
    const container = document.getElementById(`level${level}-members`);
    if (!container) return;
    
    let members = [];
    
    if (level === 1) {
      // Direct referrals
      const snapshot = await database.ref(`users/${uid}/directReferrals`).once("value");
      const referrals = snapshot.val() || {};
      members = Object.keys(referrals);
    } else {
      // For levels 2-5, we need to recursively find members
      // This is simplified - in a real app you'd need a more efficient structure
      const snapshot = await database.ref(`users/${uid}/teamLevels/level${level}`).once("value");
      members = snapshot.val() ? Object.keys(snapshot.val()) : [];
    }
    
    container.innerHTML = "";
    
    if (members.length > 0) {
      // Get member details
      const memberPromises = members.map(async (memberId) => {
        const memberSnapshot = await database.ref(`users/${memberId}`).once("value");
        return memberSnapshot.val();
      });
      
      const memberDetails = await Promise.all(memberPromises);
      
      memberDetails.forEach((member, index) => {
        if (member) {
          const memberDiv = document.createElement("div");
          memberDiv.className = "team-member";
          memberDiv.innerHTML = `
            <span class="member-name">${member.name || 'Member'}</span>
            <span class="member-id">ID: ${memberId.substring(0, 8)}</span>
          `;
          container.appendChild(memberDiv);
        }
      });
      
      if (members.length > 10) {
        const moreMsg = document.createElement("p");
        moreMsg.className = "more-members";
        moreMsg.textContent = `+${members.length - 10} more members...`;
        container.appendChild(moreMsg);
      }
    } else {
      const emptyMsg = document.createElement("p");
      emptyMsg.className = "empty-message";
      emptyMsg.textContent = `No members at level ${level}`;
      container.appendChild(emptyMsg);
    }
    
  } catch (error) {
    console.error(`Error loading level ${level} members:`, error);
  }
}

// Load withdrawal data
async function loadWithdrawalData(uid) {
  try {
    // Update available balances
    document.getElementById("availableTradingProfit").textContent = 
      `$${(userData.tradingProfit || 0).toFixed(2)}`;
    
    document.getElementById("availableReferralProfit").textContent = 
      `$${(userData.referralEarnings || 0).toFixed(2)}`;
    
    // Load withdrawal history
    const snapshot = await database.ref(`users/${uid}/withdrawals`)
      .orderByChild("timestamp")
      .limitToLast(10)
      .once("value");
    
    const container = document.getElementById("withdrawalHistory");
    container.innerHTML = "";
    
    const withdrawals = snapshot.val() || {};
    
    if (Object.keys(withdrawals).length > 0) {
      Object.values(withdrawals).reverse().forEach((withdrawal) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${new Date(withdrawal.timestamp).toLocaleDateString()}</td>
          <td>$${withdrawal.amount.toFixed(2)}</td>
          <td>${withdrawal.type}</td>
          <td>${withdrawal.walletAddress.substring(0, 6)}...${withdrawal.walletAddress.substring(walletAddress.length - 4)}</td>
          <td class="status-${withdrawal.status}">${withdrawal.status}</td>
        `;
        container.appendChild(row);
      });
    } else {
      container.innerHTML = `<tr><td colspan="5" class="text-center">No withdrawal history</td></tr>`;
    }
    
  } catch (error) {
    console.error("Error loading withdrawal data:", error);
  }
}

// Load deposit data
async function loadDepositData(uid) {
  try {
    const snapshot = await database.ref(`users/${uid}/deposits`)
      .orderByChild("timestamp")
      .limitToLast(5)
      .once("value");
    
    const container = document.getElementById("depositHistory");
    if (container) {
      container.innerHTML = "";
      
      const deposits = snapshot.val() || {};
      
      if (Object.keys(deposits).length > 0) {
        Object.values(deposits).reverse().forEach((deposit) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${new Date(deposit.timestamp).toLocaleDateString()}</td>
            <td>$${deposit.amount.toFixed(2)}</td>
            <td>${deposit.status}</td>
            <td>${deposit.txHash.substring(0, 10)}...</td>
          `;
          container.appendChild(row);
        });
      } else {
        container.innerHTML = `<tr><td colspan="4" class="text-center">No deposit history</td></tr>`;
      }
    }
  } catch (error) {
    console.error("Error loading deposit data:", error);
  }
}

// Package purchase function
async function purchasePackage(amount, packageName) {
  if (!currentUser || !userData) {
    showToast("Please wait, user data is loading...", "error");
    return;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    showToast("Invalid package amount", "error");
    return;
  }

  if (userData.accountStatus !== "active") {
    showToast("Your account is not active for transactions", "error");
    return;
  }

  const uid = currentUser.uid;
  const currentBalance = parseFloat(userData.balance || 0);
  
  if (amount > currentBalance) {
    showToast("Insufficient balance", "error");
    return;
  }

  try {
    const updates = {};
    const timestamp = Date.now();
    const packageId = database.ref().child("investments").push().key;
    const txId = database.ref().child("transactions").push().key;

    // Commission structure
    const directReferralCommission = amount * 0.10;
    const adminCommission = amount * 0.30;
    const level2Commission = amount * 0.02;
    const level3Commission = amount * 0.02;
    const level4Commission = amount * 0.02;
    const level5Commission = amount * 0.02;
    const tradingPool = amount * 0.50;

    // User updates
    updates[`users/${uid}/balance`] = currentBalance - amount;
    
    // Investment record
    updates[`users/${uid}/investments/${packageId}`] = {
      amount,
      status: "active",
      purchaseDate: timestamp,
      expectedReturn: amount * 2,
      maturityDate: timestamp + 30 * 24 * 60 * 60 * 1000,
      profitEarned: 0,
      lastProfitDate: null,
      tradingPoolShare: tradingPool,
      packageName: packageName || `$${amount} Package`
    };

    // Invoice record
    updates[`users/${uid}/invoices/${packageId}`] = {
      invoiceId: packageId,
      userId: uid,
      amount: amount,
      expectedReturn: amount * 2,
      purchaseDate: timestamp,
      maturityDate: timestamp + 30 * 24 * 60 * 60 * 1000,
      status: "active",
      packageName: packageName || `$${amount} Package`,
      timestamp: timestamp
    };

    // Transaction records
    updates[`transactions/${txId}`] = {
      userId: uid,
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased ${packageName || 'package'} of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount
    };

    updates[`users/${uid}/transactions/${txId}`] = {
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased ${packageName || 'package'} of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount
    };

    // Admin commission (30%)
    updates[`users/${ADMIN_USER_ID}/balance`] = firebase.database.ServerValue.increment(adminCommission);
    updates[`users/${ADMIN_USER_ID}/adminEarnings`] = firebase.database.ServerValue.increment(adminCommission);
    
    const adminTxId = database.ref().child("transactions").push().key;
    updates[`users/${ADMIN_USER_ID}/transactions/${adminTxId}`] = {
      type: "admin_commission",
      amount: adminCommission,
      status: "completed",
      timestamp,
      details: `Commission from user ${uid} package purchase`,
      balanceBefore: (await database.ref(`users/${ADMIN_USER_ID}/balance`).once("value")).val() || 0,
      balanceAfter: firebase.database.ServerValue.increment(adminCommission)
    };

    // Trading pool (50%)
    updates[`system/tradingPool`] = firebase.database.ServerValue.increment(tradingPool);
    updates[`system/poolTransactions/${txId}`] = {
      userId: uid,
      amount: tradingPool,
      timestamp,
      details: `Contribution from ${uid} package purchase`
    };

    // Distribute trading pool to active users based on their investment shares
    await distributeTradingPool(uid, tradingPool, timestamp, updates);

    // Referral commissions (10% direct + 2% each for levels 2-5)
    if (userData.referredBy) {
      await handleReferralCommissions(userData.referredBy, uid, amount, timestamp, updates);
    }

    // Execute all updates
    await database.ref().update(updates);
    
    // Refresh data
    await loadPageSpecificData(uid);
    
    showToast(`Package of $${amount.toFixed(2)} purchased successfully!`, "success");
    
  } catch (error) {
    console.error("Package purchase error:", error);
    showToast("Error processing package purchase. Please try again.", "error");
  }
}

// Distribute trading pool to active users based on their investment shares
async function distributeTradingPool(investorId, amount, timestamp, updates) {
  try {
    // Get all active users with their investments
    const snapshot = await database.ref("users")
      .orderByChild("accountStatus")
      .equalTo("active")
      .once("value");
    
    const users = snapshot.val() || {};
    let totalInvestmentPool = 0;
    const userShares = {};
    
    // Calculate each user's share of the trading pool
    Object.keys(users).forEach(uid => {
      const user = users[uid];
      if (user.investments) {
        let userTotalShare = 0;
        Object.values(user.investments).forEach(inv => {
          if (inv.status === "active" && inv.tradingPoolShare) {
            userTotalShare += inv.tradingPoolShare;
          }
        });
        
        if (userTotalShare > 0) {
          userShares[uid] = userTotalShare;
          totalInvestmentPool += userTotalShare;
        }
      }
    });
    
    if (totalInvestmentPool > 0) {
      // Distribute the amount proportionally to all active investors
      Object.keys(userShares).forEach(uid => {
        const share = userShares[uid];
        const distributionAmount = (share / totalInvestmentPool) * amount;
        
        // Update user's trading profit (accumulated)
        updates[`users/${uid}/tradingProfit`] = 
          firebase.database.ServerValue.increment(distributionAmount);
        
        updates[`users/${uid}/balance`] = 
          firebase.database.ServerValue.increment(distributionAmount);
          
        const txId = database.ref().child("transactions").push().key;
        updates[`users/${uid}/transactions/${txId}`] = {
          type: "trading_pool",
          amount: distributionAmount,
          status: "completed",
          timestamp,
          details: `Trading pool distribution from ${investorId}`,
          balanceBefore: users[uid].balance || 0,
          balanceAfter: (users[uid].balance || 0) + distributionAmount
        };
      });
    }
    
  } catch (error) {
    console.error("Error distributing trading pool:", error);
  }
}

// Handle referral commissions (10% direct + 2% each for 5 levels)
async function handleReferralCommissions(referrerId, userId, amount, timestamp, updates) {
  try {
    // Get referrer data
    const referrerSnapshot = await database.ref(`users/${referrerId}`).once("value");
    const referrer = referrerSnapshot.val();
    
    if (!referrer) return;
    
    // Direct referral commission (10%)
    const directCommission = amount * 0.10;
    updates[`users/${referrerId}/referralEarnings`] = 
      firebase.database.ServerValue.increment(directCommission);
    
    updates[`users/${referrerId}/balance`] = 
      firebase.database.ServerValue.increment(directCommission);
      
    const directTxId = database.ref().child("transactions").push().key;
    updates[`users/${referrerId}/transactions/${directTxId}`] = {
      type: "referral_commission",
      amount: directCommission,
      status: "completed",
      timestamp,
      details: `Direct referral commission from ${userId}`,
      balanceBefore: referrer.balance || 0,
      balanceAfter: (referrer.balance || 0) + directCommission
    };
    
    // Level commissions (2% each for levels 2-5)
    let currentUpline = referrer.referredBy;
    for (let level = 2; level <= 5; level++) {
      if (!currentUpline) break;
      
      const levelCommission = amount * 0.02;
      
      // Get upline data
      const uplineSnapshot = await database.ref(`users/${currentUpline}`).once("value");
      const upline = uplineSnapshot.val();
      
      if (upline) {
        updates[`users/${currentUpline}/teamEarnings`] = 
          firebase.database.ServerValue.increment(levelCommission);
        
        updates[`users/${currentUpline}/balance`] = 
          firebase.database.ServerValue.increment(levelCommission);
          
        const levelTxId = database.ref().child("transactions").push().key;
        updates[`users/${currentUpline}/transactions/${levelTxId}`] = {
          type: "team_commission",
          amount: levelCommission,
          status: "completed",
          timestamp,
          details: `Level ${level} commission from ${userId}`,
          balanceBefore: upline.balance || 0,
          balanceAfter: (upline.balance || 0) + levelCommission
        };
        
        // Update team structure counts
        updates[`users/${currentUpline}/teamStructure/level${level}Count`] = 
          firebase.database.ServerValue.increment(1);
      }
      
      currentUpline = upline?.referredBy;
    }
    
  } catch (error) {
    console.error("Error handling referral commissions:", error);
  }
}

// Transfer funds to another user
async function transferFunds(recipientId, amount) {
  if (!currentUser || !userData) {
    showToast("Please wait, user data is loading...", "error");
    return;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    showToast("Invalid transfer amount", "error");
    return;
  }

  const uid = currentUser.uid;
  const currentBalance = parseFloat(userData.balance || 0);
  
  if (amount > currentBalance) {
    showToast("Insufficient balance", "error");
    return;
  }

  try {
    // Verify recipient exists
    const recipientSnapshot = await database.ref(`users/${recipientId}`).once("value");
    const recipient = recipientSnapshot.val();
    
    if (!recipient) {
      showToast("Recipient not found", "error");
      return;
    }
    
    if (recipientId === uid) {
      showToast("Cannot transfer to yourself", "error");
      return;
    }

    const updates = {};
    const timestamp = Date.now();
    const txId = database.ref().child("transactions").push().key;

    // Update sender balance
    updates[`users/${uid}/balance`] = currentBalance - amount;
    
    // Update recipient balance
    updates[`users/${recipientId}/balance`] = 
      firebase.database.ServerValue.increment(amount);
    
    // Create transaction records
    updates[`transactions/${txId}`] = {
      userId: uid,
      type: "transfer",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Transfer to ${recipient.name || recipientId}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount,
      recipientId
    };
    
    updates[`users/${uid}/transactions/${txId}`] = {
      type: "transfer",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Transfer to ${recipient.name || recipientId}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount,
      recipientId
    };
    
    const recipientTxId = database.ref().child("transactions").push().key;
    updates[`users/${recipientId}/transactions/${recipientTxId}`] = {
      type: "transfer",
      amount: amount,
      status: "completed",
      timestamp,
      details: `Transfer from ${userData.name || uid}`,
      balanceBefore: recipient.balance || 0,
      balanceAfter: (recipient.balance || 0) + amount,
      senderId: uid
    };

    // Execute all updates
    await database.ref().update(updates);
    
    // Refresh data
    await loadPageSpecificData(uid);
    
    showToast(`Successfully transferred $${amount.toFixed(2)}`, "success");
    
    // Clear form if exists
    if (document.getElementById("transferAmount")) {
      document.getElementById("transferAmount").value = "";
    }
    if (document.getElementById("recipientId")) {
      document.getElementById("recipientId").value = "";
    }
    
  } catch (error) {
    console.error("Transfer error:", error);
    showToast("Error processing transfer. Please try again.", "error");
  }
}

// Process deposit request
async function processDeposit(amount, txHash) {
  if (!currentUser || !userData) {
    showToast("Please wait, user data is loading...", "error");
    return;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount < 10 || amount > 2000) {
    showToast("Amount must be between $10 and $2000", "error");
    return;
  }

  if (!txHash || txHash.length < 10) {
    showToast("Please enter a valid transaction hash", "error");
    return;
  }

  const uid = currentUser.uid;
  
  try {
    const updates = {};
    const timestamp = Date.now();
    const depositId = database.ref().child("deposits").push().key;
    const txId = database.ref().child("transactions").push().key;

    // Create deposit record
    updates[`users/${uid}/deposits/${depositId}`] = {
      amount,
      txHash,
      status: "pending",
      timestamp,
      walletAddress: "0xa8Ff9fb93a8E643B91bb8F084dd36AD6Fd100886"
    };
    
    // Create transaction record
    updates[`users/${uid}/transactions/${txId}`] = {
      type: "deposit",
      amount: amount,
      status: "pending",
      timestamp,
      details: `USDT Deposit (BEP20) - TX: ${txHash.substring(0, 10)}...`,
      txHash
    };
    
    // Update admin notifications
    updates[`admin/depositNotifications/${depositId}`] = {
      userId: uid,
      amount,
      txHash,
      timestamp,
      status: "pending"
    };

    // Execute all updates
    await database.ref().update(updates);
    
    // Clear form if exists
    if (document.getElementById("depositAmount")) {
      document.getElementById("depositAmount").value = "";
    }
    if (document.getElementById("transactionHash")) {
      document.getElementById("transactionHash").value = "";
    }
    
    showToast("Deposit request submitted for verification", "success");
    
  } catch (error) {
    console.error("Deposit error:", error);
    showToast("Error processing deposit. Please try again.", "error");
  }
}

// Process withdrawal request
async function processWithdrawal(amount, walletAddress, type = "trading") {
  if (!currentUser || !userData) {
    showToast("Please wait, user data is loading...", "error");
    return;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount <= 0) {
    showToast("Invalid withdrawal amount", "error");
    return;
  }

  if (!walletAddress || walletAddress.length < 10) {
    showToast("Please enter a valid wallet address", "error");
    return;
  }

  const uid = currentUser.uid;
  let availableBalance = 0;
  
  if (type === "trading") {
    availableBalance = parseFloat(userData.tradingProfit || 0);
    if (amount < 20) {
      showToast("Minimum trading withdrawal is $20", "error");
      return;
    }
  } else {
    availableBalance = parseFloat(userData.referralEarnings || 0);
    if (amount < 10) {
      showToast("Minimum referral withdrawal is $10", "error");
      return;
    }
  }
  
  if (amount > availableBalance) {
    showToast("Insufficient balance for withdrawal", "error");
    return;
  }

  try {
    const updates = {};
    const timestamp = Date.now();
    const withdrawalId = database.ref().child("withdrawals").push().key;
    const txId = database.ref().child("transactions").push().key;

    // Create withdrawal record
    updates[`users/${uid}/withdrawals/${withdrawalId}`] = {
      amount,
      walletAddress,
      type,
      status: "pending",
      timestamp
    };
    
    // Create transaction record
    updates[`users/${uid}/transactions/${txId}`] = {
      type: "withdrawal",
      amount: -amount,
      status: "pending",
      timestamp,
      details: `${type === "trading" ? "Trading" : "Referral"} withdrawal to ${walletAddress.substring(0, 6)}...`,
      walletAddress
    };
    
    // Update admin notifications
    updates[`admin/withdrawalNotifications/${withdrawalId}`] = {
      userId: uid,
      amount,
      walletAddress,
      type,
      timestamp,
      status: "pending"
    };

    // Execute all updates
    await database.ref().update(updates);
    
    // Clear form if exists
    if (document.getElementById("withdrawalAmount")) {
      document.getElementById("withdrawalAmount").value = "";
    }
    if (document.getElementById("walletAddress")) {
      document.getElementById("walletAddress").value = "";
    }
    
    showToast("Withdrawal request submitted for processing", "success");
    
  } catch (error) {
    console.error("Withdrawal error:", error);
    showToast("Error processing withdrawal. Please try again.", "error");
  }
}

// Change password
async function changePassword(currentPassword, newPassword) {
  if (!currentUser) {
    showToast("Please log in first", "error");
    return;
  }

  if (!currentPassword || !newPassword) {
    showToast("Please enter both current and new password", "error");
    return;
  }

  if (newPassword.length < 8) {
    showToast("New password must be at least 8 characters", "error");
    return;
  }

  try {
    // Reauthenticate user
    const credential = firebase.auth.EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    
    await currentUser.reauthenticateWithCredential(credential);
    
    // Update password
    await currentUser.updatePassword(newPassword);
    
    showToast("Password changed successfully", "success");
    
    // Clear form if exists
    if (document.getElementById("currentPassword")) {
      document.getElementById("currentPassword").value = "";
    }
    if (document.getElementById("newPassword")) {
      document.getElementById("newPassword").value = "";
    }
    if (document.getElementById("confirmPassword")) {
      document.getElementById("confirmPassword").value = "";
    }
    
  } catch (error) {
    console.error("Password change error:", error);
    
    let errorMessage = "Error changing password";
    if (error.code === "auth/wrong-password") {
      errorMessage = "Current password is incorrect";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "New password is too weak";
    }
    
    showToast(errorMessage, "error");
  }
}

// Show toast notification
function showToast(message, type = "success") {
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

// Initialize all page elements and event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Package purchase buttons
  document.querySelectorAll("[data-package]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = parseFloat(btn.getAttribute("data-package"));
      const packageName = btn.getAttribute("data-name");
      if (!isNaN(amount)) {
        purchasePackage(amount, packageName);
      }
    });
  });

  // Transfer button
  const transferBtn = document.getElementById("submitTransfer");
  if (transferBtn) {
    transferBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const recipientId = document.getElementById("recipientId").value;
      const amount = parseFloat(document.getElementById("transferAmount").value);
      
      if (!recipientId || !amount || amount <= 0) {
        showToast("Please enter valid recipient and amount", "error");
        return;
      }
      
      transferFunds(recipientId, amount);
    });
  }

  // Withdrawal button
  const withdrawalBtn = document.getElementById("submitWithdrawal");
  if (withdrawalBtn) {
    withdrawalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("withdrawalAmount").value);
      const walletAddress = document.getElementById("walletAddress").value;
      const type = document.getElementById("withdrawalType").value;
      
      if (!amount || amount <= 0 || !walletAddress) {
        showToast("Please enter valid amount and wallet address", "error");
        return;
      }
      
      processWithdrawal(amount, walletAddress, type);
    });
  }

  // Deposit button
  const depositBtn = document.getElementById("submitDeposit");
  if (depositBtn) {
    depositBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("depositAmount").value);
      const txHash = document.getElementById("transactionHash").value.trim();
      
      if (!amount || amount <= 0 || !txHash) {
        showToast("Please enter valid amount and transaction hash", "error");
        return;
      }
      
      processDeposit(amount, txHash);
    });
  }

  // Change password button
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      
      if (newPassword !== confirmPassword) {
        showToast("New passwords do not match", "error");
        return;
      }
      
      changePassword(currentPassword, newPassword);
    });
  }

  // Copy referral link button
  const copyReferralBtn = document.getElementById("copyReferralLink");
  if (copyReferralBtn) {
    copyReferralBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const referralLink = document.getElementById("referralLink");
      referralLink.select();
      document.execCommand("copy");
      showToast("Referral link copied to clipboard", "success");
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutLink");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      auth.signOut().then(() => {
        window.location.href = "login.html";
      }).catch((error) => {
        console.error("Logout error:", error);
        showToast("Error logging out. Please try again.", "error");
      });
    });
  }

  // Menu toggle for mobile
  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.classList.toggle("open");
      }
    });
  }
});

// Handle login form submission
function handleLogin(email, password) {
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      showToast("Login successful", "success");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed";
      if (error.code === "auth/user-not-found") {
        errorMessage = "User not found";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Try again later";
      }
      
      showToast(errorMessage, "error");
    });
}

// Handle signup form submission
function handleSignup(name, email, password, mobile, sponsorId) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Create user data in database
      return database.ref("users/" + user.uid).set({
        name,
        email,
        mobileNumber: mobile,
        balance: 0,
        tradingProfit: 0,
        referralEarnings: 0,
        teamEarnings: 0,
        referredBy: sponsorId || null,
        joinDate: new Date().toISOString(),
        lastActive: Date.now(),
        accountStatus: "active",
        kycVerified: false,
        walletAddress: "",
        teamStructure: {
          level1Count: 0,
          level2Count: 0,
          level3Count: 0,
          level4Count: 0,
          level5Count: 0
        }
      });
    })
    .then(() => {
      showToast("Account created successfully", "success");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Signup error:", error);
      
      let errorMessage = "Signup failed";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email already in use";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }
      
      showToast(errorMessage, "error");
    });
}
