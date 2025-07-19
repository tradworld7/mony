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
    
    // Redirect away from auth pages if already logged in
    if (currentPage === 'login.html' || currentPage === 'signup.html') {
      window.location.href = "index.html";
    }
  } else {
    // Allow access to auth pages when not logged in
    if (currentPage !== 'login.html' && currentPage !== 'signup.html') {
      window.location.href = "login.html";
    }
  }
});

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
        kycVerified: false
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
    case 'home.html':
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
    
    if (document.getElementById("userBalance")) {
      document.getElementById("userBalance").textContent = `$${(userData.balance || 0).toFixed(2)}`;
    }
    
    if (document.getElementById("userName")) {
      document.getElementById("userName").textContent = userData.name || "User";
    }
    
    if (document.getElementById("referralLink")) {
      document.getElementById("referralLink").value = 
        `${window.location.origin}/register.html?ref=${uid}`;
    }
    
  } catch (error) {
    console.error("Error loading common user data:", error);
  }
}

// Dashboard specific data
async function loadDashboardData(uid) {
  try {
    document.getElementById("tradingProfit").textContent = `$${(userData.tradingProfit || 0).toFixed(2)}`;
    document.getElementById("referralEarnings").textContent = `$${(userData.referralEarnings || 0).toFixed(2)}`;
    document.getElementById("teamEarnings").textContent = `$${(userData.teamEarnings || 0).toFixed(2)}`;
    document.getElementById("tradingPoolEarnings").textContent = `$${(userData.tradingPoolEarnings || 0).toFixed(2)}`;
    
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
          <div>$${investment.profitEarned.toFixed(2)} earned</div>
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
        row.innerHTML = `
          <td>${new Date(tx.timestamp).toLocaleString()}</td>
          <td>${tx.type.replace(/_/g, ' ').toUpperCase()}</td>
          <td class="${tx.amount >= 0 ? 'text-success' : 'text-danger'}">
            $${Math.abs(tx.amount).toFixed(2)}
          </td>
          <td>${tx.status}</td>
          <td>${tx.details}</td>
          <td>$${(tx.balanceAfter || 0).toFixed(2)}</td>
        `;
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

// Load invoices
async function loadInvoices(uid) {
  try {
    const container = document.getElementById("invoiceList");
    if (!container) return;
    
    const snapshot = await database.ref(`users/${uid}/transactions`)
      .orderByChild("timestamp")
      .once("value");
    
    const data = snapshot.val() || {};
    container.innerHTML = "";
    
    // Filter for investment transactions
    const investmentTxs = Object.values(data).filter(tx => 
      tx.type === "investment" && tx.amount < 0
    ).reverse();
    
    if (investmentTxs.length > 0) {
      investmentTxs.forEach((tx, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>INV-${(index + 1).toString().padStart(4, '0')}</td>
          <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
          <td>$${Math.abs(tx.amount).toFixed(2)}</td>
          <td>
            <button class="btn btn-sm btn-primary view-invoice" data-id="${tx.timestamp}">
              View Invoice
            </button>
          </td>
        `;
        container.appendChild(row);
      });
      
      // Add event listeners to invoice buttons
      document.querySelectorAll(".view-invoice").forEach(btn => {
        btn.addEventListener("click", () => {
          generateInvoicePDF(btn.dataset.id);
        });
      });
    } else {
      container.innerHTML = `<tr><td colspan="4" class="text-center">No invoices found</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading invoices:", error);
  }
}

// Generate invoice PDF (placeholder - implement with your PDF library)
function generateInvoicePDF(timestamp) {
  // This is a placeholder - implement with your preferred PDF generation library
  console.log("Generating invoice for transaction at:", timestamp);
  showToast("Invoice generation functionality will be implemented here", "info");
}

// Package purchase function (used in packages.html)
async function purchasePackage(amount) {
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
    const adminCommission = amount * 0.10;
    const level2Commission = amount * 0.02;
    const level3Commission = amount * 0.02;
    const level4Commission = amount * 0.02;
    const level5Commission = amount * 0.02;
    const tradingPool = amount * 0.70;
    const userProfit = amount * 0.02;

    // User updates
    updates[`users/${uid}/balance`] = currentBalance - amount + userProfit;
    updates[`users/${uid}/tradingProfit`] = (userData.tradingProfit || 0) + userProfit;

    // Investment record
    updates[`users/${uid}/investments/${packageId}`] = {
      amount,
      status: "active",
      purchaseDate: timestamp,
      expectedReturn: amount * 2,
      maturityDate: timestamp + 30 * 24 * 60 * 60 * 1000,
      profitEarned: 0,
      lastProfitDate: null
    };

    // Transaction records
    updates[`transactions/${txId}`] = {
      userId: uid,
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased package of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    updates[`users/${uid}/transactions/${txId}`] = {
      type: "investment",
      amount: -amount,
      status: "completed",
      timestamp,
      details: `Purchased package of $${amount}`,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount + userProfit
    };

    // Admin commission
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

    // Trading pool
    updates[`system/tradingPool`] = firebase.database.ServerValue.increment(tradingPool);
    updates[`system/poolTransactions/${txId}`] = {
      userId: uid,
      amount: tradingPool,
      timestamp,
      details: `Contribution from ${uid} package purchase`
    };

    // Distribute trading pool to active users
    await distributeTradingPool(tradingPool, timestamp, updates);

    // Referral commissions
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

// Initialize all page elements
window.addEventListener("DOMContentLoaded", () => {
  // Package purchase buttons
  document.querySelectorAll("[data-package]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = parseFloat(btn.getAttribute("data-package"));
      if (!isNaN(amount)) {
        purchasePackage(amount);
      }
    });
  });

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
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
      
      if (!amount || amount <= 0 || !walletAddress) {
        showToast("Please enter valid amount and wallet address", "error");
        return;
      }
      
      requestWithdrawal(amount, walletAddress);
    });
  }

  // Deposit button
  const depositBtn = document.getElementById("submitDeposit");
  if (depositBtn) {
    depositBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("depositAmount").value);
      
      if (!amount || amount <= 0) {
        showToast("Please enter valid amount", "error");
        return;
      }
      
      requestDeposit(amount);
    });
  }
});

// Show toast notification
function showToast(message, type) {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
  
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });
}
// Add this to your app.js file (merge with existing code)

// Invoice generation system
async function generateInvoice(transactionId, userId) {
  try {
    // Get transaction details
    const txSnapshot = await database.ref(`users/${userId}/transactions/${transactionId}`).once("value");
    const transaction = txSnapshot.val();
    
    if (!transaction || transaction.type !== "investment") {
      throw new Error("Not an investment transaction");
    }
    
    // Get user details
    const userSnapshot = await database.ref(`users/${userId}`).once("value");
    const user = userSnapshot.val();
    
    // Create invoice HTML
    const invoiceDate = new Date(transaction.timestamp);
    const invoiceNumber = `INV-${invoiceDate.getFullYear()}${(invoiceDate.getMonth()+1).toString().padStart(2, '0')}${transactionId.substring(0, 5).toUpperCase()}`;
    
    const invoiceHTML = `
      <div class="invoice-container" id="invoiceContent">
        <div class="invoice-header">
          <div class="logo">
            <h2>TradeWorld</h2>
            <p>Investment Invoice</p>
          </div>
          <div class="invoice-info">
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoiceDate.toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="invoice-addresses">
          <div class="billing-address">
            <h3>Billed To:</h3>
            <p>${user.name || 'User'}</p>
            <p>${user.email || ''}</p>
            <p>User ID: ${userId}</p>
          </div>
          <div class="company-address">
            <h3>TradeWorld</h3>
            <p>123 Investment Street</p>
            <p>Financial District</p>
            <p>support@tradworld.com</p>
          </div>
        </div>
        
        <table class="invoice-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Investment Package Purchase</td>
              <td>$${Math.abs(transaction.amount).toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td><strong>Total</strong></td>
              <td><strong>$${Math.abs(transaction.amount).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="invoice-footer">
          <p>Thank you for your investment!</p>
          <p>This is an automated invoice, no signature required.</p>
        </div>
      </div>
    `;
    
    // Create a modal to display the invoice
    const invoiceModal = document.createElement("div");
    invoiceModal.className = "invoice-modal";
    invoiceModal.innerHTML = `
      <div class="invoice-modal-content">
        <div class="invoice-modal-header">
          <h3>Invoice #${invoiceNumber}</h3>
          <button class="close-invoice">&times;</button>
        </div>
        <div class="invoice-modal-body">
          ${invoiceHTML}
        </div>
        <div class="invoice-modal-footer">
          <button class="btn btn-primary print-invoice">Print Invoice</button>
          <button class="btn btn-secondary download-invoice">Download PDF</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(invoiceModal);
    
    // Add event listeners
    invoiceModal.querySelector(".close-invoice").addEventListener("click", () => {
      invoiceModal.remove();
    });
    
    invoiceModal.querySelector(".print-invoice").addEventListener("click", () => {
      printInvoice(invoiceModal.querySelector("#invoiceContent"));
    });
    
    invoiceModal.querySelector(".download-invoice").addEventListener("click", () => {
      downloadInvoiceAsPDF(invoiceModal.querySelector("#invoiceContent"), invoiceNumber);
    });
    
    // Also save the invoice to the database
    await database.ref(`users/${userId}/invoices/${transactionId}`).set({
      invoiceNumber,
      amount: Math.abs(transaction.amount),
      date: transaction.timestamp,
      status: "generated",
      lastViewed: Date.now()
    });
    
  } catch (error) {
    console.error("Error generating invoice:", error);
    showToast("Error generating invoice", "error");
  }
}

// Print invoice function
function printInvoice(element) {
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .invoice-addresses { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .invoice-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .invoice-items th, .invoice-items td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .invoice-items .total td { border-top: 2px solid #333; font-weight: bold; }
          .invoice-footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #777; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// Download invoice as PDF (requires jsPDF library)
function downloadInvoiceAsPDF(element, invoiceNumber) {
  // Check if jsPDF is available
  if (typeof jsPDF !== 'undefined') {
    const doc = new jsPDF();
    
    // Add invoice content to PDF
    doc.html(element, {
      callback: function(doc) {
        doc.save(`invoice_${invoiceNumber}.pdf`);
      },
      margin: [10, 10, 10, 10],
      autoPaging: 'text',
      width: 190,
      windowWidth: element.clientWidth
    });
  } else {
    showToast("PDF library not loaded. Please try printing instead.", "error");
  }
}

// Modify the purchasePackage function to generate invoice after purchase
async function purchasePackage(amount) {
  // ... (keep all existing purchasePackage code until the successful purchase)
  
  // After successful purchase (inside the try block), add:
  showToast(`Package of $${amount.toFixed(2)} purchased successfully!`, "success");
  
  // Generate invoice for this purchase
  await generateInvoice(txId, uid);
  
  // ... (rest of the existing code)
}

// Update the invoices.html page loading
async function loadInvoices(uid) {
  try {
    const container = document.getElementById("invoiceList");
    if (!container) return;
    
    const snapshot = await database.ref(`users/${uid}/transactions`)
      .orderByChild("timestamp")
      .once("value");
    
    const data = snapshot.val() || {};
    container.innerHTML = "";
    
    // Filter for investment transactions
    const investmentTxs = Object.entries(data).filter(([id, tx]) => 
      tx.type === "investment" && tx.amount < 0
    ).sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    if (investmentTxs.length > 0) {
      investmentTxs.forEach(([id, tx], index) => {
        const invoiceDate = new Date(tx.timestamp);
        const invoiceNumber = `INV-${invoiceDate.getFullYear()}${(invoiceDate.getMonth()+1).toString().padStart(2, '0')}${id.substring(0, 5).toUpperCase()}`;
        
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${invoiceNumber}</td>
          <td>${invoiceDate.toLocaleDateString()}</td>
          <td>$${Math.abs(tx.amount).toFixed(2)}</td>
          <td>
            <button class="btn btn-sm btn-primary view-invoice" data-id="${id}">
              View Invoice
            </button>
          </td>
        `;
        container.appendChild(row);
      });
      
      // Add event listeners to invoice buttons
      document.querySelectorAll(".view-invoice").forEach(btn => {
        btn.addEventListener("click", () => {
          generateInvoice(btn.dataset.id, uid);
        });
      });
    } else {
      container.innerHTML = `<tr><td colspan="4" class="text-center">No invoices found</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading invoices:", error);
  }
}

// Add this CSS to your main stylesheet or in a style tag in invoices.html
/*
.invoice-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.invoice-modal-content {
  background: white;
  width: 80%;
  max-width: 900px;
  max-height: 90vh;
  overflow: auto;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 0 20px rgba(0,0,0,0.2);
}

.invoice-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.close-invoice {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.invoice-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.invoice-container {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.invoice-addresses {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.invoice-items {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

.invoice-items th {
  text-align: left;
  padding: 10px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.invoice-items td {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.invoice-items .total td {
  border-top: 2px solid #333;
  font-weight: bold;
}

.invoice-footer {
  text-align: center;
  margin-top: 30px;
  color: #777;
  font-size: 0.9em;
}
*/
// Other functions (transferFunds, distributeTradingPool, handleReferralCommissions, etc.)
// ... (keep all your existing functions from the original file)
// Make sure to include all the functions you had in your original file
