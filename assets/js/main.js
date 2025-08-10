// Firebase Initialization (Modular v9+)
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, update } from "firebase/database";

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

// Global Variables
let currentUser = null;
let userData = null;

// Enhanced trading data generation with real user investments
async function generateTradingData() {
    if (!currentUser) return;

    try {
        // Get user's actual investments from Firebase
        const investmentsRef = ref(database, `users/${currentUser.uid}/investments`);
        const snapshot = await get(investmentsRef);
        const userInvestments = snapshot.val() || {};
        
        // Default assets if no investments exist
        const defaultAssets = [
            { name: 'Bitcoin', symbol: 'BTC', investment: 5000 },
            { name: 'Ethereum', symbol: 'ETH', investment: 3500 },
            { name: 'Solana', symbol: 'SOL', investment: 1200 }
        ];

        const assets = Object.values(userInvestments).length > 0 
            ? Object.values(userInvestments).map(inv => ({
                name: inv.packageName || 'Investment',
                symbol: inv.packageName?.substring(0, 3) || 'INV',
                investment: inv.amount
              }))
            : defaultAssets;

        const tradingData = document.getElementById('tradingData');
        if (!tradingData) return;
        
        tradingData.innerHTML = '';
        
        assets.forEach(asset => {
            const row = document.createElement('tr');
            
            // Calculate values with realistic fluctuations
            const currentValue = asset.investment * (0.9 + Math.random() * 0.4);
            const profit = currentValue - asset.investment;
            const profitPercent = (profit / asset.investment) * 100;
            const dailyChange = -5 + Math.random() * 10;

            // Create cells
            [
                `${asset.name} (${asset.symbol})`,
                `$${asset.investment.toLocaleString()}`,
                `$${currentValue.toFixed(2)}`,
                `$${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`,
                `${dailyChange.toFixed(2)}%`
            ].forEach((text, index) => {
                const cell = document.createElement('td');
                cell.textContent = text;
                
                if (index === 3) cell.className = profit >= 0 ? 'profit' : 'loss';
                if (index === 4) cell.className = dailyChange >= 0 ? 'profit' : 'loss';
                
                row.appendChild(cell);
            });

            tradingData.appendChild(row);
        });

        // Update last updated time
        if (document.getElementById('lastUpdated')) {
            const time = new Date().toLocaleTimeString();
            document.getElementById('lastUpdated').textContent = time;
            await update(ref(database, `users/${currentUser.uid}`), {
                lastActive: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error("Error generating trading data:", error);
    }

    setTimeout(generateTradingData, 30000);
}

// Enhanced user data loading with UI updates
function loadUserData(userId) {
    const userRef = ref(database, 'users/' + userId);
    
    onValue(userRef, (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            console.log("User data loaded:", userData);
            
            // Update UI elements if they exist
            if (document.getElementById('userBalance')) {
                document.getElementById('userBalance').textContent = 
                    `$${(userData.balance || 0).toFixed(2)}`;
            }
            
            if (document.getElementById('tradingProfit')) {
                document.getElementById('tradingProfit').textContent = 
                    `$${(userData.tradingProfit || 0).toFixed(2)}`;
            }
            
            // Add more UI updates as needed
        }
    }, (error) => {
        console.error("Error loading user data:", error);
    });
}

// Initialize app with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Setup sidebar toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Firebase Auth State Listener
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                localStorage.setItem('tradeWorldUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || "User"
                }));
                
                loadUserData(user.uid);
                generateTradingData();
                
                // Initialize package purchase handlers if on dashboard
                if (window.location.pathname.includes('index.html')) {
                    initPackagePurchases();
                }
            } else {
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('signup.html')) {
                    window.location.href = 'login.html';
                }
            }
        });
        
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

// Initialize package purchase functionality
function initPackagePurchases() {
    document.querySelectorAll('[data-package]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const amount = parseFloat(btn.getAttribute('data-package'));
            const originalText = btn.innerHTML;
            
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processing...';
            
            try {
                // You would call your package purchase function here
                // await processPackagePurchase(amount);
                console.log(`Attempting to purchase $${amount} package`);
                
                // Temporary simulation - replace with actual purchase function
                await new Promise(resolve => setTimeout(resolve, 1500));
                console.log(`Successfully processed $${amount} package`);
                
            } catch (error) {
                console.error('Purchase error:', error);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    });
}
