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

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Current user data
let currentUser = null;
let userData = null;

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            currentUser = user;
            
            // Save to local storage
            localStorage.setItem('tradeWorldUser', JSON.stringify({
                uid: user.uid,
                email: user.email,
                lastLogin: Date.now()
            }));
            
            // Update UI based on auth state
            updateAuthUI();
            
            // Load user data
            loadUserData(user.uid);
        } else {
            // No user is signed in
            currentUser = null;
            userData = null;
            localStorage.removeItem('tradeWorldUser');
            
            // Update UI based on auth state
            updateAuthUI();
            
            // Redirect to login if not on auth pages
            if (!isAuthPage()) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Update UI based on authentication state
function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const logoutLinks = document.querySelectorAll('#logoutLink');
    
    if (currentUser) {
        // User is logged in
        if (authButtons) authButtons.style.display = 'none';
        logoutLinks.forEach(link => link.style.display = 'block');
    } else {
        // User is logged out
        if (authButtons) authButtons.style.display = 'flex';
        logoutLinks.forEach(link => link.style.display = 'none');
    }
}

// Check if current page is auth page
function isAuthPage() {
    const authPages = ['login.html', 'signup.html', 'forgot-password.html'];
    return authPages.some(page => window.location.pathname.includes(page));
}

// Load user data from database
function loadUserData(userId) {
    database.ref('users/' + userId).on('value', snapshot => {
        userData = snapshot.val();
        
        // Update UI elements that display user data
        updateUserDataUI();
    }, error => {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    });
}

// Update UI elements with user data
function updateUserDataUI() {
    // Update balance display
    const balanceElements = document.querySelectorAll('.user-balance');
    if (balanceElements.length > 0 && userData) {
        balanceElements.forEach(el => {
            el.textContent = `$${(userData.balance || 0).toFixed(2)}`;
        });
    }
    
    // Update user name display
    const nameElements = document.querySelectorAll('.user-name');
    if (nameElements.length > 0 && userData) {
        nameElements.forEach(el => {
            el.textContent = userData.name || 'User';
        });
    }
}

// Login user
function loginUser(email, password) {
    if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return Promise.reject('Email and password required');
    }
    
    return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => auth.signInWithEmailAndPassword(email, password))
        .then(userCredential => {
            currentUser = userCredential.user;
            
            // Update last login time
            return database.ref('users/' + currentUser.uid).update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .then(() => {
            showToast('Login successful!', 'success');
            return currentUser;
        })
        .catch(error => {
            let errorMessage = 'Login failed';
            
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Account disabled';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showToast(errorMessage, 'error');
            throw error;
        });
}

// Signup user
function signupUser(userData) {
    const { name, email, password, confirmPassword, mobile, sponsor } = userData;
    
    // Validate inputs
    if (!name || !email || !password || !confirmPassword || !mobile) {
        showToast('Please fill in all required fields', 'error');
        return Promise.reject('Missing required fields');
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return Promise.reject('Passwords do not match');
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return Promise.reject('Password too short');
    }
    
    return auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            
            // Generate user ID
            const userId = 'TW' + Math.floor(1000 + Math.random() * 9000);
            
            // Prepare user data for database
            const dbUserData = {
                name: name,
                mobile: mobile,
                email: email,
                userId: userId,
                sponsorId: sponsor || 'TW1381',
                balance: 0,
                tradingProfit: 0,
                referralProfit: 0,
                teamEarnings: 0,
                availableTradingProfit: 0,
                availableReferralProfit: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Save to database
            return database.ref('users/' + currentUser.uid).set(dbUserData);
        })
        .then(() => {
            // Update sponsor's referrals if needed
            if (sponsor && sponsor !== 'TW1381') {
                return updateSponsorReferrals(sponsor, currentUser.uid, name);
            }
        })
        .then(() => {
            showToast('Account created successfully!', 'success');
            return currentUser;
        })
        .catch(error => {
            let errorMessage = 'Signup failed';
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email already in use';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showToast(errorMessage, 'error');
            throw error;
        });
}

// Update sponsor's referral list
function updateSponsorReferrals(sponsorId, referralId, referralName) {
    return database.ref('users').orderByChild('userId').equalTo(sponsorId).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const sponsorData = snapshot.val();
                const sponsorKey = Object.keys(sponsorData)[0];
                
                // Add referral to sponsor's directReferrals
                return database.ref(`users/${sponsorKey}/directReferrals/${referralId}`).set({
                    name: referralName,
                    joinDate: firebase.database.ServerValue.TIMESTAMP,
                    investment: 0,
                    earnings: 0
                });
            }
        });
}

// Logout user
function logoutUser() {
    return auth.signOut()
        .then(() => {
            currentUser = null;
            userData = null;
            localStorage.removeItem('tradeWorldUser');
            showToast('Logged out successfully', 'success');
        })
        .catch(error => {
            showToast('Logout error: ' + error.message, 'error');
            throw error;
        });
}

// Change password
function changePassword(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
        showToast('Please fill in all password fields', 'error');
        return Promise.reject('Missing password fields');
    }
    
    if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return Promise.reject('Password too short');
    }
    
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email, 
        currentPassword
    );
    
    return user.reauthenticateWithCredential(credential)
        .then(() => user.updatePassword(newPassword))
        .then(() => {
            showToast('Password changed successfully!', 'success');
        })
        .catch(error => {
            let errorMessage = 'Password change failed';
            
            switch(error.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Current password is incorrect';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'New password is too weak';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showToast(errorMessage, 'error');
            throw error;
        });
}

// Check referral link
function checkReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId && document.getElementById('sponsorId')) {
        localStorage.setItem('tradeWorldReferral', refId);
        document.getElementById('sponsorId').value = refId;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || document.body;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const icon = document.createElement('i');
    icon.className = `fas ${iconMap[type] || 'fa-info-circle'}`;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => toast.remove();
    
    toast.appendChild(icon);
    toast.appendChild(text);
    toast.appendChild(closeBtn);
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => toast.remove(), 5000);
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    checkReferralLink();
});
