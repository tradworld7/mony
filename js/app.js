import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    signOut
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    addDoc,
    getDocs,
    onSnapshot,
    updateDoc,
    runTransaction,
    serverTimestamp,
    limit,
    orderBy
} from 'firebase/firestore';
import {
    Home,
    Users,
    DollarSign,
    FileText,
    Package,
    User,
    Share2,
    UserPlus,
    GitMerge,
    TrendingUp,
    Repeat,
    CreditCard,
    LogOut,
    LayoutDashboard,
    XCircle,
    CheckCircle
} from 'lucide-react';

// Define global variables for Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Admin configuration (moved from global scope to inside component or a config file)
const ADMIN_USER_ID = "ZYbqxrCmK6OTDYSntqq0SDS6Gpg1"; // Replace with your actual admin ID
const ADMIN_NAME = "Ramesh Kumar Verma";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 5000); // Auto-hide after 5 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!isVisible) return null;

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const Icon = type === 'success' ? CheckCircle : XCircle;

    return (
        <div className={`fixed bottom-4 right-4 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} z-50`}>
            <Icon className="w-5 h-5 mr-2" />
            <span>{message}</span>
            <button onClick={() => { setIsVisible(false); onClose(); }} className="ml-4 text-white hover:text-gray-200">
                &times;
            </button>
        </div>
    );
};

// Main App Component
const App = () => {
    // State variables for Firebase instances and user information
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); // To track if auth state is determined
    const [userData, setUserData] = useState(null); // Stores current user's data from Firestore
    const [isAdmin, setIsAdmin] = useState(false); // To check if current user is admin

    // State for active menu item and content data
    const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
    const [dashboardData, setDashboardData] = useState({ directReferrals: [], totalTeamEarnings: 0 });
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [depositData, setDepositData] = useState([]);
    const [invoicesData, setInvoicesData] = useState([]);
    const [packagesData, setPackagesData] = useState([]);
    const [profileData, setProfileData] = useState({});
    const [referralData, setReferralData] = useState([]);
    const [teamStructureData, setTeamStructureData] = useState([]);
    const [transferData, setTransferData] = useState([]);
    const [withdrawalData, setWithdrawalData] = useState([]);
    const [adminStats, setAdminStats] = useState(0); // For admin earnings

    // Toast notification state
    const [toast, setToast] = useState(null);

    // Function to show toast notifications
    const showToast = useCallback((message, type) => {
        setToast({ message, type });
    }, []);

    // --- Firebase Initialization and Authentication ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);

            // Listen for authentication state changes
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAdmin(user.uid === ADMIN_USER_ID);
                    console.log("User signed in:", user.uid);
                } else {
                    // If no user, try to sign in with custom token or anonymously
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            console.log("Signed in with custom token.");
                        } else {
                            await signInAnonymously(firebaseAuth);
                            console.log("Signed in anonymously.");
                        }
                    } catch (error) {
                        console.error("Authentication failed:", error);
                        // Fallback to a random ID if anonymous sign-in also fails
                        setUserId(crypto.randomUUID());
                    }
                }
                setIsAuthReady(true); // Auth state has been determined
            });

            // Cleanup subscription on unmount
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            showToast('Failed to initialize Firebase.', 'error');
        }
    }, [initialAuthToken, firebaseConfig, showToast]); // Dependencies for useEffect

    // --- Load User Data from Firestore (Real-time updates) ---
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/data/profile`);
        const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setUserData(data);
                setProfileData(data); // Also update profile data state
                console.log("User data updated from Firestore.");

                // Update dashboard specific data
                const directRefCount = data.directReferrals ? Object.keys(data.directReferrals).length : 0;
                setDashboardData(prev => ({
                    ...prev,
                    directReferrals: Object.values(data.directReferrals || {}),
                    totalTeamEarnings: data.teamEarnings || 0
                }));
                if (data.directReferrals) {
                    updateTeamStructure(data.directReferrals);
                }
            } else {
                console.log("User data not found in Firestore. May be a new anonymous user.");
                // Optionally create a basic profile for new anonymous users
                setUserData(null);
                setProfileData({});
            }
        }, (error) => {
            console.error('Error loading user data:', error);
            showToast('Error loading user data', 'error');
        });

        // Load admin stats if current user is admin
        if (isAdmin) {
            const adminStatsRef = doc(db, `artifacts/${appId}/public/data/system`);
            const unsubscribeAdmin = onSnapshot(adminStatsRef, (snapshot) => {
                if (snapshot.exists()) {
                    setAdminStats(snapshot.data().adminEarnings || 0);
                    console.log("Admin stats updated from Firestore.");
                }
            }, (error) => {
                console.error('Error loading admin stats:', error);
            });
            return () => { unsubscribe(); unsubscribeAdmin(); };
        }

        return () => unsubscribe();
    }, [db, userId, isAuthReady, isAdmin, showToast]);

    // --- Load Transaction History from Firestore (Real-time updates) ---
    const loadTransactionHistory = useCallback(() => {
        if (!db || !userId || !isAuthReady) return;

        // Check local storage first (for initial quick load, then Firestore will update)
        const localTransactions = localStorage.getItem('transactions');
        if (localTransactions) {
            setTransactionHistory(JSON.parse(localTransactions));
            console.log("Transaction history loaded from local storage.");
        }

        const q = query(
            collection(db, `artifacts/${appId}/users/${userId}/transactions`),
            orderBy('timestamp', 'desc'),
            limit(5) // Limit to last 5 transactions
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            setTransactionHistory(transactions);
            localStorage.setItem('transactions', JSON.stringify(transactions)); // Update local storage
            console.log("Transaction history updated from Firestore.");
        }, (error) => {
            console.error('Error loading transaction history:', error);
            showToast('Error loading transactions', 'error');
        });

        return () => unsubscribe(); // Cleanup on unmount or re-run
    }, [db, userId, isAuthReady, showToast]);

    // --- General Data Loading Functions (Simulated for other sections) ---
    const loadDepositData = useCallback(() => {
        // In a real app, you'd fetch from Firestore:
        // const q = query(collection(db, `artifacts/${appId}/users/${userId}/deposits`), orderBy('date', 'desc'));
        // onSnapshot(q, (snapshot) => { ... });
        const deposits = JSON.parse(localStorage.getItem('deposits')) || [
            { id: 'd1', amount: 500, method: 'Bank Transfer', status: 'Completed', date: '2024-06-20' },
            { id: 'd2', amount: 200, method: 'Crypto', status: 'Pending', date: '2024-07-02' },
        ];
        setDepositData(deposits);
        console.log("Deposit data loaded.");
    }, []);

    const loadInvoicesData = useCallback(() => {
        const invoices = JSON.parse(localStorage.getItem('invoices')) || [
            { id: 'inv001', amount: 150, status: 'Paid', date: '2024-05-10' },
            { id: 'inv002', amount: 250, status: 'Due', date: '2024-07-15' },
        ];
        setInvoicesData(invoices);
        console.log("Invoices data loaded.");
    }, []);

    const loadPackagesData = useCallback(() => {
        const packages = JSON.parse(localStorage.getItem('packages')) || [
            { id: 'pkg1', name: 'Starter Plan', price: 100, duration: '30 days' },
            { id: 'pkg2', name: 'Premium Plan', price: 500, duration: '90 days' },
        ];
        setPackagesData(packages);
        console.log("Packages data loaded.");
    }, []);

    const loadReferralData = useCallback(() => {
        const referrals = JSON.parse(localStorage.getItem('referrals')) || [
            { id: 'r1', name: 'Charlie', earnings: 50, date: '2024-06-01' },
            { id: 'r2', name: 'Diana', earnings: 30, date: '2024-06-15' },
        ];
        setReferralData(referrals);
        console.log("Referral data loaded.");
    }, []);

    const loadTeamStructureData = useCallback((directReferrals) => {
        // This function now relies on directReferrals from userData
        const teamList = [];
        if (directReferrals && Object.keys(directReferrals).length > 0) {
            Object.entries(directReferrals).forEach(([id, refData]) => {
                teamList.push({
                    id,
                    name: refData.name || 'No name',
                    joinDate: refData.joinDate,
                    earnings: refData.earnings || 0
                });
            });
        }
        setTeamStructureData(teamList);
        console.log("Team structure data loaded.");
    }, []);

    const loadTransferData = useCallback(() => {
        const transfers = JSON.parse(localStorage.getItem('transfers')) || [
            { id: 'tr1', amount: 75, recipient: 'UserX', date: '2024-07-03' },
            { id: 'tr2', amount: 25, recipient: 'UserY', date: '2024-07-06' },
        ];
        setTransferData(transfers);
        console.log("Transfer data loaded.");
    }, []);

    const loadWithdrawalData = useCallback(() => {
        const withdrawals = JSON.parse(localStorage.getItem('withdrawals')) || [
            { id: 'w1', amount: 100, method: 'Bank', status: 'Processed', date: '2024-06-25' },
            { id: 'w2', amount: 50, method: 'Crypto', status: 'Pending', date: '2024-07-04' },
        ];
        setWithdrawalData(withdrawals);
        console.log("Withdrawal data loaded.");
    }, []);

    // --- Effect to load data when activeMenuItem or auth state changes ---
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;

        // Map menu items to their respective loading functions
        const loadFunctions = {
            dashboard: () => {}, // Dashboard data is loaded via onSnapshot in main useEffect
            'trading-history': loadTransactionHistory,
            deposit: loadDepositData,
            invoices: loadInvoicesData,
            packages: loadPackagesData,
            profile: () => {}, // Profile data is loaded via onSnapshot in main useEffect
            referral: loadReferralData,
            'team-structure': () => loadTeamStructureData(userData?.directReferrals),
            transfer: loadTransferData,
            withdrawal: loadWithdrawalData,
            // For 'index', 'login', 'signup', we just display a message
            index: () => console.log("Home/Index page selected."),
            login: () => console.log("Login page selected."),
            signup: () => console.log("Signup page selected."),
        };

        const loadFunction = loadFunctions[activeMenuItem];
        if (loadFunction) {
            loadFunction();
        }
    }, [activeMenuItem, isAuthReady, db, userId, userData, loadTransactionHistory, loadDepositData, loadInvoicesData, loadPackagesData, loadReferralData, loadTeamStructureData, loadTransferData, loadWithdrawalData]);

    // --- Utility Functions ---
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp); // Handle Firestore Timestamp objects
        return date.toLocaleString();
    };

    const formatDateShort = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
        return date.toLocaleDateString();
    };

    const formatStatus = (status) => {
        if (!status) return 'Completed';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // --- Core Logic Functions (Adapted for Firestore) ---

    // Distribute referral commissions (recursive function for 5 levels)
    const distributeReferralCommissions = useCallback(async (referrerId, amount, currentLevel, batch) => {
        if (currentLevel > 5 || !referrerId) return;

        const referrerDocRef = doc(db, `artifacts/${appId}/users/${referrerId}/data/profile`);
        const referrerSnapshot = await getDoc(referrerDocRef);
        const referrerData = referrerSnapshot.data();

        if (!referrerData) return;

        // Calculate commission (2% per level)
        const commission = amount * 0.02;

        // Update referrer's earnings
        batch.update(referrerDocRef, {
            referralEarnings: (referrerData.referralEarnings || 0) + commission,
            teamEarnings: (referrerData.teamEarnings || 0) + commission,
        });

        // Add transaction record for referrer
        const transactionRef = doc(collection(db, `artifacts/${appId}/users/${referrerId}/transactions`));
        batch.set(transactionRef, {
            type: 'referral',
            amount: commission,
            status: 'completed',
            timestamp: serverTimestamp(),
            details: `Level ${currentLevel} referral commission`
        });

        // Continue to next level if available
        if (referrerData.referredBy && currentLevel < 5) {
            await distributeReferralCommissions(referrerData.referredBy, amount, currentLevel + 1, batch);
        }
    }, [db]);

    // Distribute trading profit equally among all active users (including admin)
    const distributeTradingProfit = useCallback(async (totalProfit) => {
        if (!db) return;

        try {
            await runTransaction(db, async (transaction) => {
                // Get all users
                const usersCollectionRef = collection(db, `artifacts/${appId}/users`);
                const usersSnapshot = await getDocs(usersCollectionRef);

                const activeUsers = [];
                usersSnapshot.forEach(userDoc => {
                    const userData = userDoc.data().data?.profile; // Access nested profile data
                    if (userData && userData.lastActive && (Date.now() - userData.lastActive.toDate()) < (30 * 24 * 60 * 60 * 1000)) {
                        activeUsers.push({ id: userDoc.id, data: userData });
                    }
                });

                if (activeUsers.length === 0) return;

                const profitPerUser = totalProfit / activeUsers.length;

                activeUsers.forEach(user => {
                    const userProfileRef = doc(db, `artifacts/${appId}/users/${user.id}/data/profile`);
                    const currentTradingProfit = user.data.tradingProfit || 0;
                    transaction.update(userProfileRef, {
                        tradingProfit: currentTradingProfit + profitPerUser
                    });

                    // Record profit transaction for each user
                    const transactionRef = doc(collection(db, `artifacts/${appId}/users/${user.id}/transactions`));
                    transaction.set(transactionRef, {
                        type: 'profit',
                        amount: profitPerUser,
                        status: 'completed',
                        timestamp: serverTimestamp(),
                        details: `Trading profit from pool`
                    });
                });

                // Clear the trading pool
                const systemDocRef = doc(db, `artifacts/${appId}/public/data/system`);
                transaction.update(systemDocRef, { tradingPool: 0 });
            });
            console.log("Trading profit distributed successfully.");
        } catch (error) {
            console.error('Error distributing trading profit:', error);
            showToast('Error distributing trading profit', 'error');
        }
    }, [db, showToast]);


    // Transfer funds function
    const transferFunds = async (recipientId, amount) => {
        if (!db || !userId || !userData) return;

        const currentBalance = parseFloat(userData?.balance || 0);

        // Validation
        if (!recipientId) {
            showToast('Please enter recipient ID', 'error');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter valid amount', 'error');
            return;
        }
        if (amount > currentBalance) {
            showToast('Insufficient balance', 'error');
            return;
        }
        if (recipientId === userId) {
            showToast('Cannot transfer to yourself', 'error');
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const senderProfileRef = doc(db, `artifacts/${appId}/users/${userId}/data/profile`);
                const recipientProfileRef = doc(db, `artifacts/${appId}/users/${recipientId}/data/profile`);

                const senderDoc = await transaction.get(senderProfileRef);
                const recipientDoc = await transaction.get(recipientProfileRef);

                if (!senderDoc.exists()) {
                    throw new Error("Sender profile not found.");
                }
                if (!recipientDoc.exists()) {
                    throw new Error("Recipient not found.");
                }

                const senderData = senderDoc.data();
                const recipientData = recipientDoc.data();

                if ((senderData.balance || 0) < amount) {
                    throw new Error("Insufficient balance during transaction.");
                }

                // Update sender balance
                transaction.update(senderProfileRef, {
                    balance: (senderData.balance || 0) - amount
                });

                // Update recipient balance
                transaction.update(recipientProfileRef, {
                    balance: (recipientData.balance || 0) + amount
                });

                const timestamp = serverTimestamp();

                // Record sender transaction history
                const senderTxRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                transaction.set(senderTxRef, {
                    type: 'sent',
                    to: recipientId,
                    amount: amount,
                    timestamp: timestamp,
                    status: 'completed',
                    details: `Transfer to ${recipientData.name || recipientId}`
                });

                // Record recipient transaction history
                const recipientTxRef = doc(collection(db, `artifacts/${appId}/users/${recipientId}/transactions`));
                transaction.set(recipientTxRef, {
                    type: 'received',
                    from: userId,
                    amount: amount,
                    timestamp: timestamp,
                    status: 'completed',
                    details: `Transfer from ${senderData.name || userId}`
                });
            });

            showToast(`Successfully transferred ₹${amount.toFixed(2)}`, 'success');
            // Data will automatically refresh due to onSnapshot listeners
        } catch (error) {
            console.error('Transfer error:', error);
            showToast('Transfer failed: ' + error.message, 'error');
        }
    };

    // Purchase investment package
    const purchasePackage = async (amount) => {
        if (!db || !userId || !userData) {
            showToast('Please log in to purchase packages.', 'error');
            return;
        }

        const currentBalance = parseFloat(userData?.balance || 0);

        if (amount > currentBalance) {
            showToast('Insufficient balance for this package', 'error');
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/data/profile`);
                const userDoc = await transaction.get(userProfileRef);
                const currentUserData = userDoc.data();

                if ((currentUserData.balance || 0) < amount) {
                    throw new Error("Insufficient balance during package purchase transaction.");
                }

                const timestamp = serverTimestamp();
                const userProfit = amount * 0.10; // 10% immediate profit to user
                const adminCommission = amount * 0.10; // 10% to admin
                const tradingProfit = amount * 0.70; // 70% to trading pool

                // Update user balance (subtract investment, add immediate profit)
                transaction.update(userProfileRef, {
                    balance: (currentUserData.balance || 0) - amount + userProfit,
                    tradingProfit: (currentUserData.tradingProfit || 0) + userProfit,
                });

                // Add investment record
                const investmentRef = doc(collection(db, `artifacts/${appId}/users/${userId}/investments`));
                transaction.set(investmentRef, {
                    amount: amount,
                    purchaseDate: timestamp,
                    status: 'active',
                    expectedReturn: amount * 2,
                    maturityDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days from now
                });

                // Add investment transaction
                const investmentTxRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                transaction.set(investmentTxRef, {
                    type: 'investment',
                    amount: amount,
                    status: 'completed',
                    timestamp: timestamp,
                    details: `Purchased ₹${amount} package`
                });

                // Add profit transaction
                const profitTxRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                transaction.set(profitTxRef, {
                    type: 'profit',
                    amount: userProfit,
                    status: 'completed',
                    timestamp: timestamp,
                    details: `Immediate profit from ₹${amount} package`
                });

                // Distribute commissions to referral chain (5 levels)
                if (currentUserData.referredBy) {
                    await distributeReferralCommissions(currentUserData.referredBy, amount, 1, transaction);
                }

                // Add trading profit to pool
                const systemDocRef = doc(db, `artifacts/${appId}/public/data/system`);
                const systemDoc = await transaction.get(systemDocRef);
                const currentPool = systemDoc.exists() ? (systemDoc.data().tradingPool || 0) : 0;
                transaction.set(systemDocRef, { tradingPool: currentPool + tradingProfit }, { merge: true });

                // Credit admin commission directly to admin's wallet and system earnings
                const adminProfileRef = doc(db, `artifacts/${appId}/users/${ADMIN_USER_ID}/data/profile`);
                const adminDoc = await transaction.get(adminProfileRef);
                const adminData = adminDoc.exists() ? adminDoc.data() : { balance: 0, tradingProfit: 0 };

                transaction.update(adminProfileRef, {
                    balance: (adminData.balance || 0) + adminCommission,
                    tradingProfit: (adminData.tradingProfit || 0) + adminCommission,
                });

                const adminSystemEarnings = systemDoc.exists() ? (systemDoc.data().adminEarnings || 0) : 0;
                transaction.update(systemDocRef, { adminEarnings: adminSystemEarnings + adminCommission }, { merge: true });

                // Add transaction record for admin
                const adminTxRef = doc(collection(db, `artifacts/${appId}/users/${ADMIN_USER_ID}/transactions`));
                transaction.set(adminTxRef, {
                    type: 'admin_commission',
                    amount: adminCommission,
                    status: 'completed',
                    timestamp: timestamp,
                    details: `Commission from ${currentUserData.name || userId}'s package purchase`
                });
            });

            // After successful transaction, distribute trading profit
            // This is done outside the transaction because it involves iterating over many users
            // and might exceed transaction limits if done inside.
            await distributeTradingProfit(tradingProfit);

            showToast(`Successfully purchased ₹${amount} package. You received ₹${userProfit.toFixed(2)} immediate profit!`, 'success');
            // Data will automatically refresh due to onSnapshot listeners
        } catch (error) {
            console.error('Package purchase error:', error);
            showToast('Failed to purchase package: ' + error.message, 'error');
        }
    };

    // --- Handle Menu Item Click ---
    const handleMenuItemClick = (item) => {
        setActiveMenuItem(item);
    };

    // --- Handle Logout ---
    const handleLogout = async () => {
        if (auth) {
            try {
                await signOut(auth);
                setUserId(null); // Clear user ID on logout
                setIsAuthReady(false); // Reset auth ready state
                setUserData(null); // Clear user data
                setIsAdmin(false); // Clear admin status
                showToast("Successfully logged out", "success");
                setActiveMenuItem('login'); // Redirect to login after logout
            } catch (error) {
                console.error("Error logging out:", error);
                showToast("Error logging out", "error");
            }
        }
    };

    // --- Render Content Based on activeMenuItem ---
    const renderContent = () => {
        if (!isAuthReady) {
            return (
                <div className="flex items-center justify-center h-full text-gray-600">
                    Loading authentication...
                </div>
            );
        }

        if (!userId || !userData) {
            // If user is not logged in or data not loaded, show login/signup or loading
            if (activeMenuItem !== 'login' && activeMenuItem !== 'signup') {
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Please Log In</h2>
                        <p className="text-gray-600 mb-4">You need to be logged in to access this content.</p>
                        <button
                            onClick={() => handleMenuItemClick('login')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Go to Login
                        </button>
                    </div>
                );
            }
        }

        switch (activeMenuItem) {
            case 'dashboard':
            case 'index': // Index also points to dashboard
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dashboard</h2>
                        <p className="text-gray-500 mb-4">User ID: <span className="font-mono text-sm break-all">{userId || 'Not available'}</span></p>

                        {isAdmin && (
                            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm mb-6">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <DollarSign className="w-5 h-5 mr-2 text-yellow-600" /> Admin Total Earnings
                                </h3>
                                <p className="text-3xl font-bold text-yellow-700">₹{adminStats.toFixed(2)}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <DollarSign className="w-5 h-5 mr-2 text-blue-600" /> Current Balance
                                </h3>
                                <p className="text-3xl font-bold text-blue-700">₹{(userData?.balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <TrendingUp className="w-5 h-5 mr-2 text-purple-600" /> Trading Profit
                                </h3>
                                <p className="text-3xl font-bold text-purple-700">₹{(userData?.tradingProfit || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <Users className="w-5 h-5 mr-2 text-green-600" /> Direct Referrals
                                </h3>
                                <p className="text-3xl font-bold text-green-700">{dashboardData.directReferrals.length}</p>
                                {dashboardData.directReferrals.length > 0 && (
                                    <ul className="list-disc pl-5 text-gray-600 text-sm mt-2">
                                        {dashboardData.directReferrals.slice(0, 3).map(ref => (
                                            <li key={ref.id || ref.name}>{ref.name || 'Unknown'} ({ref.status || 'Active'})</li>
                                        ))}
                                        {dashboardData.directReferrals.length > 3 && <li>...</li>}
                                    </ul>
                                )}
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <DollarSign className="w-5 h-5 mr-2 text-red-600" /> Total Team Earnings
                                </h3>
                                <p className="text-3xl font-bold text-red-700">₹{(userData?.teamEarnings || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <Share2 className="w-5 h-5 mr-2 text-orange-600" /> Referral Earnings
                                </h3>
                                <p className="text-3xl font-bold text-orange-700">₹{(userData?.referralEarnings || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                );
            case 'deposit':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Deposit</h2>
                        <p className="text-gray-600 mb-4">This section would contain your deposit form and history.</p>
                        {depositData.length > 0 ? (
                            <ul className="space-y-3">
                                {depositData.map(dep => (
                                    <li key={dep.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">Amount: ₹{dep.amount}</p>
                                            <p className="text-sm text-gray-500">Method: {dep.method} | Status: {dep.status}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{dep.date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No deposit history found.</p>
                        )}
                    </div>
                );
            case 'invoices':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Invoices</h2>
                        {invoicesData.length > 0 ? (
                            <ul className="space-y-3">
                                {invoicesData.map(inv => (
                                    <li key={inv.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">Invoice #{inv.id}</p>
                                            <p className="text-sm text-gray-500">Amount: ₹{inv.amount} | Status: {inv.status}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{inv.date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No invoices found.</p>
                        )}
                    </div>
                );
            case 'login':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Login Page</h2>
                        <p className="text-gray-600">This would be your login form. (Functionality not implemented in this demo)</p>
                    </div>
                );
            case 'packages':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Investment Packages</h2>
                        {packagesData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {packagesData.map(pkg => (
                                    <div key={pkg.id} className="bg-blue-50 p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-semibold text-blue-700">{pkg.name}</h3>
                                        <p className="text-gray-700">Price: ₹{pkg.price}</p>
                                        <p className="text-gray-500 text-sm">Duration: {pkg.duration}</p>
                                        <button
                                            onClick={() => purchasePackage(pkg.price)}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            Select Plan
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No packages available.</p>
                        )}
                    </div>
                );
            case 'profile':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">User Profile</h2>
                        <div className="space-y-4">
                            <p className="text-gray-700"><span className="font-medium">Name:</span> {profileData.name || 'N/A'}</p>
                            <p className="text-gray-700"><span className="font-medium">Email:</span> {profileData.email || 'N/A'}</p>
                            <p className="text-gray-700"><span className="font-medium">Phone:</span> {profileData.phone || 'N/A'}</p>
                            <p className="text-gray-700"><span className="font-medium">Address:</span> {profileData.address || 'N/A'}</p>
                            <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                                Edit Profile
                            </button>
                        </div>
                    </div>
                );
            case 'referral':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Referral Program</h2>
                        <p className="text-gray-600 mb-4">Your referral ID: <span className="font-mono text-sm break-all font-semibold">{userId || 'Loading...'}</span></p>
                        {referralData.length > 0 ? (
                            <ul className="space-y-3">
                                {referralData.map(ref => (
                                    <li key={ref.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">Referral: {ref.name}</p>
                                            <p className="text-sm text-gray-500">Earnings: ₹{ref.earnings}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{ref.date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No referrals yet.</p>
                        )}
                    </div>
                );
            case 'signup':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sign Up Page</h2>
                        <p className="text-gray-600">This would be your registration form. (Functionality not implemented in this demo)</p>
                    </div>
                );
            case 'team-structure':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Team Structure</h2>
                        {teamStructureData.length > 0 ? (
                            <ul className="space-y-3">
                                {teamStructureData.map(member => (
                                    <li key={member.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">Member: {member.name}</p>
                                            <p className="text-sm text-gray-500">Joined: {formatDateShort(member.joinDate)} | Earnings: ₹{member.earnings.toFixed(2)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No team members yet.</p>
                        )}
                    </div>
                );
            case 'trading-history':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Trading History</h2>
                        {transactionHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 border-b-2 border-gray-200">Date</th>
                                            <th className="py-3 px-4 border-b-2 border-gray-200">Type</th>
                                            <th className="py-3 px-4 border-b-2 border-gray-200">Amount</th>
                                            <th className="py-3 px-4 border-b-2 border-gray-200">Status</th>
                                            <th className="py-3 px-4 border-b-2 border-gray-200">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactionHistory.map(trans => (
                                            <tr key={trans.id} className="text-gray-700 text-sm">
                                                <td className="py-3 px-4 border-b border-gray-200">{formatDate(trans.timestamp)}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">{trans.type || 'N/A'}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">₹{trans.amount?.toFixed(2) || '0.00'}</td>
                                                <td className={`py-3 px-4 border-b border-gray-200 status-${trans.status || 'completed'}`}>
                                                    {formatStatus(trans.status)}
                                                </td>
                                                <td className="py-3 px-4 border-b border-gray-200">{trans.details || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No trading history found.</p>
                        )}
                    </div>
                );
            case 'transfer':
                const [recipientId, setRecipientId] = useState('');
                const [transferAmount, setTransferAmount] = useState('');
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Transfer Funds</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="recipientId" className="block text-sm font-medium text-gray-700">Recipient User ID</label>
                                <input
                                    type="text"
                                    id="recipientId"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                    placeholder="Enter recipient's user ID"
                                />
                            </div>
                            <div>
                                <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                                <input
                                    type="number"
                                    id="transferAmount"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    placeholder="Enter amount to transfer"
                                    min="0.01"
                                    step="0.01"
                                />
                            </div>
                            <button
                                onClick={() => transferFunds(recipientId, parseFloat(transferAmount))}
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Submit Transfer
                            </button>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">Transfer History</h3>
                        {transferData.length > 0 ? (
                            <ul className="space-y-3">
                                {transferData.map(trans => (
                                    <li key={trans.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">Amount: ₹{trans.amount}</p>
                                            <p className="text-sm text-gray-500">Recipient: {trans.recipient}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{trans.date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No transfer history found.</p>
                        )}
                    </div>
                );
            case 'withdrawal':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Withdrawal</h2>
                        <p className="text-gray-600 mb-4">This section would contain your withdrawal form and history.</p>
                        {withdrawalData.length > 0 ? (
                            <ul className="space-y-3">
                                {withdrawalData.map(wd => (
                                    <li key={wd.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">Amount: ₹{wd.amount}</p>
                                            <p className="text-sm text-gray-500">Method: {wd.method} | Status: {wd.status}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">{wd.date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">No withdrawal history found.</p>
                        )}
                    </div>
                );
            default:
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Select a Menu Item</h2>
                        <p className="text-gray-600">Please choose an option from the sidebar.</p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row">
            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>
            {/* Inter Font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <style>
                body {{
                    font-family: 'Inter', sans-serif;
                }}
                /* Custom styles for status badges */
                .status-completed {{ color: #10B981; font-weight: 600; }} /* Green */
                .status-pending {{ color: #F59E0B; font-weight: 600; }} /* Amber */
                .status-error {{ color: #EF4444; font-weight: 600; }} /* Red */
            </style>

            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-gray-800 text-white p-4 flex flex-col rounded-b-lg md:rounded-r-lg md:rounded-bl-none shadow-lg">
                <div className="text-2xl font-bold mb-6 text-center text-blue-400">My App</div>
                <div className="menu-header mb-6">
                    <div className="user-info text-center">
                        <h3 id="sideMenuUserName" className="text-lg font-semibold text-white">{userData?.name || 'Guest User'}</h3>
                        <span id="sideMenuUserEmail" className="text-sm text-gray-400">{auth?.currentUser?.email || 'N/A'}</span>
                    </div>
                    <div className="balance-info mt-3 text-center">
                        <span className="text-sm text-gray-400">Balance</span>
                        <h2 id="sideMenuUserBalance" className="text-2xl font-bold text-green-400">₹{(userData?.balance || 0).toFixed(2)}</h2>
                    </div>
                </div>

                <nav className="flex-grow">
                    <ul className="space-y-2">
                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mb-2">Dashboard</li>
                        <li>
                            <button
                                onClick={() => handleMenuItemClick('dashboard')}
                                className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                    ${activeMenuItem === 'dashboard' || activeMenuItem === 'index' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <LayoutDashboard className="w-5 h-5 mr-3" />
                                Overview
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuItemClick('dashboard')} // Direct Referrals is part of Dashboard
                                className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                    ${activeMenuItem === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <Users className="w-5 h-5 mr-3" /> Direct Referrals
                                <span className="ml-auto bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                    {dashboardData.directReferrals.length}
                                </span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuItemClick('dashboard')} // Total Team Earnings is part of Dashboard
                                className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                    ${activeMenuItem === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <DollarSign className="w-5 h-5 mr-3" /> Total Team Earnings
                                <span className="ml-auto bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                    ₹{dashboardData.totalTeamEarnings.toFixed(2)}
                                </span>
                            </button>
                        </li>

                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mt-4 mb-2">Transactions</li>
                        {[
                            { name: 'Deposit', key: 'deposit', icon: CreditCard },
                            { name: 'Withdrawal', key: 'withdrawal', icon: DollarSign },
                            { name: 'Transfer', key: 'transfer', icon: Repeat },
                            { name: 'Trading History', key: 'trading-history', icon: TrendingUp },
                        ].map((item) => (
                            <li key={item.key}>
                                <button
                                    onClick={() => handleMenuItemClick(item.key)}
                                    className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                        ${activeMenuItem === item.key ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </button>
                            </li>
                        ))}

                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mt-4 mb-2">Account</li>
                        {[
                            { name: 'Profile', key: 'profile', icon: User },
                            { name: 'Referral Program', key: 'referral', icon: Share2 },
                            { name: 'Team Structure', key: 'team-structure', icon: GitMerge },
                            { name: 'Investment Packages', key: 'packages', icon: Package },
                            { name: 'Invoices', key: 'invoices', icon: FileText },
                        ].map((item) => (
                            <li key={item.key}>
                                <button
                                    onClick={() => handleMenuItemClick(item.key)}
                                    className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                        ${activeMenuItem === item.key ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </button>
                            </li>
                        ))}

                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mt-4 mb-2">Authentication</li>
                        {userId && auth?.currentUser?.isAnonymous ? (
                            // Show only login/signup if anonymous
                            <>
                                <li>
                                    <button
                                        onClick={() => handleMenuItemClick('login')}
                                        className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                            ${activeMenuItem === 'login' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                                    >
                                        <User className="w-5 h-5 mr-3" /> Login
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => handleMenuItemClick('signup')}
                                        className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                            ${activeMenuItem === 'signup' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                                    >
                                        <UserPlus className="w-5 h-5 mr-3" /> Sign Up
                                    </button>
                                </li>
                            </>
                        ) : (
                            // Show logout if authenticated
                            <li>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center w-full p-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 shadow-md"
                                >
                                    <LogOut className="w-5 h-5 mr-3" />
                                    Logout
                                </button>
                            </li>
                        )}
                    </ul>
                </nav>

                {/* Recent Transactions in Footer */}
                <div className="mt-auto pt-4 border-t border-gray-700 text-sm text-gray-400">
                    <h4 className="font-semibold mb-2">Recent Transactions</h4>
                    <ul id="sideMenuTransactions" className="space-y-1">
                        {transactionHistory.length > 0 ? (
                            transactionHistory.slice(0, 3).map(tx => (
                                <li key={tx.id} className="flex justify-between items-center">
                                    <span className="tx-type text-gray-300">{tx.type || 'Transfer'}</span>
                                    <span className="tx-amount text-green-300">₹{tx.amount?.toFixed(2) || '0.00'}</span>
                                    <span className="tx-date text-gray-400">{formatDateShort(tx.timestamp)}</span>
                                </li>
                            ))
                        ) : (
                            <li>No recent transactions</li>
                        )}
                    </ul>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                {renderContent()}
            </main>

            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
