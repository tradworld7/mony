// ✅ Updated app.js — Full Logic for Referral, Admin Commission, Upline, Trading Pool, and Transaction History

const firebaseConfig = { apiKey: "AIzaSyBshAGZScyo7PJegLHMzORbkkrCLGD6U5s", authDomain: "mywebsite-600d3.firebaseapp.com", databaseURL: "https://mywebsite-600d3-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "mywebsite-600d3", storageBucket: "mywebsite-600d3.firebasestorage.app", messagingSenderId: "584485288598", appId: "1:584485288598:web:01856eaa18ba5ada49e0b7", measurementId: "G-GQ9J9QH42J" };

const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1"; firebase.initializeApp(firebaseConfig); const auth = firebase.auth(); const database = firebase.database();

let currentUser = null; let userData = null;

// Auth check auth.onAuthStateChanged((user) => { if (user) { currentUser = user; database.ref("users/" + user.uid).once("value").then((snapshot) => { userData = snapshot.val(); if (!userData) { const defaultUserData = { name: user.displayName || "User", email: user.email, balance: 0, tradingProfit: 0, referralEarnings: 0, teamEarnings: 0, referredBy: null, transactions: {}, investments: {}, directReferrals: {}, lastActive: Date.now(), }; database.ref("users/" + user.uid).set(defaultUserData); userData = defaultUserData; } loadUserData(user.uid); }); } else { window.location.href = "login.html"; } });

async function purchasePackage(amount) { if (!currentUser || !userData) return alert("Please wait, user not loaded");

const currentBalance = parseFloat(userData.balance || 0); if (amount > currentBalance) return alert("Insufficient balance");

const uid = currentUser.uid; const updates = {}; const timestamp = firebase.database.ServerValue.TIMESTAMP; const packageId = database.ref().child("investments").push().key;

const adminCommission = amount * 0.10; const directReferral = amount * 0.10; const uplineCommission = amount * 0.10; // 2% x 5 const tradingPool = amount * 0.70; const userProfit = amount * 0.10;

updates[users/${uid}/balance] = currentBalance - amount + userProfit; updates[users/${uid}/tradingProfit] = (userData.tradingProfit || 0) + userProfit;

updates[users/${uid}/investments/${packageId}] = { amount, status: "active", purchaseDate: timestamp, expectedReturn: amount * 2, maturityDate: Date.now() + 30 * 24 * 60 * 60 * 1000, };

const txId = database.ref().child("transactions").push().key; updates[transactions/${txId}] = { userId: uid, type: "investment", amount, status: "completed", timestamp, details: Purchased package of $${amount}, }; updates[users/${uid}/transactions/${txId}] = { type: "investment", amount, status: "completed", timestamp, details: Purchased package of $${amount}, };

// Admin Commission updates[users/${ADMIN_USER_ID}/balance] = firebase.database.ServerValue.increment(adminCommission); updates[users/${ADMIN_USER_ID}/tradingProfit] = firebase.database.ServerValue.increment(adminCommission);

// Trading Pool updates[system/tradingPool] = firebase.database.ServerValue.increment(tradingPool); updates[system/adminEarnings] = firebase.database.ServerValue.increment(adminCommission);

// Direct referral (10%) if (userData.referredBy) { const refSnapshot = await database.ref(users/${userData.referredBy}).once("value"); if (refSnapshot.exists()) { const refUser = refSnapshot.val(); updates[users/${userData.referredBy}/referralEarnings] = (refUser.referralEarnings || 0) + directReferral; updates[users/${userData.referredBy}/balance] = (refUser.balance || 0) + directReferral;

const refTxId = database.ref().child("transactions").push().key;
  updates[users/${userData.referredBy}/transactions/${refTxId}] = {
    type: "referral",
    amount: directReferral,
    status: "completed",
    timestamp,
    details: Direct referral commission from ${uid},
  };
}

}

// Upline commissions (5 level × 2%) await distributeUpline(userData.referredBy, amount, 1, updates);

await database.ref().update(updates); alert(Package of $${amount} purchased. Profit + commissions distributed.); loadUserData(uid); }

async function distributeUpline(referrerId, amount, level, updates) { if (!referrerId || level > 5) return; const snapshot = await database.ref(users/${referrerId}).once("value"); if (!snapshot.exists()) return; const user = snapshot.val(); const commission = amount * 0.02;

updates[users/${referrerId}/teamEarnings] = (user.teamEarnings || 0) + commission; updates[users/${referrerId}/balance] = (user.balance || 0) + commission;

const txId = database.ref().child("transactions").push().key; updates[users/${referrerId}/transactions/${txId}] = { type: "referral", amount: commission, status: "completed", timestamp: firebase.database.ServerValue.TIMESTAMP, details: Level ${level} referral commission from ${currentUser.uid}, };

await distributeUpline(user.referredBy, amount, level + 1, updates); }

// Load user data to dashboard function loadUserData(uid) { database.ref("users/" + uid).once("value").then((snapshot) => { userData = snapshot.val(); document.getElementById("userBalance").textContent = $${(userData.balance || 0).toFixed(2)}; document.getElementById("tradingProfit").textContent = $${(userData.tradingProfit || 0).toFixed(2)}; document.getElementById("teamEarnings").textContent = $${(userData.teamEarnings || 0).toFixed(2)}; loadTransactionHistory(uid); }); }

function loadTransactionHistory(uid) { database.ref(users/${uid}/transactions).limitToLast(10).once("value").then((snapshot) => { const container = document.getElementById("transactionHistory"); container.innerHTML = ""; const data = snapshot.val(); if (data) { Object.values(data).reverse().forEach((tx) => { const row = document.createElement("tr"); row.innerHTML = <td>${new Date(tx.timestamp).toLocaleString()}</td> <td>${tx.type}</td> <td>$${tx.amount.toFixed(2)}</td> <td>${tx.status}</td> <td>${tx.details}</td>; container.appendChild(row); }); } }); }

window.addEventListener("DOMContentLoaded", () => { document.querySelectorAll("[data-package]").forEach((btn) => { btn.addEventListener("click", () => { const amount = parseFloat(btn.getAttribute("data-package")); if (!isNaN(amount)) purchasePackage(amount); }); }); });
