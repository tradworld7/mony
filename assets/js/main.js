// Firebase Initialization (Modular v9+)
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";

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

// Generate random trading data (Connected to Firebase)
function generateTradingData() {
    if (!currentUser) return;

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
        
        // Asset info cells
        const cells = [
            `${asset.name} (${asset.symbol})`,
            '$' + asset.investment.toLocaleString(),
            '$' + (asset.investment * (0.7 + Math.random() * 0.6)).toLocaleString(undefined, { maximumFractionDigits: 2 })
        ];

        // Profit/Loss Calculation
        const profit = (parseFloat(cells[2].replace(/[^0-9.-]+/g,"")) - asset.investment;
        const profitPercent = (profit / asset.investment) * 100;
        cells.push(
            '$' + profit.toLocaleString(undefined, { maximumFractionDigits: 2 }) + 
            ' (' + profitPercent.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%)'
        );

        // Daily Change
        const dailyChange = -5 + Math.random() * 10;
        cells.push(dailyChange.toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%');

        // Create cells
        cells.forEach((text, index) => {
            const cell = document.createElement('td');
            cell.textContent = text;
            
            // Style profit/loss cells
            if (index === 3) cell.className = profit >= 0 ? 'profit' : 'loss';
            if (index === 4) cell.className = dailyChange >= 0 ? 'profit' : 'loss';
            
            row.appendChild(cell);
        });

        tradingData.appendChild(row);
    });

    // Update last updated time in Firebase
    if (document.getElementById('lastUpdated')) {
        const time = new Date().toLocaleTimeString();
        document.getElementById('lastUpdated').textContent = time;
        // You can save this to Firebase if needed
    }

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

// Load user data from Firebase
function loadUserData(userId) {
    const userRef = ref(database, 'users/' + userId);
    
    onValue(userRef, (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            console.log("User data loaded:", userData);
            // You can update UI here
        }
    }, (error) => {
        console.error("Error loading user data:", error);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupSidebarToggle();
    
    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            localStorage.setItem('tradeWorldUser', JSON.stringify({
                uid: user.uid,
                email: user.email
            }));
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
});
