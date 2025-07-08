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
    const [referralData, setReferralData] = useState([]); // Stores direct referrals with their details
    const [teamStructureData, setTeamStructureData] = useState([]); // Stores multi-level team structure
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

        const q = query(
            collection(db, `artifacts/${appId}/users/${userId}/transactions`),
            orderBy('timestamp', 'desc'),
            limit(50) // Increased limit for more history
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            setTransactionHistory(transactions);
            console.log("Transaction history updated from Firestore.");
        }, (error) => {
            console.error('Error loading transaction history:', error);
            showToast('Error loading transactions', 'error');
        });

        return () => unsubscribe(); // Cleanup on unmount or re-run
    }, [db, userId, isAuthReady, showToast]);

    // --- Load Deposit Data from Firestore ---
    const loadDepositData = useCallback(() => {
        if (!db || !userId || !isAuthReady) return;
        const q = query(
            collection(db, `artifacts/${appId}/users/${userId}/deposits`),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const deposits = [];
            snapshot.forEach(doc => deposits.push({ id: doc.id, ...doc.data() }));
            setDepositData(deposits);
            console.log("Deposit data loaded from Firestore.");
        }, (error) => {
            console.error('Error loading deposit data:', error);
            showToast('Error loading deposits', 'error');
        });
        return () => unsubscribe();
    }, [db, userId, isAuthReady, showToast]);

    // --- Load Invoices Data from Firestore ---
    const loadInvoicesData = useCallback(() => {
        if (!db || !userId || !isAuthReady) return;
        const q = query(
            collection(db, `artifacts/${appId}/users/${userId}/invoices`),
            orderBy('invoiceDate', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const invoices = [];
            snapshot.forEach(doc => invoices.push({ id: doc.id, ...doc.data() }));
            setInvoicesData(invoices);
            console.log("Invoices data loaded from Firestore.");
        }, (error) => {
            console.error('Error loading invoices data:', error);
            showToast('Error loading invoices', 'error');
        });
        return () => unsubscribe();
    }, [db, userId, isAuthReady, showToast]);

    // --- Load Packages Data (Static for now, could be from Firestore public collection) ---
    const loadPackagesData = useCallback(() => {
        // In a real app, these packages might be stored in a public Firestore collection
        const packages = [
            { id: 'pkg1', name: 'Starter Plan', price: 100, duration: '30 days', expectedReturn: 200 },
            { id: 'pkg2', name: 'Standard Plan', price: 500, duration: '60 days', expectedReturn: 1200 },
            { id: 'pkg3', name: 'Premium Plan', price: 1000, duration: '90 days', expectedReturn: 2500 },
        ];
        setPackagesData(packages);
        console.log("Packages data loaded.");
    }, []);

    // --- Load Referral Data (Direct Referrals with details) ---
    const loadReferralData = useCallback(async () => {
        if (!db || !userId || !isAuthReady || !userData?.directReferrals) return;

        const directReferralIds = Object.keys(userData.directReferrals);
        const fetchedReferrals = [];

        for (const refId of directReferralIds) {
            try {
                const refProfileDoc = await getDoc(doc(db, `artifacts/${appId}/users/${refId}/data/profile`));
                if (refProfileDoc.exists()) {
                    const refProfileData = refProfileDoc.data();
                    // Fetch investments for this referral
                    const investmentsQuery = query(collection(db, `artifacts/${appId}/users/${refId}/investments`), orderBy('purchaseDate', 'desc'));
                    const investmentsSnapshot = await getDocs(investmentsQuery);
                    const totalInvestment = investmentsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

                    fetchedReferrals.push({
                        id: refId,
                        name: refProfileData.name || `User ${refId.substring(0, 6)}`,
                        joinDate: userData.directReferrals[refId].joinDate, // Use joinDate from referrer's directReferrals map
                        status: refProfileData.status || 'Active', // Assuming status field exists
                        totalInvestment: totalInvestment,
                        earningsFromThisReferral: userData.directReferrals[refId].earnings || 0 // Earnings from this specific direct referral
                    });
                }
            } catch (error) {
                console.error(`Error fetching data for referral ${refId}:`, error);
            }
        }
        setReferralData(fetchedReferrals);
        console.log("Referral data loaded.");
    }, [db, userId, isAuthReady, userData]);

    // --- Load Team Structure Data (Multi-level, by traversing referredBy chain) ---
    const loadTeamStructureData = useCallback(async () => {
        if (!db || !userId || !isAuthReady) return;

        const teamMembers = [];
        const usersCollectionRef = collection(db, `artifacts/${appId}/users`);

        // Fetch all users to build the hierarchy client-side.
        // In a very large app, this might need server-side processing or a more denormalized structure.
        const allUsersSnapshot = await getDocs(usersCollectionRef);
        const allUsersMap = new Map(); // Map userId to { profileData, directReferrals }

        allUsersSnapshot.forEach(userDoc => {
            const profile = userDoc.data().data?.profile;
            const directReferrals = userDoc.data().data?.profile?.directReferrals || {}; // Get their direct referrals
            if (profile) {
                allUsersMap.set(userDoc.id, { profile, directReferrals });
            }
        });

        // Function to recursively find downline members
        const findDownline = (currentUserId, level) => {
            const userEntry = allUsersMap.get(currentUserId);
            if (!userEntry || !userEntry.directReferrals) return;

            Object.keys(userEntry.directReferrals).forEach(referredId => {
                const referredUserEntry = allUsersMap.get(referredId);
                if (referredUserEntry && level <= 5) { // Limit to 5 levels
                    teamMembers.push({
                        id: referredId,
                        name: referredUserEntry.profile.name || `User ${referredId.substring(0, 6)}`,
                        joinDate: referredUserEntry.profile.joinDate || serverTimestamp(), // Assuming joinDate exists
                        earnings: referredUserEntry.profile.referralEarnings || 0, // Total referral earnings of this downline
                        level: level
                    });
                    findDownline(referredId, level + 1); // Recurse for next level
                }
            });
        };

        // Start building the team structure from the current user's direct referrals
        const currentUserEntry = allUsersMap.get(userId);
        if (currentUserEntry && currentUserEntry.directReferrals) {
            Object.keys(currentUserEntry.directReferrals).forEach(directRefId => {
                const directRefEntry = allUsersMap.get(directRefId);
                if (directRefEntry) {
                    teamMembers.push({
                        id: directRefId,
                        name: directRefEntry.profile.name || `User ${directRefId.substring(0, 6)}`,
                        joinDate: directRefEntry.profile.joinDate || serverTimestamp(),
                        earnings: directRefEntry.profile.referralEarnings || 0,
                        level: 1 // Direct referrals are Level 1
                    });
                    findDownline(directRefId, 2); // Start recursion for Level 2
                }
            });
        }
        setTeamStructureData(teamMembers);
        console.log("Team structure data loaded.");
    }, [db, userId, isAuthReady]);


    const loadTransferData = useCallback(() => {
        if (!db || !userId || !isAuthReady) return;
        const q = query(
            collection(db, `artifacts/${appId}/users/${userId}/transactions`),
            where('type', 'in', ['sent', 'received']), // Filter for transfer types
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transfers = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.type === 'sent' || data.type === 'received') {
                    transfers.push({
                        id: doc.id,
                        amount: data.amount,
                        recipient: data.type === 'sent' ? (data.to || 'Unknown') : (data.from || 'Unknown'),
                        date: data.timestamp,
                        type: data.type
                    });
                }
            });
            setTransferData(transfers);
            console.log("Transfer data loaded from Firestore.");
        }, (error) => {
            console.error('Error loading transfer data:', error);
            showToast('Error loading transfers', 'error');
        });
        return () => unsubscribe();
    }, [db, userId, isAuthReady, showToast]);

    const loadWithdrawalData = useCallback(() => {
        if (!db || !userId || !isAuthReady) return;
        const q = query(
            collection(db, `artifacts/${appId}/users/${userId}/withdrawals`),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const withdrawals = [];
            snapshot.forEach(doc => withdrawals.push({ id: doc.id, ...doc.data() }));
            setWithdrawalData(withdrawals);
            console.log("Withdrawal data loaded from Firestore.");
        }, (error) => {
            console.error('Error loading withdrawal data:', error);
            showToast('Error loading withdrawals', 'error');
        });
        return () => unsubscribe();
    }, [db, userId, isAuthReady, showToast]);

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
            'team-structure': loadTeamStructureData,
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
        const referrerSnapshot = await batch.get(referrerDocRef); // Use batch.get for transactions
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
                const usersSnapshot = await getDocs(usersCollectionRef); // Use getDocs outside transaction if too many users

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
    const purchasePackage = async (packageAmount, packageName) => {
        if (!db || !userId || !userData) {
            showToast('Please log in to purchase packages.', 'error');
            return;
        }

        const currentBalance = parseFloat(userData?.balance || 0);

        if (packageAmount > currentBalance) {
            showToast('Insufficient balance for this package', 'error');
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/data/profile`);
                const userDoc = await transaction.get(userProfileRef);
                const currentUserData = userDoc.data();

                if ((currentUserData.balance || 0) < packageAmount) {
                    throw new Error("Insufficient balance during package purchase transaction.");
                }

                const timestamp = serverTimestamp();
                const userProfit = packageAmount * 0.10; // 10% immediate profit to user
                const adminCommission = packageAmount * 0.10; // 10% to admin
                const tradingProfit = packageAmount * 0.70; // 70% to trading pool

                // Update user balance (subtract investment, add immediate profit)
                transaction.update(userProfileRef, {
                    balance: (currentUserData.balance || 0) - packageAmount + userProfit,
                    tradingProfit: (currentUserData.tradingProfit || 0) + userProfit,
                });

                // Add investment record
                const investmentRef = doc(collection(db, `artifacts/${appId}/users/${userId}/investments`));
                transaction.set(investmentRef, {
                    amount: packageAmount,
                    purchaseDate: timestamp,
                    status: 'active',
                    expectedReturn: packageAmount * 2,
                    maturityDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days from now
                });

                // Add investment transaction
                const investmentTxRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                transaction.set(investmentTxRef, {
                    type: 'investment',
                    amount: packageAmount,
                    status: 'completed',
                    timestamp: timestamp,
                    details: `Purchased ₹${packageAmount} package (${packageName})`
                });

                // Add profit transaction
                const profitTxRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
                transaction.set(profitTxRef, {
                    type: 'profit',
                    amount: userProfit,
                    status: 'completed',
                    timestamp: timestamp,
                    details: `Immediate profit from ₹${packageAmount} package`
                });

                // Generate Invoice
                const invoiceRef = doc(collection(db, `artifacts/${appId}/users/${userId}/invoices`));
                transaction.set(invoiceRef, {
                    packageId: investmentRef.id,
                    packageName: packageName,
                    amount: packageAmount,
                    invoiceDate: timestamp,
                    status: 'Paid',
                    userId: userId
                });

                // Distribute commissions to referral chain (5 levels)
                if (currentUserData.referredBy) {
                    await distributeReferralCommissions(currentUserData.referredBy, packageAmount, 1, transaction);
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

            showToast(`Successfully purchased ₹${packageAmount} package. You received ₹${userProfit.toFixed(2)} immediate profit!`, 'success');
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
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">कृपया लॉगिन करें</h2> {/* Please Log In */}
                        <p className="text-gray-600 mb-4">इस सामग्री तक पहुँचने के लिए आपको लॉग इन करना होगा।</p> {/* You need to be logged in to access this content. */}
                        <button
                            onClick={() => handleMenuItemClick('login')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            लॉगिन पर जाएं
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
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">डैशबोर्ड</h2> {/* Dashboard */}
                        <p className="text-gray-500 mb-4">यूजर आईडी: <span className="font-mono text-sm break-all">{userId || 'उपलब्ध नहीं'}</span></p> {/* User ID: Not available */}

                        {isAdmin && (
                            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm mb-6">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <DollarSign className="w-5 h-5 mr-2 text-yellow-600" /> एडमिन कुल कमाई
                                </h3> {/* Admin Total Earnings */}
                                <p className="text-3xl font-bold text-yellow-700">₹{adminStats.toFixed(2)}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <DollarSign className="w-5 h-5 mr-2 text-blue-600" /> वर्तमान शेष
                                </h3> {/* Current Balance */}
                                <p className="text-3xl font-bold text-blue-700">₹{(userData?.balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <TrendingUp className="w-5 h-5 mr-2 text-purple-600" /> ट्रेडिंग लाभ
                                </h3> {/* Trading Profit */}
                                <p className="text-3xl font-bold text-purple-700">₹{(userData?.tradingProfit || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <Users className="w-5 h-5 mr-2 text-green-600" /> सीधे रेफरल
                                </h3> {/* Direct Referrals */}
                                <p className="text-3xl font-bold text-green-700">{dashboardData.directReferrals.length}</p>
                                {dashboardData.directReferrals.length > 0 && (
                                    <ul className="list-disc pl-5 text-gray-600 text-sm mt-2">
                                        {dashboardData.directReferrals.slice(0, 3).map(ref => (
                                            <li key={ref.id || ref.name}>{ref.name || 'अज्ञात'} ({ref.status || 'सक्रिय'})</li> {/* Unknown, Active */}
                                        ))}
                                        {dashboardData.directReferrals.length > 3 && <li>...</li>}
                                    </ul>
                                )}
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <DollarSign className="w-5 h-5 mr-2 text-red-600" /> कुल टीम कमाई
                                </h3> {/* Total Team Earnings */}
                                <p className="text-3xl font-bold text-red-700">₹{(userData?.teamEarnings || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium text-gray-700 flex items-center mb-2">
                                    <Share2 className="w-5 h-5 mr-2 text-orange-600" /> रेफरल कमाई
                                </h3> {/* Referral Earnings */}
                                <p className="text-3xl font-bold text-orange-700">₹{(userData?.referralEarnings || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                );
            case 'deposit':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">फंड जमा करें</h2> {/* Deposit Fund */}
                        <p className="text-gray-600 mb-4">यह अनुभाग आपके जमा फॉर्म और इतिहास को शामिल करेगा।</p> {/* This section would contain your deposit form and history. */}
                        {depositData.length > 0 ? (
                            <ul className="space-y-3">
                                {depositData.map(dep => (
                                    <li key={dep.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">राशि: ₹{dep.amount}</p> {/* Amount */}
                                            <p className="text-sm text-gray-500">तरीका: {dep.method} | स्थिति: {dep.status}</p> {/* Method, Status */}
                                        </div>
                                        <span className="text-xs text-gray-400">{formatDateShort(dep.timestamp)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">कोई जमा इतिहास नहीं मिला।</p> {/* No deposit history found. */}
                        )}
                    </div>
                );
            case 'invoices':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">मेरे चालान</h2> {/* My Invoices */}
                        {invoicesData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 border-b-2 border-gray-200">चालान आईडी</th> {/* Invoice ID */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">पैकेज</th> {/* Package */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">राशि</th> {/* Amount */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">दिनांक</th> {/* Date */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">स्थिति</th> {/* Status */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoicesData.map(inv => (
                                            <tr key={inv.id} className="text-gray-700 text-sm">
                                                <td className="py-3 px-4 border-b border-gray-200">{inv.id.substring(0, 8)}...</td>
                                                <td className="py-3 px-4 border-b border-gray-200">{inv.packageName || 'N/A'}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">₹{inv.amount?.toFixed(2) || '0.00'}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">{formatDateShort(inv.invoiceDate)}</td>
                                                <td className={`py-3 px-4 border-b border-gray-200 status-${inv.status || 'completed'}`}>
                                                    {formatStatus(inv.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">कोई चालान नहीं मिला।</p> {/* No invoices found. */}
                        )}
                    </div>
                );
            case 'login':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">लॉगिन पेज</h2> {/* Login Page */}
                        <p className="text-gray-600">यह आपका लॉगिन फॉर्म होगा। (कार्यक्षमता इस डेमो में लागू नहीं है)</p> {/* This would be your login form. (Functionality not implemented in this demo) */}
                    </div>
                );
            case 'packages':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">निवेश पैकेज</h2> {/* Investment Packages */}
                        {packagesData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {packagesData.map(pkg => (
                                    <div key={pkg.id} className="bg-blue-50 p-4 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-semibold text-blue-700">{pkg.name}</h3>
                                        <p className="text-gray-700">मूल्य: ₹{pkg.price}</p> {/* Price */}
                                        <p className="text-gray-500 text-sm">अवधि: {pkg.duration}</p> {/* Duration */}
                                        <p className="text-gray-600 text-sm">अपेक्षित रिटर्न: ₹{pkg.expectedReturn}</p> {/* Expected Return */}
                                        <button
                                            onClick={() => purchasePackage(pkg.price, pkg.name)}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            प्लान चुनें
                                        </button> {/* Select Plan */}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">कोई पैकेज उपलब्ध नहीं है।</p> {/* No packages available. */}
                        )}
                    </div>
                );
            case 'profile':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">उपयोगकर्ता प्रोफ़ाइल</h2> {/* User Profile */}
                        <div className="space-y-4">
                            <p className="text-gray-700"><span className="font-medium">नाम:</span> {profileData.name || 'N/A'}</p> {/* Name */}
                            <p className="text-gray-700"><span className="font-medium">ईमेल:</span> {profileData.email || 'N/A'}</p> {/* Email */}
                            <p className="text-gray-700"><span className="font-medium">फ़ोन:</span> {profileData.phone || 'N/A'}</p> {/* Phone */}
                            <p className="text-gray-700"><span className="font-medium">पता:</span> {profileData.address || 'N/A'}</p> {/* Address */}
                            <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                                प्रोफ़ाइल संपादित करें
                            </button> {/* Edit Profile */}
                        </div>
                    </div>
                );
            case 'referral':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">रेफरल प्रोग्राम</h2> {/* Referral Program */}
                        <p className="text-gray-600 mb-4">आपका रेफरल आईडी: <span className="font-mono text-sm break-all font-semibold">{userId || 'लोड हो रहा है...'}</span></p> {/* Your referral ID: Loading... */}
                        {referralData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 border-b-2 border-gray-200">रेफरल आईडी</th> {/* Referral ID */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">नाम</th> {/* Name */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">जुड़ने की तारीख</th> {/* Join Date */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">स्थिति</th> {/* Status */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">कुल निवेश</th> {/* Total Investment */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">आपकी कमाई</th> {/* Your Earnings */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {referralData.map(ref => (
                                            <tr key={ref.id} className="text-gray-700 text-sm">
                                                <td className="py-3 px-4 border-b border-gray-200">{ref.id.substring(0, 8)}...</td>
                                                <td className="py-3 px-4 border-b border-gray-200">{ref.name}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">{formatDateShort(ref.joinDate)}</td>
                                                <td className={`py-3 px-4 border-b border-gray-200 status-${ref.status || 'completed'}`}>
                                                    {formatStatus(ref.status)}
                                                </td>
                                                <td className="py-3 px-4 border-b border-gray-200">₹{ref.totalInvestment?.toFixed(2) || '0.00'}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">₹{ref.earningsFromThisReferral?.toFixed(2) || '0.00'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">अभी तक कोई रेफरल नहीं है।</p> {/* No referrals yet. */}
                        )}
                    </div>
                );
            case 'signup':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">साइन अप पेज</h2> {/* Sign Up Page */}
                        <p className="text-gray-600">यह आपका पंजीकरण फॉर्म होगा। (कार्यक्षमता इस डेमो में लागू नहीं है)</p> {/* This would be your registration form. (Functionality not implemented in this demo) */}
                    </div>
                );
            case 'team-structure':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">टीम संरचना</h2> {/* Team Structure */}
                        {teamStructureData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 border-b-2 border-gray-200">सदस्य आईडी</th> {/* Member ID */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">नाम</th> {/* Name */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">स्तर</th> {/* Level */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">जुड़ने की तारीख</th> {/* Join Date */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">कुल कमाई</th> {/* Total Earnings */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamStructureData.map(member => (
                                            <tr key={member.id} className="text-gray-700 text-sm">
                                                <td className="py-3 px-4 border-b border-gray-200">{member.id.substring(0, 8)}...</td>
                                                <td className="py-3 px-4 border-b border-gray-200">{member.name}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">स्तर {member.level}</td> {/* Level */}
                                                <td className="py-3 px-4 border-b border-gray-200">{formatDateShort(member.joinDate)}</td>
                                                <td className="py-3 px-4 border-b border-gray-200">₹{member.earnings?.toFixed(2) || '0.00'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">अभी तक कोई टीम सदस्य नहीं है।</p> {/* No team members yet. */}
                        )}
                    </div>
                );
            case 'trading-history':
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">ट्रेडिंग इतिहास</h2> {/* Trading History */}
                        {transactionHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                    <thead>
                                        <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            <th className="py-3 px-4 border-b-2 border-gray-200">दिनांक</th> {/* Date */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">प्रकार</th> {/* Type */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">राशि</th> {/* Amount */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">स्थिति</th> {/* Status */}
                                            <th className="py-3 px-4 border-b-2 border-gray-200">विवरण</th> {/* Details */}
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
                            <p className="text-gray-500">कोई ट्रेडिंग इतिहास नहीं मिला।</p> {/* No trading history found. */}
                        )}
                    </div>
                );
            case 'transfer':
                const [recipientId, setRecipientId] = useState('');
                const [transferAmount, setTransferAmount] = useState('');
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">फंड ट्रांसफर करें</h2> {/* Transfer Funds */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="recipientId" className="block text-sm font-medium text-gray-700">प्राप्तकर्ता यूजर आईडी</label> {/* Recipient User ID */}
                                <input
                                    type="text"
                                    id="recipientId"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                    placeholder="प्राप्तकर्ता की यूजर आईडी दर्ज करें" // Enter recipient's user ID
                                />
                            </div>
                            <div>
                                <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700">राशि (₹)</label> {/* Amount (₹) */}
                                <input
                                    type="number"
                                    id="transferAmount"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    placeholder="स्थानांतरित करने के लिए राशि दर्ज करें" // Enter amount to transfer
                                    min="0.01"
                                    step="0.01"
                                />
                            </div>
                            <button
                                onClick={() => transferFunds(recipientId, parseFloat(transferAmount))}
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                ट्रांसफर सबमिट करें
                            </button> {/* Submit Transfer */}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">ट्रांसफर इतिहास</h3> {/* Transfer History */}
                        {transferData.length > 0 ? (
                            <ul className="space-y-3">
                                {transferData.map(trans => (
                                    <li key={trans.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">राशि: ₹{trans.amount}</p> {/* Amount */}
                                            <p className="text-sm text-gray-500">प्राप्तकर्ता: {trans.recipient} ({trans.type === 'sent' ? 'भेजा गया' : 'प्राप्त'})</p> {/* Recipient, Sent, Received */}
                                        </div>
                                        <span className="text-xs text-gray-400">{formatDateShort(trans.date)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">कोई ट्रांसफर इतिहास नहीं मिला।</p> {/* No transfer history found. */}
                        )}
                    </div>
                );
            case 'withdrawal':
                const totalAvailableBalance = (userData?.balance || 0) + (userData?.tradingProfit || 0) + (userData?.referralEarnings || 0);
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">फंड निकालें</h2> {/* Withdraw Funds */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg shadow-sm text-center">
                                <h3 className="text-lg font-medium text-gray-700">वर्तमान शेष</h3> {/* Current Balance */}
                                <p className="text-2xl font-bold text-blue-700">₹{(userData?.balance || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg shadow-sm text-center">
                                <h3 className="text-lg font-medium text-gray-700">ट्रेडिंग लाभ</h3> {/* Trading Profit */}
                                <p className="text-2xl font-bold text-purple-700">₹{(userData?.tradingProfit || 0).toFixed(2)}</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg shadow-sm text-center">
                                <h3 className="text-lg font-medium text-gray-700">रेफरल लाभ</h3> {/* Referral Profit */}
                                <p className="text-2xl font-bold text-orange-700">₹{(userData?.referralEarnings || 0).toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-green-100 p-4 rounded-lg shadow-md text-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-800">कुल निकासी योग्य शेष</h3> {/* Total Withdraw-able Balance */}
                            <p className="text-3xl font-bold text-green-800">₹{totalAvailableBalance.toFixed(2)}</p>
                        </div>
                        {/* Withdrawal form would go here */}
                        <p className="text-gray-600 mb-4">यह अनुभाग आपके निकासी फॉर्म और इतिहास को शामिल करेगा।</p> {/* This section would contain your withdrawal form and history. */}
                        {withdrawalData.length > 0 ? (
                            <ul className="space-y-3">
                                {withdrawalData.map(wd => (
                                    <li key={wd.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">राशि: ₹{wd.amount}</p> {/* Amount */}
                                            <p className="text-sm text-gray-500">तरीका: {wd.method} | स्थिति: {wd.status}</p> {/* Method, Status */}
                                        </div>
                                        <span className="text-xs text-gray-400">{formatDateShort(wd.timestamp)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">कोई निकासी इतिहास नहीं मिला।</p> {/* No withdrawal history found. */}
                        )}
                    </div>
                );
            default:
                return (
                    <div className="p-6 bg-white rounded-lg shadow-md text-center">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">एक मेनू आइटम चुनें</h2> {/* Select a Menu Item */}
                        <p className="text-gray-600">कृपया साइडबार से एक विकल्प चुनें।</p> {/* Please choose an option from the sidebar. */}
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
                <div className="text-2xl font-bold mb-6 text-center text-blue-400">मेरा ऐप</div> {/* My App */}
                <div className="menu-header mb-6">
                    <div className="user-info text-center">
                        <h3 id="sideMenuUserName" className="text-lg font-semibold text-white">{userData?.name || 'अतिथि उपयोगकर्ता'}</h3> {/* Guest User */}
                        <span id="sideMenuUserEmail" className="text-sm text-gray-400">{auth?.currentUser?.email || 'N/A'}</span>
                    </div>
                    <div className="balance-info mt-3 text-center">
                        <span className="text-sm text-gray-400">शेष</span> {/* Balance */}
                        <h2 id="sideMenuUserBalance" className="text-2xl font-bold text-green-400">₹{(userData?.balance || 0).toFixed(2)}</h2>
                    </div>
                </div>

                <nav className="flex-grow">
                    <ul className="space-y-2">
                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mb-2">डैशबोर्ड</li> {/* Dashboard */}
                        <li>
                            <button
                                onClick={() => handleMenuItemClick('dashboard')}
                                className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                    ${activeMenuItem === 'dashboard' || activeMenuItem === 'index' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <LayoutDashboard className="w-5 h-5 mr-3" />
                                अवलोकन
                            </button> {/* Overview */}
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuItemClick('dashboard')} // Direct Referrals is part of Dashboard
                                className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                    ${activeMenuItem === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <Users className="w-5 h-5 mr-3" /> सीधे रेफरल
                                <span className="ml-auto bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                    {dashboardData.directReferrals.length}
                                </span>
                            </button> {/* Direct Referrals */}
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuItemClick('dashboard')} // Total Team Earnings is part of Dashboard
                                className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                    ${activeMenuItem === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <DollarSign className="w-5 h-5 mr-3" /> कुल टीम कमाई
                                <span className="ml-auto bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                    ₹{dashboardData.totalTeamEarnings.toFixed(2)}
                                </span>
                            </button> {/* Total Team Earnings */}
                        </li>

                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mt-4 mb-2">लेन-देन</li> {/* Transactions */}
                        {[
                            { name: 'फंड जमा करें', key: 'deposit', icon: CreditCard }, // Deposit Fund
                            { name: 'फंड निकालें', key: 'withdrawal', icon: DollarSign }, // Withdraw Fund
                            { name: 'फंड ट्रांसफर करें', key: 'transfer', icon: Repeat }, // Transfer Fund
                            { name: 'ट्रेडिंग इतिहास', key: 'trading-history', icon: TrendingUp }, // Trading History
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

                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mt-4 mb-2">खाता</li> {/* Account */}
                        {[
                            { name: 'प्रोफ़ाइल', key: 'profile', icon: User }, // Profile
                            { name: 'रेफरल प्रोग्राम', key: 'referral', icon: Share2 }, // Referral Program
                            { name: 'टीम संरचना', key: 'team-structure', icon: GitMerge }, // Team Structure
                            { name: 'निवेश पैकेज', key: 'packages', icon: Package }, // Investment Packages
                            { name: 'मेरे चालान', key: 'invoices', icon: FileText }, // My Invoices
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

                        <li className="menu-title text-gray-400 text-xs uppercase tracking-wider mt-4 mb-2">प्रमाणीकरण</li> {/* Authentication */}
                        {userId && auth?.currentUser?.isAnonymous ? (
                            // Show only login/signup if anonymous
                            <>
                                <li>
                                    <button
                                        onClick={() => handleMenuItemClick('login')}
                                        className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                            ${activeMenuItem === 'login' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                                    >
                                        <User className="w-5 h-5 mr-3" /> लॉगिन
                                    </button> {/* Login */}
                                </li>
                                <li>
                                    <button
                                        onClick={() => handleMenuItemClick('signup')}
                                        className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200
                                            ${activeMenuItem === 'signup' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300'}`}
                                    >
                                        <UserPlus className="w-5 h-5 mr-3" /> साइन अप
                                    </button> {/* Sign Up */}
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
                                    लॉगआउट
                                </button> {/* Logout */}
                            </li>
                        )}
                    </ul>
                </nav>

                {/* Recent Transactions in Footer */}
                <div className="mt-auto pt-4 border-t border-gray-700 text-sm text-gray-400">
                    <h4 className="font-semibold mb-2">हाल के लेनदेन</h4> {/* Recent Transactions */}
                    <ul id="sideMenuTransactions" className="space-y-1">
                        {transactionHistory.length > 0 ? (
                            transactionHistory.slice(0, 3).map(tx => (
                                <li key={tx.id} className="flex justify-between items-center">
                                    <span className="tx-type text-gray-300">{tx.type || 'ट्रांसफर'}</span> {/* Transfer */}
                                    <span className="tx-amount text-green-300">₹{tx.amount?.toFixed(2) || '0.00'}</span>
                                    <span className="tx-date text-gray-400">{formatDateShort(tx.timestamp)}</span>
                                </li>
                            ))
                        ) : (
                            <li>कोई हालिया लेनदेन नहीं</li> {/* No recent transactions */}
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
