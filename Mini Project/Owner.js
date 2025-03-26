// Function to load analytics
function loadAnalytics() {
    // Check if all required elements exist
    const requiredElements = [
        'today-revenue',
        'today-orders',
        'yesterday-revenue',
        'yesterday-orders',
        'total-revenue',
        'total-orders'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing analytics elements:', missingElements);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get today's orders
    db.collection('orders')
        .where('createdAt', '>=', today)
        .get()
        .then(snapshot => {
            let todayTotal = 0;
            let todayOrders = 0;
            snapshot.forEach(doc => {
                const order = doc.data();
                todayTotal += parseFloat(order.totalPrice) || 0;
                todayOrders++;
            });
            const todayRevenueElement = document.getElementById('today-revenue');
            const todayOrdersElement = document.getElementById('today-orders');
            if (todayRevenueElement) todayRevenueElement.textContent = `₹${todayTotal.toFixed(2)}`;
            if (todayOrdersElement) todayOrdersElement.textContent = todayOrders;
        })
        .catch(error => {
            console.error('Error loading today\'s analytics:', error);
        });

    // Get yesterday's orders
    db.collection('orders')
        .where('createdAt', '>=', yesterday)
        .where('createdAt', '<', today)
        .get()
        .then(snapshot => {
            let yesterdayTotal = 0;
            let yesterdayOrders = 0;
            snapshot.forEach(doc => {
                const order = doc.data();
                yesterdayTotal += parseFloat(order.totalPrice) || 0;
                yesterdayOrders++;
            });
            const yesterdayRevenueElement = document.getElementById('yesterday-revenue');
            const yesterdayOrdersElement = document.getElementById('yesterday-orders');
            if (yesterdayRevenueElement) yesterdayRevenueElement.textContent = `₹${yesterdayTotal.toFixed(2)}`;
            if (yesterdayOrdersElement) yesterdayOrdersElement.textContent = yesterdayOrders;
        })
        .catch(error => {
            console.error('Error loading yesterday\'s analytics:', error);
        });

    // Get total orders and revenue
    db.collection('orders').get()
        .then(snapshot => {
            let totalRevenue = 0;
            let totalOrders = 0;
            snapshot.forEach(doc => {
                const order = doc.data();
                totalRevenue += parseFloat(order.totalPrice) || 0;
                totalOrders++;
            });
            const totalRevenueElement = document.getElementById('total-revenue');
            const totalOrdersElement = document.getElementById('total-orders');
            if (totalRevenueElement) totalRevenueElement.textContent = `₹${totalRevenue.toFixed(2)}`;
            if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        })
        .catch(error => {
            console.error('Error loading total analytics:', error);
        });
}

// Function to load orders with real-time updates
function loadOrders() {
    console.log("loadOrders function called");
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) {
        console.error("Error: Could not find ordersList element in the DOM");
        return;
    }

    console.log("Getting orders from Firebase...");
    ordersList.innerHTML = '<div class="loading">Loading orders...</div>';

    // Set up real-time listener for orders without sorting by createdAt
    // This allows orders without createdAt to still be retrieved
    db.collection('orders')
        .onSnapshot((snapshot) => {
            console.log("Orders snapshot received:", snapshot.size, "documents");
            const orders = [];
            
            if (snapshot.empty) {
                console.log("No orders found in the database");
                ordersList.innerHTML = '<div class="loading">No orders found. Waiting for first order...</div>';
                return;
            }

            snapshot.forEach(doc => {
                const orderData = doc.data();
                console.log('Order ID:', doc.id);
                console.log('Order Data:', orderData);
                
                try {
                    // Add order with null checks and default values
                    orders.push({
                        id: doc.id,
                        orderNumber: orderData.orderNumber || `ORD-${doc.id.substring(0, 5)}`,
                        status: orderData.status || 'pending',
                        items: orderData.items || [],
                        totalPrice: orderData.totalPrice || 0,
                        createdAt: orderData.createdAt ? 
                            (typeof orderData.createdAt.toDate === 'function' ? orderData.createdAt.toDate() : new Date(orderData.createdAt)) : 
                            orderData.updatedAt ? 
                                (typeof orderData.updatedAt.toDate === 'function' ? orderData.updatedAt.toDate() : new Date(orderData.updatedAt)) : 
                                new Date(),
                        updatedAt: orderData.updatedAt ? 
                            (typeof orderData.updatedAt.toDate === 'function' ? orderData.updatedAt.toDate() : new Date(orderData.updatedAt)) : 
                            new Date(),
                        customerName: orderData.customerName || orderData.userEmail || 'Guest Customer',
                        customerEmail: orderData.customerEmail || orderData.userEmail || 'No email provided',
                        customerPhone: orderData.customerPhone || orderData.userPhone || 'No phone provided'
                    });
                } catch (err) {
                    console.error("Error processing order:", err, orderData);
                }
            });

            console.log(`Processed ${orders.length} orders, displaying now`);
            // Sort orders by date (newest first) after retrieval
            orders.sort((a, b) => b.createdAt - a.createdAt);
            displayOrders(orders);
        }, (error) => {
            console.error('Error loading orders:', error);
            ordersList.innerHTML = '<div class="error">Failed to load orders: ' + error.message + '</div>';
        });
}

// Function to display orders with images
function displayOrders(orders) {
    console.log("Displaying", orders.length, "orders");
    const ordersList = document.getElementById('ordersList');
    const orderStatus = document.getElementById('orderStatus');
    
    if (!ordersList) {
        console.error("Orders list container not found");
        return;
    }
    
    // Filter orders by selected status
    const status = orderStatus ? orderStatus.value : 'all';
    const filteredOrders = status === 'all' ? 
        orders : 
        orders.filter(order => order.status && order.status.toLowerCase() === status.toLowerCase());
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <p>No orders found. This could be because:</p>
                <ul>
                    <li>No customers have placed orders yet</li>
                    <li>Orders collection in Firebase is empty</li>
                    <li>There might be permission issues</li>
                </ul>
                <div class="debug-buttons">
                    <button id="create-test-order" class="btn-primary">Create Test Order</button>
                    <button id="debug-orders" class="btn-primary">Debug Orders</button>
                    <button id="force-show-orders" class="btn-primary">Force Show Orders</button>
                </div>
            </div>
        `;
        
        // Add event listeners to the newly created buttons
        const createTestOrderBtn = document.getElementById('create-test-order');
        const debugOrdersBtn = document.getElementById('debug-orders');
        const forceShowOrdersBtn = document.getElementById('force-show-orders');
        
        if (createTestOrderBtn) createTestOrderBtn.addEventListener('click', createTestOrder);
        if (debugOrdersBtn) debugOrdersBtn.addEventListener('click', inspectOrderIDs);
        if (forceShowOrdersBtn) forceShowOrdersBtn.addEventListener('click', showOrdersDirectly);
        
        return;
    }

    ordersList.innerHTML = filteredOrders.map(order => {
        // Format dates and add default values
        const orderNumber = order.orderNumber || `ORD-${order.id?.substring(0, 5)}`;
        const orderDate = order.createdAt ? order.createdAt.toLocaleString() : new Date().toLocaleString();
        const status = order.status || 'pending';
        const statusClass = `status-${status.toLowerCase()}`;
        const items = order.items || [];
        const totalPrice = parseFloat(order.totalPrice || order.total || 0).toFixed(2);
        
        // Create HTML for items with images
        const itemsHtml = items.map(item => `
            <div class="item-with-image">
                <div class="item-image">
                    <img src="${item.image || 'https://via.placeholder.com/60x60?text=No+Image'}" 
                         alt="${item.name || 'Item'}"
                         onerror="this.src='https://via.placeholder.com/60x60?text=Error'"
                         width="60" height="60">
                </div>
                <div class="item-details">
                    <p class="item-name">${item.name || 'Unnamed Item'}</p>
                    <p class="item-quantity">Quantity: ${item.quantity || 1}</p>
                    <p class="item-price">Price: ₹${parseFloat(item.price || 0).toFixed(2)} each</p>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="order-item" data-id="${order.id}">
                <div class="order-header">
                    <div class="order-title">
                        <h3>Order #${orderNumber}</h3>
                        <span class="order-date">${orderDate}</span>
                        <small class="order-id">ID: ${order.id}</small>
                    </div>
                    <span class="order-status ${statusClass}">${status}</span>
                </div>
                <div class="customer-info">
                    <p><strong>Customer:</strong> ${order.customerName || order.userEmail || 'Guest Customer'}</p>
                    <p><strong>Email:</strong> ${order.customerEmail || order.userEmail || 'No email provided'}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone || order.userPhone || 'N/A'}</p>
                </div>
                <div class="order-items">
                    <h4>Items:</h4>
                    <div class="items-grid">
                        ${itemsHtml}
                    </div>
                </div>
                <div class="order-footer">
                    <span class="order-total">Total: ₹${totalPrice}</span>
                    <div class="order-actions">
                        <button onclick="updateOrderStatus('${order.id}', '${status}')" class="status-btn">
                            Update Status
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add CSS for the new grid layout if it doesn't exist
    if (!document.getElementById('orders-image-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'orders-image-styles';
        styleEl.textContent = `
            .items-grid {
                display: grid;
                grid-gap: 10px;
                margin-top: 10px;
            }
            .item-with-image {
                display: flex;
                background: #f9f9f9;
                border-radius: 5px;
                padding: 8px;
                align-items: center;
            }
            .item-image {
                margin-right: 15px;
                min-width: 60px;
            }
            .item-image img {
                border-radius: 5px;
                object-fit: cover;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .item-details {
                flex: 1;
            }
            .item-name {
                font-weight: bold;
                margin: 0 0 5px 0;
            }
            .item-quantity, .item-price {
                margin: 2px 0;
                font-size: 0.9em;
            }
            .order-item {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                margin-bottom: 20px;
                padding: 15px;
            }
            .order-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .order-title h3 {
                margin: 0 0 5px 0;
            }
            .order-date {
                display: block;
                font-size: 0.9em;
                color: #666;
            }
            .order-id {
                display: block;
                font-size: 0.8em;
                color: #999;
            }
            .order-status {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: bold;
            }
            .status-pending {
                background: #FFF3CD;
                color: #856404;
            }
            .status-preparing {
                background: #D1ECF1;
                color: #0C5460;
            }
            .status-ready {
                background: #D4EDDA;
                color: #155724;
            }
            .status-delivered {
                background: #C3E6CB;
                color: #1E7E34;
            }
            .order-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #eee;
            }
            .order-total {
                font-weight: bold;
                font-size: 1.1em;
            }
            .order-actions button {
                background: #4e73df;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .order-actions button:hover {
                background: #2e59d9;
            }
            .customer-info {
                background: #f8f9fc;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 15px;
            }
            .customer-info p {
                margin: 5px 0;
            }
            .no-orders {
                background: #f8f9fc;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }
            .debug-buttons {
                margin-top: 15px;
                display: flex;
                gap: 10px;
                justify-content: center;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    console.log("Orders displayed successfully");
}

// Function to update order status
function updateOrderStatus(orderId, currentStatus) {
    const statuses = ['pending', 'preparing', 'ready', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus.toLowerCase());
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    db.collection('orders').doc(orderId).update({
        status: nextStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showSuccess(`Order status updated to ${nextStatus}`);
        // No need to call loadOrders() as we're using a real-time listener
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showError('Failed to update order status');
    });
}

// Function to search orders
function searchOrders(query) {
    console.log("Searching orders for:", query);
    if (!query && query !== '') {
        console.warn("Invalid search query:", query);
        return;
    }
    
    const searchQuery = query.toLowerCase().trim();
    const orders = document.querySelectorAll('.order-item');
    
    if (!searchQuery) {
        // If search is empty, show all orders based on current status filter
        const orderStatus = document.getElementById('orderStatus');
        const status = orderStatus && orderStatus.value ? orderStatus.value : 'all';
        
        orders.forEach(order => {
            if (status === 'all') {
                order.style.display = 'block';
            } else {
                const statusElement = order.querySelector('.order-status');
                if (statusElement) {
                    const orderStatus = statusElement.textContent.toLowerCase();
                    order.style.display = orderStatus === status ? 'block' : 'none';
                }
            }
        });
        return;
    }
    
    orders.forEach(order => {
        const orderHeader = order.querySelector('h3');
        const customerInfo = order.querySelector('.customer-info');
        const items = order.querySelector('.order-items');
        
        const orderNumber = orderHeader ? orderHeader.textContent.toLowerCase() : '';
        const customerText = customerInfo ? customerInfo.textContent.toLowerCase() : '';
        const itemsText = items ? items.textContent.toLowerCase() : '';
        
        if (orderNumber.includes(searchQuery) || 
            customerText.includes(searchQuery) || 
            itemsText.includes(searchQuery)) {
            order.style.display = 'block';
        } else {
            order.style.display = 'none';
        }
    });
}

// Add event listener for order status filter change
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up order status listeners");
    // Load orders when page loads
    loadOrders();
    
    // Set up event listener for order status filter
    const orderStatus = document.getElementById('orderStatus');
    if (orderStatus) {
        console.log("Found orderStatus element, attaching change listener");
        orderStatus.addEventListener('change', function() {
            console.log("Order status changed to:", this.value);
            const orders = document.querySelectorAll('.order-item');
            const status = this.value;
            
            if (status === 'all') {
                orders.forEach(order => order.style.display = 'block');
            } else {
                orders.forEach(order => {
                    const statusElement = order.querySelector('.order-status');
                    if (statusElement) {
                        const orderStatus = statusElement.textContent.toLowerCase();
                        order.style.display = orderStatus === status ? 'block' : 'none';
                    }
                });
            }
        });
    } else {
        console.warn("orderStatus element not found in DOM");
    }
    
    // Set up event listener for search
    const orderSearch = document.getElementById('orderSearch');
    if (orderSearch) {
        console.log("Found orderSearch element, attaching input listener");
        orderSearch.addEventListener('input', function() {
            searchOrders(this.value);
        });
    } else {
        console.warn("orderSearch element not found in DOM");
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Owner.js: DOM content loaded");
    
    // Fix for "Cannot read properties of null (reading 'value')" error
    // Add null checks for orderStatus and other potential null elements
    const orderStatus = document.getElementById('orderStatus');
    if (orderStatus) {
        orderStatus.addEventListener('change', function() {
            const status = orderStatus.value;
            filterOrdersByStatus(status);
        });
    } else {
        console.log("Notice: orderStatus element not found - this is normal if not on orders page");
    }

    // Check if user is already authenticated
    auth.onAuthStateChanged(function(user) {
        console.log("Auth state changed:", user ? "User logged in" : "No user");
        
        if (user) {
            // Check if user is an owner
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists && doc.data().role === 'owner') {
                        console.log("Owner verified, showing dashboard");
                        showOwnerDashboard();
                    } else {
                        console.log("Not an owner account, logging out");
                        auth.signOut();
                        showLoginModal();
                    }
                })
                .catch((error) => {
                    console.error("Error checking role:", error);
                    showError("Error checking role: " + error.message);
                });
        } else {
            console.log("No user, showing login modal");
            showLoginModal();
        }
    });
    
    // Set up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Logout clicked");
            
            auth.signOut()
                .then(() => {
                    console.log("Logged out successfully");
                    showSuccess("Logged out successfully");
                    hideOwnerDashboard();
                    showLoginModal();
                })
                .catch((error) => {
                    console.error("Logout error:", error);
                    showError("Logout failed: " + error.message);
                });
        });
    }
    
    // Set up modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Setup form submission handlers for login/signup if not already set up in auth.js
    setupLoginHandlers();

    // Add event listeners for the order action buttons
    console.log("Setting up order buttons...");
    
    // Setup Create Test Order button
    const createTestOrderBtn = document.querySelector('button[onclick="createTestOrder()"], #createTestOrderBtn');
    if (createTestOrderBtn) {
        console.log("Found Create Test Order button, attaching listener");
        createTestOrderBtn.addEventListener('click', function() {
            createTestOrder();
        });
    } else {
        console.warn("Create Test Order button not found");
    }
    
    // Setup Debug Orders button
    const debugOrdersBtn = document.querySelector('button[onclick="inspectOrderIDs()"], #debugOrdersBtn');
    if (debugOrdersBtn) {
        console.log("Found Debug Orders button, attaching listener");
        debugOrdersBtn.addEventListener('click', function() {
            inspectOrderIDs();
        });
    } else {
        console.warn("Debug Orders button not found");
    }
    
    // Setup Force Show Orders button
    const forceShowOrdersBtn = document.querySelector('button[onclick="showOrdersDirectly()"], #forceShowOrdersBtn');
    if (forceShowOrdersBtn) {
        console.log("Found Force Show Orders button, attaching listener");
        forceShowOrdersBtn.addEventListener('click', function() {
            showOrdersDirectly();
        });
    } else {
        console.warn("Force Show Orders button not found");
    }
});

// Helper function to filter orders by status
function filterOrdersByStatus(status) {
    console.log("Filtering orders by status:", status);
    const orders = document.querySelectorAll('.order-item');
    
    if (status === 'all') {
        orders.forEach(order => {
            order.style.display = 'block';
        });
        return;
    }
    
    orders.forEach(order => {
        const orderStatus = order.querySelector('.order-status')?.textContent.toLowerCase();
        if (orderStatus) {
            order.style.display = orderStatus === status.toLowerCase() ? 'block' : 'none';
        }
    });
}

// Function to show login modal
function showLoginModal() {
    console.log("Showing login modal");
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
    } else {
        console.error("Login modal not found in DOM");
    }
}

// Function to show owner dashboard
function showOwnerDashboard() {
    console.log("Showing owner dashboard");
    const loginModal = document.getElementById('loginModal');
    const dashboard = document.getElementById('dashboard');
    
    if (loginModal) loginModal.style.display = 'none';
    if (dashboard) {
        dashboard.style.display = 'block';
        console.log("Dashboard display set to:", dashboard.style.display);
    } else {
        console.error("Dashboard element not found");
    }
    
    // Load dashboard data
    loadDashboardData();
}

// Function to hide owner dashboard
function hideOwnerDashboard() {
    console.log("Hiding owner dashboard");
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'none';
}

// Function to load all dashboard data
function loadDashboardData() {
    console.log("Loading dashboard data");
    
    // Load menu items
    if (typeof loadMenuItems === 'function') {
        console.log("Loading menu items");
        try {
            loadMenuItems();
        } catch (error) {
            console.error("Error loading menu items:", error);
        }
    } else {
        console.log("loadMenuItems function not available");
    }
    
    // Load orders with direct method to bypass onSnapshot issues
    loadOrdersDirectly();
    
    // Load inventory if function exists
    if (typeof loadInventory === 'function') {
        console.log("Loading inventory");
        try {
            loadInventory();
        } catch (error) {
            console.error("Error loading inventory:", error);
        }
    }
    
    // Load analytics if function exists
    if (typeof loadAnalytics === 'function') {
        console.log("Loading analytics");
        try {
            loadAnalytics();
        } catch (error) {
            console.error("Error loading analytics:", error);
        }
    }
}

// Function to load orders directly
function loadOrdersDirectly() {
    console.log("Loading orders directly");
    const ordersList = document.getElementById('ordersList');
    
    if (!ordersList) {
        console.error("ordersList element not found");
        return;
    }
    
    ordersList.innerHTML = '<div class="loading">Loading orders...</div>';
    
    try {
        // Direct Firestore query
        db.collection('orders').get()
            .then(snapshot => {
                console.log(`Found ${snapshot.size} orders in Firestore`);
                
                const orders = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    orders.push({
                        id: doc.id,
                        orderNumber: data.orderNumber || `ORD-${doc.id.substring(0, 5)}`,
                        status: data.status || 'pending',
                        items: data.items || [],
                        totalPrice: data.totalPrice || 0,
                        createdAt: data.createdAt ? 
                            (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : 
                            new Date(),
                        customerName: data.customerName || data.userEmail || 'Guest Customer',
                        customerEmail: data.customerEmail || data.userEmail || 'No email provided',
                        customerPhone: data.customerPhone || 'N/A'
                    });
                });
                
                if (orders.length === 0) {
                    ordersList.innerHTML = '<div class="no-orders">No orders found</div>';
                } else {
                    // Sort by date (newest first)
                    orders.sort((a, b) => b.createdAt - a.createdAt);
                    
                    // Display orders
                    displayOrders(orders);
                }
            })
            .catch(error => {
                console.error("Error loading orders:", error);
                ordersList.innerHTML = `<div class="error">Error loading orders: ${error.message}</div>`;
            });
    } catch (error) {
        console.error("Exception in loadOrdersDirectly:", error);
        ordersList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Function to set up login handlers if not already in auth.js
function setupLoginHandlers() {
    // Only set these up if no listeners exist yet
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    
    // Function to toggle between login and signup forms
    window.toggleAuth = function(form) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (form === 'login') {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    };
}

// Utility functions for notifications if not in auth.js
if (typeof showSuccess !== 'function') {
    window.showSuccess = function(message) {
        console.log("Success:", message);
        
        const notification = document.createElement('div');
        notification.className = 'success';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    };
}

if (typeof showError !== 'function') {
    window.showError = function(message) {
        console.error("Error:", message);
        
        const notification = document.createElement('div');
        notification.className = 'error';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#f44336';
        notification.style.color = 'white';
        notification.style.padding = '15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    };
}

// Function to create a test order
function createTestOrder() {
    console.log("Creating test order");
    
    // Generate random test items with images
    const testItems = [
        {
            name: "Chicken Biryani",
            price: 249.99,
            quantity: 2,
            image: "https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/mdipoyzfzsa7q9ypfcyr"
        },
        {
            name: "Paneer Butter Masala",
            price: 199.50,
            quantity: 1,
            image: "https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/yfyo8aklppbwdplv7ofp"
        }
    ];
    
    const testOrder = {
        orderNumber: "TEST-" + Math.floor(Math.random() * 1000),
        status: "pending",
        items: testItems,
        totalPrice: 699.48, // 249.99*2 + 199.50
        total: 699.48, // For backward compatibility
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(), // For backward compatibility
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        customerPhone: "1234567890"
    };
    
    alert("Creating test order...");
    
    db.collection('orders').add(testOrder)
        .then(docRef => {
            console.log("Test order created with ID:", docRef.id);
            alert("Test order created with ID: " + docRef.id);
            showSuccess("Test order created successfully!");
            // Reload orders to show the new order
            setTimeout(() => loadOrders(), 1000);
        })
        .catch(error => {
            console.error("Error creating test order:", error);
            alert("Error creating test order: " + error.message);
            showError("Failed to create test order: " + error.message);
        });
}

// Function to inspect order IDs
function inspectOrderIDs() {
    console.log("Inspecting order IDs");
    alert("Checking orders in Firebase...");
    
    db.collection('orders').get()
        .then(snapshot => {
            const orderIds = [];
            snapshot.forEach(doc => {
                orderIds.push(doc.id);
                console.log("Order ID:", doc.id, "Data:", doc.data());
            });
            
            if (orderIds.length === 0) {
                alert("No orders found in the database!");
            } else {
                alert(`Found ${orderIds.length} orders. IDs: ${orderIds.join(', ')}`);
            }
        })
        .catch(error => {
            console.error("Error inspecting orders:", error);
            alert("Error inspecting orders: " + error.message);
        });
}

// Debug log to verify script is loading
console.log("Owner.js is loaded and running");

// Function to force show orders directly
function showOrdersDirectly() {
    console.log("Force showing orders directly");
    const ordersList = document.getElementById('ordersList');
    
    if (!ordersList) {
        alert("Could not find ordersList element in the DOM");
        return;
    }
    
    alert("Loading orders directly from Firebase...");
    ordersList.innerHTML = '<div class="loading">Force loading orders directly...</div>';
    
    try {
        // Direct Firestore query without onSnapshot
        db.collection('orders').get()
            .then(snapshot => {
                console.log(`Directly found ${snapshot.size} orders`);
                
                if (snapshot.empty) {
                    ordersList.innerHTML = '<div class="no-orders">No orders found in database.</div>';
                    alert("No orders found in the database!");
                    return;
                }
                
                let ordersHtml = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`Direct order: ${doc.id}`, data);
                    
                    // Get items with images
                    const items = data.items || [];
                    const itemsHtml = items.map(item => `
                        <div class="item-with-image" style="display:flex; margin-bottom:8px; padding:5px; background:#f5f5f5; border-radius:4px;">
                            <img src="${item.image || 'https://via.placeholder.com/50x50?text=No+Image'}" 
                                 alt="${item.name}" 
                                 style="width:50px; height:50px; object-fit:cover; border-radius:4px; margin-right:10px;"
                                 onerror="this.src='https://via.placeholder.com/50x50?text=Error'">
                            <div>
                                <strong>${item.name}</strong><br>
                                Qty: ${item.quantity} × ₹${parseFloat(item.price || 0).toFixed(2)}
                            </div>
                        </div>
                    `).join('');
                    
                    // Simple HTML for each order
                    ordersHtml += `
                        <div class="order-item" style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h3>Order #${data.orderNumber || doc.id}</h3>
                            <p><strong>Status:</strong> ${data.status || 'pending'}</p>
                            <p><strong>Customer:</strong> ${data.customerName || data.userEmail || 'Guest'}</p>
                            <p><strong>Total:</strong> ₹${parseFloat(data.totalPrice || data.total || 0).toFixed(2)}</p>
                            <div style="margin:10px 0;">
                                <p><strong>Items:</strong></p>
                                ${itemsHtml}
                            </div>
                            <p><strong>ID:</strong> ${doc.id}</p>
                            <button onclick="updateOrderStatus('${doc.id}', '${data.status || 'pending'}')" 
                                    style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                                Update Status
                            </button>
                        </div>
                    `;
                });
                
                ordersList.innerHTML = ordersHtml || '<div class="no-orders">Failed to render orders.</div>';
                alert(`Successfully loaded ${snapshot.size} orders!`);
            })
            .catch(error => {
                console.error("Direct order loading error:", error);
                ordersList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
                alert("Error loading orders: " + error.message);
            });
    } catch (err) {
        console.error("Exception in showOrdersDirectly:", err);
        ordersList.innerHTML = `<div class="error">Exception: ${err.message}</div>`;
        alert("Exception: " + err.message);
    }
}

// Initialize Firebase (with extra error handling)
try {
    console.log("Firebase initialization verified:", firebase);
    console.log("Firestore availability:", window.db ? "Available" : "Not available");
} catch (err) {
    console.error("Firebase initialization error check:", err);
}

// Make functions globally accessible
window.createTestOrder = createTestOrder;
window.inspectOrderIDs = inspectOrderIDs;
window.showOrdersDirectly = showOrdersDirectly;
window.updateOrderStatus = updateOrderStatus;

// Add direct click handlers for the buttons in the HTML
document.addEventListener('DOMContentLoaded', function() {
    // Find buttons by ID
    const createTestOrderBtn = document.getElementById('createTestOrderBtn');
    const debugOrdersBtn = document.getElementById('debugOrdersBtn');
    const forceShowOrdersBtn = document.getElementById('forceShowOrdersBtn');
    
    // Attach direct click handlers
    if (createTestOrderBtn) {
        createTestOrderBtn.onclick = function() {
            createTestOrder();
        };
    }
    
    if (debugOrdersBtn) {
        debugOrdersBtn.onclick = function() {
            inspectOrderIDs();
        };
    }
    
    if (forceShowOrdersBtn) {
        forceShowOrdersBtn.onclick = function() {
            showOrdersDirectly();
        };
    }
});

// Add direct event handlers to the buttons when the page loads
window.onload = function() {
    console.log("Window loaded, attaching direct button handlers");
    
    // Get buttons by both inline onclick and ID
    document.querySelectorAll('button').forEach(button => {
        const buttonText = button.textContent.trim();
        
        if (buttonText === "Create Test Order") {
            console.log("Found Create Test Order button");
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Create Test Order button clicked");
                forceCreateTestOrder();
                return false;
            };
        }
        
        if (buttonText === "Debug Orders") {
            console.log("Found Debug Orders button");
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Debug Orders button clicked");
                inspectOrderIDs();
                return false;
            };
        }
        
        if (buttonText === "Force Show Orders") {
            console.log("Found Force Show Orders button");
            button.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Force Show Orders button clicked");
                forceShowOrdersDirectly();
                return false;
            };
        }
    });
    
    // Try to automatically create and load a test order
    setTimeout(() => {
        forceCreateTestOrder();
    }, 2000);
};

// Function that force creates a test order and immediately displays it
function forceCreateTestOrder() {
    console.log("🔴 FORCE CREATING TEST ORDER");
    
    // Generate test items with images
    const testItems = [
        {
            name: "Chicken Biryani",
            price: 249.99,
            quantity: 2,
            image: "https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/mdipoyzfzsa7q9ypfcyr"
        },
        {
            name: "Paneer Butter Masala",
            price: 199.50,
            quantity: 1,
            image: "https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/yfyo8aklppbwdplv7ofp"
        }
    ];
    
    const testOrder = {
        orderNumber: "TEST-" + Math.floor(Math.random() * 1000),
        status: "pending",
        items: testItems,
        totalPrice: 699.48,
        total: 699.48,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        customerPhone: "1234567890"
    };
    
    console.log("Creating test order with data:", testOrder);
    alert("Creating test order with Biryani and Paneer...");
    
    db.collection('orders').add(testOrder)
        .then(docRef => {
            console.log("⭐ TEST ORDER CREATED! ID:", docRef.id);
            alert("Test order created successfully! ID: " + docRef.id);
            
            // Immediately show this order
            const ordersList = document.getElementById('ordersList');
            if (ordersList) {
                // Inject the new order directly into the DOM without waiting for Firebase
                const newOrderData = {
                    id: docRef.id,
                    ...testOrder,
                    createdAt: new Date()
                };
                
                // Create HTML for the new order
                const itemsHtml = testItems.map(item => `
                    <div class="item-with-image">
                        <div class="item-image">
                            <img src="${item.image || 'https://via.placeholder.com/60x60?text=No+Image'}" 
                                 alt="${item.name || 'Item'}"
                                 onerror="this.src='https://via.placeholder.com/60x60?text=Error'"
                                 width="60" height="60">
                        </div>
                        <div class="item-details">
                            <p class="item-name">${item.name || 'Unnamed Item'}</p>
                            <p class="item-quantity">Quantity: ${item.quantity || 1}</p>
                            <p class="item-price">Price: ₹${parseFloat(item.price || 0).toFixed(2)} each</p>
                        </div>
                    </div>
                `).join('');
                
                const orderHtml = `
                    <div class="order-item" data-id="${docRef.id}" style="background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); margin-bottom: 20px; padding: 15px;">
                        <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            <div class="order-title">
                                <h3>Order #${testOrder.orderNumber}</h3>
                                <span class="order-date" style="display: block; font-size: 0.9em; color: #666;">${new Date().toLocaleString()}</span>
                                <small class="order-id" style="display: block; font-size: 0.8em; color: #999;">ID: ${docRef.id}</small>
                            </div>
                            <span class="order-status status-pending" style="padding: 5px 10px; border-radius: 20px; font-size: 0.9em; font-weight: bold; background: #FFF3CD; color: #856404;">pending</span>
                        </div>
                        <div class="customer-info" style="background: #f8f9fc; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                            <p><strong>Customer:</strong> ${testOrder.customerName}</p>
                            <p><strong>Email:</strong> ${testOrder.customerEmail}</p>
                            <p><strong>Phone:</strong> ${testOrder.customerPhone}</p>
                        </div>
                        <div class="order-items">
                            <h4>Items:</h4>
                            <div class="items-grid" style="display: grid; grid-gap: 10px; margin-top: 10px;">
                                ${itemsHtml}
                            </div>
                        </div>
                        <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                            <span class="order-total" style="font-weight: bold; font-size: 1.1em;">Total: ₹${parseFloat(testOrder.totalPrice).toFixed(2)}</span>
                            <div class="order-actions">
                                <button onclick="updateOrderStatus('${docRef.id}', 'pending')" class="status-btn" style="background: #4e73df; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                                    Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove loading message if exists
                const loadingMessage = ordersList.querySelector('.loading');
                if (loadingMessage) {
                    ordersList.removeChild(loadingMessage);
                }
                
                // If "No orders found" is showing, clear it
                const noOrdersMessage = ordersList.querySelector('.no-orders');
                if (noOrdersMessage) {
                    ordersList.innerHTML = '';
                }
                
                // Add the new order to the top of the list
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = orderHtml;
                ordersList.insertBefore(tempDiv.firstChild, ordersList.firstChild);
                
                console.log("Manually added order to DOM:", docRef.id);
            } else {
                console.error("ordersList element not found - cannot display new order");
            }
            
            // Also try to reload everything, just in case
            setTimeout(() => {
                forceShowOrdersDirectly();
            }, 1000);
        })
        .catch(error => {
            console.error("❌ ERROR CREATING TEST ORDER:", error);
            alert("Error creating test order: " + error.message);
        });
}

// Enhanced function to force show orders directly
function forceShowOrdersDirectly() {
    console.log("🔍 FORCE SHOWING ORDERS DIRECTLY");
    const ordersList = document.getElementById('ordersList');
    
    if (!ordersList) {
        alert("Could not find ordersList element in the DOM");
        return;
    }
    
    ordersList.innerHTML = '<div class="loading" style="text-align: center; padding: 20px;">Loading orders directly from Firebase...</div>';
    
    try {
        db.collection('orders').get()
            .then(snapshot => {
                console.log(`Found ${snapshot.size} orders in database`);
                
                if (snapshot.empty) {
                    ordersList.innerHTML = '<div class="no-orders" style="background: #f8f9fc; padding: 20px; border-radius: 8px; text-align: center;">No orders found in database.</div>';
                    return;
                }
                
                let ordersHtml = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`Order ${doc.id}:`, data);
                    
                    // Get items with images
                    const items = data.items || [];
                    const itemsHtml = items.map(item => `
                        <div style="display:flex; margin-bottom:8px; padding:10px; background:#f5f5f5; border-radius:5px;">
                            <img src="${item.image || 'https://via.placeholder.com/60x60?text=No+Image'}" 
                                alt="${item.name || 'Item'}" 
                                style="width:60px; height:60px; object-fit:cover; border-radius:5px; margin-right:10px;"
                                onerror="this.src='https://via.placeholder.com/60x60?text=Error'">
                            <div>
                                <strong>${item.name || 'Unknown Item'}</strong><br>
                                Quantity: ${item.quantity || 1} × ₹${parseFloat(item.price || 0).toFixed(2)}
                            </div>
                        </div>
                    `).join('');
                    
                    // Format date
                    let orderDate = 'Unknown date';
                    try {
                        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                            orderDate = data.createdAt.toDate().toLocaleString();
                        } else if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                            orderDate = data.timestamp.toDate().toLocaleString();
                        }
                    } catch (e) {
                        console.error("Error formatting date:", e);
                    }
                    
                    // Simple HTML for each order with inline styles to ensure they appear correctly
                    ordersHtml += `
                        <div class="order-item" data-id="${doc.id}" style="background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                                <div>
                                    <h3 style="margin-top: 0; margin-bottom: 5px;">Order #${data.orderNumber || doc.id.substring(0, 6)}</h3>
                                    <span style="font-size: 0.9em; color: #666;">${orderDate}</span>
                                </div>
                                <span style="background: ${data.status === 'pending' ? '#FFF3CD' : data.status === 'preparing' ? '#D1ECF1' : data.status === 'ready' ? '#D4EDDA' : '#C3E6CB'}; 
                                      color: ${data.status === 'pending' ? '#856404' : data.status === 'preparing' ? '#0C5460' : data.status === 'ready' ? '#155724' : '#1E7E34'};
                                      padding: 5px 10px; border-radius: 20px; font-weight: bold;">
                                    ${data.status || 'pending'}
                                </span>
                            </div>
                            <div style="background: #f8f9fc; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                                <p style="margin: 5px 0;"><strong>Customer:</strong> ${data.customerName || data.userEmail || 'Guest'}</p>
                                <p style="margin: 5px 0;"><strong>Email:</strong> ${data.customerEmail || data.userEmail || 'N/A'}</p>
                                <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.customerPhone || 'N/A'}</p>
                            </div>
                            <div>
                                <h4 style="margin-bottom: 10px;">Items:</h4>
                                ${itemsHtml}
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;">
                                <span style="font-weight: bold; font-size: 1.1em;">Total: ₹${parseFloat(data.totalPrice || data.total || 0).toFixed(2)}</span>
                                <button onclick="updateOrderStatusDirectly('${doc.id}', '${data.status || 'pending'}')" 
                                        style="background: #4e73df; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                                    Update Status
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                ordersList.innerHTML = ordersHtml || '<div class="no-orders">Failed to render orders.</div>';
                console.log("Orders rendered successfully");
            })
            .catch(error => {
                console.error("Error loading orders:", error);
                ordersList.innerHTML = `<div class="error" style="color: red; padding: 15px; background: #ffeeee; border-radius: 5px;">Error: ${error.message}</div>`;
            });
    } catch (error) {
        console.error("Exception:", error);
        ordersList.innerHTML = `<div class="error" style="color: red; padding: 15px; background: #ffeeee; border-radius: 5px;">Exception: ${error.message}</div>`;
    }
}

// Function to update an order status directly
window.updateOrderStatusDirectly = function(orderId, currentStatus) {
    console.log("Updating status for order:", orderId, "Current status:", currentStatus);
    
    const statuses = ['pending', 'preparing', 'ready', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus.toLowerCase());
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    console.log("Changing status from", currentStatus, "to", nextStatus);
    alert(`Changing order ${orderId} status from ${currentStatus} to ${nextStatus}`);
    
    db.collection('orders').doc(orderId).update({
        status: nextStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert(`Order status updated to ${nextStatus}`);
        console.log("Status updated successfully");
        
        // Update the status in the DOM directly
        const orderItem = document.querySelector(`.order-item[data-id="${orderId}"]`);
        if (orderItem) {
            const statusElement = orderItem.querySelector('.order-status');
            if (statusElement) {
                statusElement.textContent = nextStatus;
                statusElement.className = `order-status status-${nextStatus}`;
            }
        }
        
        // Also reload all orders
        setTimeout(() => {
            forceShowOrdersDirectly();
        }, 500);
    })
    .catch(error => {
        console.error("Error updating status:", error);
        alert("Error updating status: " + error.message);
    });
};

// Immediately connect the buttons without waiting for events
console.log("Directly connecting order buttons...");

// Try to immediately connect the buttons when this script runs
try {
    // Find all possible button selectors
    const createTestOrderBtns = document.querySelectorAll('button[onclick="createTestOrder()"], #createTestOrderBtn, button:contains("Create Test Order")');
    const inspectOrdersBtns = document.querySelectorAll('button[onclick="inspectOrderIDs()"], #debugOrdersBtn, button:contains("Debug Orders")');
    const forceShowOrdersBtns = document.querySelectorAll('button[onclick="showOrdersDirectly()"], #forceShowOrdersBtn, button:contains("Force Show Orders")');

    console.log(`Found ${createTestOrderBtns.length} create buttons, ${inspectOrdersBtns.length} debug buttons, ${forceShowOrdersBtns.length} force show buttons`);

    // Connect create test order buttons
    createTestOrderBtns.forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            console.log("Create Test Order button clicked!");
            try {
                window.createTestOrder();
            } catch (error) {
                alert("Error creating test order: " + error.message);
                console.error("Error in createTestOrder:", error);
            }
            return false;
        };
    });

    // Connect debug orders buttons
    inspectOrdersBtns.forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            console.log("Debug Orders button clicked!");
            try {
                window.inspectOrderIDs();
            } catch (error) {
                alert("Error debugging orders: " + error.message);
                console.error("Error in inspectOrderIDs:", error);
            }
            return false;
        };
    });

    // Connect force show orders buttons
    forceShowOrdersBtns.forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            console.log("Force Show Orders button clicked!");
            try {
                window.showOrdersDirectly();
            } catch (error) {
                alert("Error showing orders: " + error.message);
                console.error("Error in showOrdersDirectly:", error);
            }
            return false;
        };
    });
} catch (error) {
    console.error("Error connecting buttons:", error);
}

// Force buttons to work by adding functions directly to button elements
document.addEventListener('click', function(e) {
    const target = e.target;
    
    // Check if clicked element is one of our buttons
    if (target.tagName === 'BUTTON') {
        const text = target.textContent.trim();
        
        if (text === 'Create Test Order') {
            e.preventDefault();
            e.stopPropagation();
            console.log("Create Test Order button clicked via event delegation");
            window.createTestOrder();
            return false;
        }
        
        if (text === 'Debug Orders') {
            e.preventDefault();
            e.stopPropagation();
            console.log("Debug Orders button clicked via event delegation");
            window.inspectOrderIDs();
            return false;
        }
        
        if (text === 'Force Show Orders') {
            e.preventDefault();
            e.stopPropagation();
            console.log("Force Show Orders button clicked via event delegation");
            window.showOrdersDirectly();
            return false;
        }
    }
}); 