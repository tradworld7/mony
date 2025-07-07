// transfer.js - User to User Transfer System with Firebase v9+

import { 
  getDatabase, 
  ref, 
  update, 
  push, 
  child, 
  get,
  serverTimestamp 
} from "firebase/database";
import { app, auth } from "./auth.js"; // Assuming auth.js exports these

const database = getDatabase(app);

document.addEventListener('DOMContentLoaded', function() {
    // Load current balance
    if (auth.currentUser && userData) {
        document.getElementById('currentBalance').textContent = '$' + (userData.balance || '0.00').toFixed(2);
    }

    // Transfer button click handler
    document.getElementById('submitTransfer')?.addEventListener('click', transferFunds);
});

async function transferFunds() {
    const recipientId = document.getElementById('recipientId')?.value.trim();
    const amount = parseFloat(document.getElementById('transferAmount')?.value);
    const currentBalance = parseFloat(userData?.balance || 0);

    // Validation
    if (!recipientId) {
        showToast('Please enter recipient User ID', 'error');
        return;
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
        showToast('Please enter valid amount', 'error');
        return;
    }

    if (amount > currentBalance) {
        showToast('Insufficient balance for transfer', 'error');
        return;
    }

    if (recipientId === auth.currentUser?.uid) {
        showToast('Cannot transfer to yourself', 'error');
        return;
    }

    try {
        // Check if recipient exists
        const recipientRef = ref(database, `users/${recipientId}`);
        const snapshot = await get(recipientRef);
        
        if (!snapshot.exists()) {
            showToast('Recipient not found', 'error');
            return;
        }

        // Start transaction
        const updates = {};
        const timestamp = serverTimestamp();
        const transactionId = push(child(ref(database), 'transactions')).key;

        // Update sender balance
        updates[`users/${auth.currentUser.uid}/balance`] = currentBalance - amount;
        
        // Update recipient balance
        const recipientBalance = parseFloat(snapshot.val().balance || 0);
        updates[`users/${recipientId}/balance`] = recipientBalance + amount;
        
        // Record transaction
        updates[`transactions/${transactionId}`] = {
            senderId: auth.currentUser.uid,
            recipientId: recipientId,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };

        // Save sender transaction history
        updates[`users/${auth.currentUser.uid}/transactions/${transactionId}`] = {
            type: 'sent',
            to: recipientId,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };

        // Save recipient transaction history
        updates[`users/${recipientId}/transactions/${transactionId}`] = {
            type: 'received',
            from: auth.currentUser.uid,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };

        // Execute all updates atomically
        await update(ref(database), updates);
        
        showToast(`Successfully transferred $${amount.toFixed(2)} to user ${recipientId}`, 'success');
        
        // Refresh data
        await loadUserData(auth.currentUser.uid);
        document.getElementById('transferAmount').value = '';
        document.getElementById('recipientId').value = '';
        
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Transfer failed: ' + error.message, 'error');
    }
}

// Helper function to show notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
