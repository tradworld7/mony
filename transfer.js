// transfer.js - User to User Transfer System

document.addEventListener('DOMContentLoaded', function() {
    // Load current balance
    if (currentUser && userData) {
        document.getElementById('currentBalance').textContent = '$' + (userData.balance || '0.00');
    }

    // Transfer button click handler
    document.getElementById('submitTransfer').addEventListener('click', transferFunds);
});

async function transferFunds() {
    const recipientId = document.getElementById('recipientId').value.trim();
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const currentBalance = parseFloat(userData.balance || 0);

    // Validation
    if (!recipientId) {
        showToast('Please enter recipient User ID', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        showToast('Please enter valid amount', 'error');
        return;
    }

    if (amount > currentBalance) {
        showToast('Insufficient balance for transfer', 'error');
        return;
    }

    if (recipientId === currentUser.uid) {
        showToast('Cannot transfer to yourself', 'error');
        return;
    }

    try {
        // Check if recipient exists
        const recipientRef = database.ref('users/' + recipientId);
        const snapshot = await recipientRef.once('value');
        
        if (!snapshot.exists()) {
            showToast('Recipient not found', 'error');
            return;
        }

        // Start transaction
        const updates = {};
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const transactionId = database.ref().child('transactions').push().key;

        // Update sender balance
        updates[`users/${currentUser.uid}/balance`] = currentBalance - amount;
        
        // Update recipient balance
        const recipientBalance = parseFloat(snapshot.val().balance || 0);
        updates[`users/${recipientId}/balance`] = recipientBalance + amount;
        
        // Record transaction
        updates[`transactions/${transactionId}`] = {
            senderId: currentUser.uid,
            recipientId: recipientId,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };

        // Save sender transaction history
        updates[`users/${currentUser.uid}/transactions/${transactionId}`] = {
            type: 'sent',
            to: recipientId,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };

        // Save recipient transaction history
        updates[`users/${recipientId}/transactions/${transactionId}`] = {
            type: 'received',
            from: currentUser.uid,
            amount: amount,
            timestamp: timestamp,
            status: 'completed'
        };

        // Execute all updates atomically
        await database.ref().update(updates);
        
        showToast(`Successfully transferred $${amount} to user ${recipientId}`, 'success');
        
        // Refresh data
        loadUserData(currentUser.uid);
        document.getElementById('transferAmount').value = '';
        document.getElementById('recipientId').value = '';
        
    } catch (error) {
        console.error('Transfer error:', error);
        showToast('Transfer failed: ' + error.message, 'error');
    }
}