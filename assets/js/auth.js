// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCzHmIimieea8H9KzYFDSqD0lGOCZjxHYw",
    authDomain: "myapp-ee226.firebaseapp.com",
    databaseURL: "https://myapp-ee226-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "myapp-ee226",
    storageBucket: "myapp-ee226.appspot.com",
    messagingSenderId: "272405753135",
    appId: "1:272405753135:web:1b5f9a7c2a8c8e8f8a8b8b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
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
                email: user.email
            }));
            
            // Hide auth buttons and show logout in sidebar
            if (document.querySelector('.auth-buttons')) {
                document.querySelector('.auth-buttons').style.display = 'none';
            }
        } else {
            // No user is signed in
            currentUser = null;
            userData = null;
            
            // Show auth buttons and hide logout in sidebar
            if (document.querySelector('.auth-buttons')) {
                document.querySelector('.auth-buttons').style.display = 'flex';
            }
            
            // Redirect to login if not on auth pages
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Login user
function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
    }
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            return auth.signInWithEmailAndPassword(email, password);
        })
        .then((userCredential) => {
            // Signed in
            currentUser = userCredential.user;
            showToast('Login successful!', 'success');
            
            // Redirect to dashboard
            window.location.href = 'index.html';
        })
        .catch((error) => {
            showToast('Login error: ' + error.message, 'error');
        });
}

// Signup user
function signupUser() {
    const name = document.getElementById('signupName').value.trim();
    const mobile = document.getElementById('signupMobile').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    const sponsor = document.getElementById('sponsorId').value.trim();
    
    // Validate inputs
    if (!name || !mobile || !email || !password || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    // Create user with email and password
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User created
            currentUser = userCredential.user;
            
            // Save additional user data to database
            const userRef = database.ref('users/' + currentUser.uid);
            
            const userData = {
                name: name,
                mobile: mobile,
                email: email,
                sponsorId: sponsor || 'TW1381',
                balance: 0,
                tradingProfit: 0,
                referralProfit: 0,
                teamEarnings: 0,
                availableTradingProfit: 0,
                availableReferralProfit: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            // Save to local storage
            localStorage.setItem('tradeWorldUser', JSON.stringify({
                uid: currentUser.uid,
                email: email,
                name: name,
                mobile: mobile
            }));
            
            // Then save to Firebase
            return userRef.set(userData);
        })
        .then(() => {
            // Update sponsor's referral list if not TW1381
            if (sponsor && sponsor !== 'TW1381') {
                return database.ref('users').orderByChild('userId').equalTo(sponsor).once('value')
                    .then(snapshot => {
                        if (snapshot.exists()) {
                            const sponsorData = snapshot.val();
                            const sponsorId = Object.keys(sponsorData)[0];
                            
                            // Add this user to sponsor's directReferrals
                            return database.ref(`users/${sponsorId}/directReferrals/${currentUser.uid}`).set({
                                name: name,
                                joinDate: firebase.database.ServerValue.TIMESTAMP,
                                investment: 0,
                                earnings: 0
                            });
                        }
                    });
            }
        })
        .then(() => {
            showToast('Account created successfully!', 'success');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            showToast('Signup error: ' + error.message, 'error');
        });
}

// Logout user
function logoutUser() {
    auth.signOut().then(() => {
        currentUser = null;
        userData = null;
        localStorage.removeItem('tradeWorldUser');
        showToast('Logged out successfully', 'success');
        window.location.href = 'login.html';
    }).catch((error) => {
        showToast('Logout error: ' + error.message, 'error');
    });
}

// Change password
function changePassword() {
    const currentPwd = document.getElementById('currentPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    
    if (!currentPwd || !newPwd || !confirmPwd) {
        showToast('Please fill in all password fields', 'error');
        return;
    }
    
    if (newPwd !== confirmPwd) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    if (newPwd.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email, 
        currentPwd
    );
    
    // Reauthenticate user
    user.reauthenticateWithCredential(credential)
        .then(() => {
            // Change password
            return user.updatePassword(newPwd);
        })
        .then(() => {
            showToast('Password changed successfully!', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        })
        .catch(error => {
            showToast('Error changing password: ' + error.message, 'error');
        });
}

// Check if user came from a referral link
function checkReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId && document.getElementById('sponsorId')) {
        // Save to local storage
        localStorage.setItem('tradeWorldReferral', refId);
        document.getElementById('sponsorId').value = refId;
    }
}

// Show toast notification
function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer') || document.body;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = document.createElement('i');
    icon.className = 'toast-icon ' + 
        (type === 'success' ? 'fas fa-check-circle' : 
         type === 'error' ? 'fas fa-exclamation-circle' : 
         type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle');
    
    const text = document.createElement('span');
    text.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    toast.appendChild(icon);
    toast.appendChild(text);
    toast.appendChild(closeBtn);
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}
