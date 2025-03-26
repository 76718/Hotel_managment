// Function to show dashboard
function showDashboard() {
    console.log("Showing dashboard");
    
    // Make sure we have the elements
    const loginModal = document.getElementById('loginModal');
    const dashboard = document.getElementById('dashboard');
    
    if (!loginModal) {
        console.error("Login modal element not found");
    }
    
    if (!dashboard) {
        console.error("Dashboard element not found");
    }
    
    // Hide login modal and show dashboard with inline styles to ensure it works
    if (loginModal) loginModal.style.display = 'none';
    if (dashboard) {
        dashboard.style.display = 'block';
        console.log("Dashboard display style set to: " + dashboard.style.display);
    }
    
    // Force reload any data needed for dashboard
    console.log("Loading dashboard data");
    setTimeout(() => {
        // Load data for dashboard with delay to ensure DOM is ready
        if (typeof loadMenuItems === 'function') {
            console.log("Loading menu items");
            loadMenuItems();
        }
        
        if (typeof loadOrders === 'function') {
            console.log("Loading orders");
            loadOrders();
        }
        
        if (typeof loadInventory === 'function') {
            console.log("Loading inventory");
            loadInventory();
        }
        
        if (typeof loadAnalytics === 'function') {
            console.log("Loading analytics");
            loadAnalytics();
        }
    }, 100);
}

// Handle login form submission
const loginForm = document.getElementById('loginFormElement');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Login form submitted");
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showError("Please enter both email and password");
            return;
        }

        console.log("Attempting login with:", email);
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Check if user is an owner
                console.log("Login successful, checking role");
                return db.collection('users').doc(userCredential.user.uid).get();
            })
            .then((doc) => {
                if (doc.exists && doc.data().role === 'owner') {
                    console.log("Owner login confirmed");
                    showSuccess('Login successful!');
                    showDashboard();
                } else {
                    console.error("Access denied: not an owner account");
                    showError('Access denied. Owner account required.');
                    auth.signOut();
                }
            })
            .catch((error) => {
                console.error('Error logging in:', error);
                showError(error.message);
            });
    });
} else {
    console.error("Login form element not found");
} 