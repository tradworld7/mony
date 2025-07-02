// Generate random trading data
function generateTradingData() {
    const assets = [
        { name: 'Bitcoin', symbol: 'BTC', investment: 5000 },
        { name: 'Ethereum', symbol: 'ETH', investment: 3500 },
        { name: 'Solana', symbol: 'SOL', investment: 1200 },
        { name: 'XRP', symbol: 'XRP', investment: 800 },
        { name: 'Cardano', symbol: 'ADA', investment: 600 },
        { name: 'USDT', symbol: 'USDT', investment: 10000 }
    ];
    
    const tradingData = document.getElementById('tradingData');
    if (!tradingData) return;
    
    tradingData.innerHTML = '';
    
    assets.forEach(asset => {
        const row = document.createElement('tr');
        
        // Asset name
        const nameCell = document.createElement('td');
        nameCell.textContent = `${asset.name} (${asset.symbol})`;
        
        // Investment
        const investmentCell = document.createElement('td');
        investmentCell.textContent = '$' + asset.investment.toLocaleString();
        
        // Current value (random between 70% and 130% of investment)
        const currentValue = asset.investment * (0.7 + Math.random() * 0.6);
        const currentValueCell = document.createElement('td');
        currentValueCell.textContent = '$' + currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
        
        // Profit/Loss
        const profit = currentValue - asset.investment;
        const profitPercent = (profit / asset.investment) * 100;
        const profitCell = document.createElement('td');
        profitCell.textContent = '$' + profit.toLocaleString(undefined, { maximumFractionDigits: 2 }) + 
                               ' (' + profitPercent.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%)';
        profitCell.className = profit >= 0 ? 'profit' : 'loss';
        
        // 24h change (random between -5% and +5%)
        const dailyChange = -5 + Math.random() * 10;
        const changeCell = document.createElement('td');
        changeCell.textContent = dailyChange.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%';
        changeCell.className = dailyChange >= 0 ? 'profit' : 'loss';
        
        row.appendChild(nameCell);
        row.appendChild(investmentCell);
        row.appendChild(currentValueCell);
        row.appendChild(profitCell);
        row.appendChild(changeCell);
        
        tradingData.appendChild(row);
    });
    
    // Update last updated time
    if (document.getElementById('lastUpdated')) {
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    }
    
    // Update every 30 seconds to simulate live data
    setTimeout(generateTradingData, 30000);
}

// Setup sidebar toggle
function setupSidebarToggle() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

// Initialize common functionality
document.addEventListener('DOMContentLoaded', function() {
    setupSidebarToggle();
    
    // Check if user is logged in from local storage
    const savedUser = localStorage.getItem('tradeWorldUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && user.uid) {
            // User is logged in, no need to redirect
        } else {
            // Not logged in, redirect to login if not on auth pages
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        }
    } else {
        // Not logged in, redirect to login if not on auth pages
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('signup.html')) {
            window.location.href = 'login.html';
        }
    }
});