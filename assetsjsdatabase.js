// Load user data from Firebase
function loadUserData(userId) {
    database.ref('users/' + userId).once('value').then(snapshot => {
        userData = snapshot.val();
        if (userData) {
            updateUIWithUserData();
        }
    }).catch(error => {
        showToast('Error loading user data: ' + error.message, 'error');
    });
}

// Update UI with user data
function updateUIWithUserData() {
    if (!userData || !currentUser) return;
    
    // Dashboard
    if (document.getElementById('userBalance')) {
        document.getElementById('userBalance').textContent = '$' + (userData.balance || '0.00');
    }
    if (document.getElementById('tradingProfit')) {
        document.getElementById('tradingProfit').textContent = '$' + (userData.tradingProfit || '0.00');
    }
    if (document.getElementById('directReferrals')) {
        document.getElementById('directReferrals').textContent = userData.directReferrals ? Object.keys(userData.directReferrals).length : '0';
    }
    if (document.getElementById('referralProfit')) {
        document.getElementById('referralProfit').textContent = 'Earnings: $' + (userData.referralProfit || '0.00');
    }
    if (document.getElementById('teamEarnings')) {
        document.getElementById('teamEarnings').textContent = '$' + (userData.teamEarnings || '0.00');
    }
    
    // Profile
    if (document.getElementById('fullName')) {
        document.getElementById('fullName').value = userData.name || '';
    }
    if (document.getElementById('userEmail')) {
        document.getElementById('userEmail').value = currentUser.email || '';
    }
    if (document.getElementById('mobileNumber')) {
        document.getElementById('mobileNumber').value = userData.mobile || '';
    }
    if (document.getElementById('userId')) {
        document.getElementById('userId').value = currentUser.uid;
    }
    if (document.getElementById('accountCreated')) {
        document.getElementById('accountCreated').value = new Date(currentUser.metadata.creationTime).toLocaleString();
    }
    
    // Withdrawal
    if (document.getElementById('availableTradingProfit')) {
        document.getElementById('availableTradingProfit').textContent = '$' + (userData.availableTradingProfit || '0.00');
    }
    if (document.getElementById('availableReferralProfit')) {
        document.getElementById('availableReferralProfit').textContent = '$' + (userData.availableReferralProfit || '0.00');
    }
    
    // Update withdrawal history if exists
    if (userData.withdrawals && document.getElementById('withdrawalHistory')) {
        updateWithdrawalHistory(userData.withdrawals);
    }
    
    // Update referral list if exists
    if (userData.directReferrals && document.getElementById('referralList')) {
        updateReferralList(userData.directReferrals);
    }
    
    // Update trading history if exists
    if (userData.trades && document.getElementById('tradingHistoryList')) {
        updateTradingHistory(userData.trades);
    }
    
    // Update team structure if exists
    if (userData.teamStructure && document.getElementById('teamMembersList')) {
        updateTeamStructure(userData.teamStructure);
    }
}

// Update withdrawal history table
function updateWithdrawalHistory(withdrawals) {
    const withdrawalHistory = document.getElementById('withdrawalHistory');
    if (!withdrawalHistory) return;
    
    withdrawalHistory.innerHTML = '';
    
    Object.entries(withdrawals).forEach(([key, withdrawal]) => {
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(withdrawal.timestamp).toLocaleString();
        
        const amountCell = document.createElement('td');
        amountCell.textContent = '$' + withdrawal.amount.toFixed(2);
        
        const typeCell = document.createElement('td');
        typeCell.textContent = withdrawal.type === 'trading' ? 'Trading Profit' : 'Referral Profit';
        
        const addressCell = document.createElement('td');
        addressCell.textContent = withdrawal.walletAddress.substring(0, 6) + '...' + withdrawal.walletAddress.substring(withdrawal.walletAddress.length - 4);
        
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge ' + 
            (withdrawal.status === 'completed' ? 'badge-success' : 
             withdrawal.status === 'pending' ? 'badge-warning' : 'badge-danger');
        statusBadge.textContent = withdrawal.status;
        statusCell.appendChild(statusBadge);
        
        row.appendChild(dateCell);
        row.appendChild(amountCell);
        row.appendChild(typeCell);
        row.appendChild(addressCell);
        row.appendChild(statusCell);
        
        withdrawalHistory.appendChild(row);
    });
}

// Update referral list
function updateReferralList(referrals) {
    const referralList = document.getElementById('referralList');
    if (!referralList) return;
    
    referralList.innerHTML = '';
    
    Object.entries(referrals).forEach(([userId, referral]) => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = referral.name;
        
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(referral.joinDate).toLocaleDateString();
        
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge ' + (referral.investment > 0 ? 'badge-success' : 'badge-warning');
        statusBadge.textContent = referral.investment > 0 ? 'Active' : 'Inactive';
        statusCell.appendChild(statusBadge);
        
        const investmentCell = document.createElement('td');
        investmentCell.textContent = '$' + (referral.investment || '0.00');
        
        const earningsCell = document.createElement('td');
        earningsCell.textContent = '$' + (referral.earnings || '0.00');
        
        row.appendChild(nameCell);
        row.appendChild(dateCell);
        row.appendChild(statusCell);
        row.appendChild(investmentCell);
        row.appendChild(earningsCell);
        
        referralList.appendChild(row);
    });
}

// Update trading history
function updateTradingHistory(trades) {
    const tradingHistoryList = document.getElementById('tradingHistoryList');
    if (!tradingHistoryList) return;
    
    tradingHistoryList.innerHTML = '';
    
    Object.entries(trades).forEach(([tradeId, trade]) => {
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = tradeId.substring(0, 8);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(trade.timestamp).toLocaleDateString();
        
        const amountCell = document.createElement('td');
        amountCell.textContent = '$' + trade.amount.toFixed(2);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = '$' + (trade.currentValue || trade.amount * 2).toFixed(2);
        
        const profitCell = document.createElement('td');
        const profit = (trade.currentValue || trade.amount * 2) - trade.amount;
        const profitPercent = (profit / trade.amount) * 100;
        profitCell.textContent = '$' + profit.toFixed(2) + ' (' + profitPercent.toFixed(2) + '%)';
        profitCell.className = profit >= 0 ? 'profit' : 'loss';
        
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge ' + (trade.status === 'completed' ? 'badge-success' : 'badge-warning');
        statusBadge.textContent = trade.status === 'completed' ? 'Completed' : 'Active';
        statusCell.appendChild(statusBadge);
        
        row.appendChild(idCell);
        row.appendChild(dateCell);
        row.appendChild(amountCell);
        row.appendChild(valueCell);
        row.appendChild(profitCell);
        row.appendChild(statusCell);
        
        tradingHistoryList.appendChild(row);
    });
}

// Update team structure
function updateTeamStructure(team) {
    if (document.getElementById('level1Count')) {
        document.getElementById('level1Count').textContent = team.level1 ? Object.keys(team.level1).length : '0';
    }
    if (document.getElementById('level1Earnings')) {
        document.getElementById('level1Earnings').textContent = '$' + (team.level1Earnings || '0.00');
    }
    
    if (document.getElementById('level2Count')) {
        document.getElementById('level2Count').textContent = team.level2 ? Object.keys(team.level2).length : '0';
    }
    if (document.getElementById('level2Earnings')) {
        document.getElementById('level2Earnings').textContent = '$' + (team.level2Earnings || '0.00');
    }
    
    if (document.getElementById('level3Count')) {
        document.getElementById('level3Count').textContent = team.level3 ? Object.keys(team.level3).length : '0';
    }
    if (document.getElementById('level3Earnings')) {
        document.getElementById('level3Earnings').textContent = '$' + (team.level3Earnings || '0.00');
    }
    
    if (document.getElementById('level4Count')) {
        document.getElementById('level4Count').textContent = team.level4 ? Object.keys(team.level4).length : '0';
    }
    if (document.getElementById('level4Earnings')) {
        document.getElementById('level4Earnings').textContent = '$' + (team.level4Earnings || '0.00');
    }
    
    if (document.getElementById('level5Count')) {
        document.getElementById('level5Count').textContent = team.level5 ? Object.keys(team.level5).length : '0';
    }
    if (document.getElementById('level5Earnings')) {
        document.getElementById('level5Earnings').textContent = '$' + (team.level5Earnings || '0.00');
    }
    
    // Update team members list
    const teamMembersList = document.getElementById('teamMembersList');
    if (!teamMembersList) return;
    
    teamMembersList.innerHTML = '';
    
    // Add level 1 members
    if (team.level1) {
        Object.entries(team.level1).forEach(([userId, member]) => {
            addTeamMemberRow(userId, member, 1);
        });
    }
    
    // Add level 2 members
    if (team.level2) {
        Object.entries(team.level2).forEach(([userId, member]) => {
            addTeamMemberRow(userId, member, 2);
        });
    }
    
    // Add level 3 members
    if (team.level3) {
        Object.entries(team.level3).forEach(([userId, member]) => {
            addTeamMemberRow(userId, member, 3);
        });
    }
    
    // Add level 4 members
    if (team.level4) {
        Object.entries(team.level4).forEach(([userId, member]) => {
            addTeamMemberRow(userId, member, 4);
        });
    }
    
    // Add level 5 members
    if (team.level5) {
        Object.entries(team.level5).forEach(([userId, member]) => {
            addTeamMemberRow(userId, member, 5);
        });
    }
}

// Add team member row to table
function addTeamMemberRow(userId, member, level) {
    const teamMembersList = document.getElementById('teamMembersList');
    if (!teamMembersList) return;
    
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = member.name;
    
    const levelCell = document.createElement('td');
    levelCell.textContent = 'Level ' + level;
    
    const dateCell = document.createElement('td');
    dateCell.textContent = new Date(member.joinDate).toLocaleDateString();
    
    const investmentCell = document.createElement('td');
    investmentCell.textContent = '$' + (member.investment || '0.00');
    
    const earningsCell = document.createElement('td');
    earningsCell.textContent = '$' + (member.earnings || '0.00');
    
    row.appendChild(nameCell);
    row.appendChild(levelCell);
    row.appendChild(dateCell);
    row.appendChild(investmentCell);
    row.appendChild(earningsCell);
    
    teamMembersList.appendChild(row);
}

// Submit deposit request
function submitDepositRequest() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const hash = document.getElementById('transactionHash').value.trim();
    
    if (!amount || amount < 10 || amount > 500) {
        showToast('Please enter a valid amount between $10 and $500', 'error');
        return;
    }
    
    if (!hash) {
        showToast('Please enter your transaction hash', 'error');
        return;
    }
    
    // Create deposit record
    const depositRef = database.ref(`users/${currentUser.uid}/deposits`).push();
    
    depositRef.set({
        amount: amount,
        hash: hash,
        status: 'pending',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        showToast('Deposit submitted for verification', 'success');
        document.getElementById('depositModal').classList.remove('open');
        document.getElementById('depositAmount').value = '';
        document.getElementById('transactionHash').value = '';
        
        // Simulate verification after 5 seconds
        setTimeout(() => {
            depositRef.update({ status: 'completed' });
            
            // Update user balance
            database.ref(`users/${currentUser.uid}/balance`).transaction(balance => {
                return (balance || 0) + amount;
            }).then(() => {
                showToast(`$${amount} has been credited to your account`, 'success');
            });
        }, 5000);
    }).catch(error => {
        showToast('Error submitting deposit: ' + error.message, 'error');
    });
}

// Submit withdrawal request
function submitWithdrawalRequest() {
    const type = document.getElementById('withdrawalType').value;
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const address = document.getElementById('walletAddress').value.trim();
    
    // Validate inputs
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (type === 'trading' && amount < 20) {
        showToast('Minimum trading profit withdrawal is $20', 'error');
        return;
    }
    
    if (type === 'referral' && amount < 10) {
        showToast('Minimum referral profit withdrawal is $10', 'error');
        return;
    }
    
    if (!address) {
        showToast('Please enter your wallet address', 'error');
        return;
    }
    
    // Check available balance
    const availableBalance = type === 'trading' ? 
        (userData.availableTradingProfit || 0) : 
        (userData.availableReferralProfit || 0);
    
    if (amount > availableBalance) {
        showToast(`Insufficient ${type} profit for withdrawal`, 'error');
        return;
    }
    
    // Create withdrawal record
    const withdrawalRef = database.ref(`users/${currentUser.uid}/withdrawals`).push();
    
    withdrawalRef.set({
        type: type,
        amount: amount,
        walletAddress: address,
        status: 'pending',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        showToast('Withdrawal request submitted', 'success');
        document.getElementById('withdrawalAmount').value = '';
        document.getElementById('walletAddress').value = '';
        
        // Update available balance
        const updates = {};
        if (type === 'trading') {
            updates['availableTradingProfit'] = availableBalance - amount;
        } else {
            updates['availableReferralProfit'] = availableBalance - amount;
        }
        
        database.ref(`users/${currentUser.uid}`).update(updates).then(() => {
            loadUserData(currentUser.uid);
        });
    }).catch(error => {
        showToast('Error submitting withdrawal: ' + error.message, 'error');
    });
}

// Purchase investment package
function purchasePackage(packageAmount) {
    if (!currentUser || !userData) return;
    
    const amount = parseFloat(packageAmount);
    
    if (userData.balance < amount) {
        showToast('Insufficient balance to purchase this package', 'error');
        return;
    }
    
    // Create trade record
    const tradeRef = database.ref(`users/${currentUser.uid}/trades`).push();
    
    tradeRef.set({
        amount: amount,
        status: 'active',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        // Update user balance
        database.ref(`users/${currentUser.uid}/balance`).transaction(balance => {
            return (balance || 0) - amount;
        });
        
        // Distribute funds according to business logic
        distributePackageFunds(amount);
        
        showToast(`Package purchased successfully!`, 'success');
    }).catch(error => {
        showToast('Error purchasing package: ' + error.message, 'error');
    });
}

// Distribute package funds according to business logic
function distributePackageFunds(packageAmount) {
    // In a real app, this would be done via Firebase Functions for security
    
    // 10% to sponsor (Level 1)
    const level1Amount = packageAmount * 0.1;
    
    // 2% to each of levels 2-5 (total 8%)
    const level2to5Amount = packageAmount * 0.02;
    
    // 10% to admin
    const adminAmount = packageAmount * 0.1;
    
    // 70% to be distributed to active users (would be done via a Firebase Function)
    
    // For demo purposes, we'll just simulate updating the sponsor's earnings
    if (userData.sponsorId && userData.sponsorId !== 'TW1381') {
        database.ref('users').orderByChild('userId').equalTo(userData.sponsorId).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const sponsorData = snapshot.val();
                    const sponsorId = Object.keys(sponsorData)[0];
                    
                    // Update sponsor's referral earnings
                    database.ref(`users/${sponsorId}/referralProfit`).transaction(profit => {
                        return (profit || 0) + level1Amount;
                    });
                    
                    // Update sponsor's available referral profit
                    database.ref(`users/${sponsorId}/availableReferralProfit`).transaction(profit => {
                        return (profit || 0) + level1Amount;
                    });
                    
                    // Update this user in sponsor's directReferrals
                    database.ref(`users/${sponsorId}/directReferrals/${currentUser.uid}/earnings`).transaction(earnings => {
                        return (earnings || 0) + level1Amount;
                    });
                    
                    // Update this user in sponsor's directReferrals investment
                    database.ref(`users/${sponsorId}/directReferrals/${currentUser.uid}/investment`).transaction(investment => {
                        return (investment || 0) + packageAmount;
                    });
                }
            });
    }
    
    // Simulate updating team structure earnings (would be more complex in real app)
    if (userData.teamStructure) {
        const updates = {};
        
        // Level 1 already handled above
        
        // Level 2
        if (userData.teamStructure.level2) {
            updates['teamStructure.level2Earnings'] = (userData.teamStructure.level2Earnings || 0) + level2to5Amount;
        }
        
        // Level 3
        if (userData.teamStructure.level3) {
            updates['teamStructure.level3Earnings'] = (userData.teamStructure.level3Earnings || 0) + level2to5Amount;
        }
        
        // Level 4
        if (userData.teamStructure.level4) {
            updates['teamStructure.level4Earnings'] = (userData.teamStructure.level4Earnings || 0) + level2to5Amount;
        }
        
        // Level 5
        if (userData.teamStructure.level5) {
            updates['teamStructure.level5Earnings'] = (userData.teamStructure.level5Earnings || 0) + level2to5Amount;
        }
        
        // Update team earnings
        database.ref(`users/${currentUser.uid}`).update(updates);
    }
    
    // Simulate adding to trading profit after some time (would be calculated in real app)
    setTimeout(() => {
        database.ref(`users/${currentUser.uid}/tradingProfit`).transaction(profit => {
            return (profit || 0) + packageAmount;
        });
        
        database.ref(`users/${currentUser.uid}/availableTradingProfit`).transaction(profit => {
            return (profit || 0) + packageAmount;
        });
    }, 3000);
}