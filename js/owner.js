// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAlYso3uIhbyU711F_1Wt9eJzBtcPOUlKY",
    authDomain: "hotel-managment-48744.firebaseapp.com",
    projectId: "hotel-managment-48744",
    storageBucket: "hotel-managment-48744.firebasestorage.app",
    messagingSenderId: "91221905283",
    appId: "1:91221905283:web:cc9a643990db68ebd0b0b6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let orders = [];
let currentFilter = 'all';

// Function to load orders from Firebase
function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '<div class="loading">Loading orders...</div>';

    // Set up real-time listener for orders
    db.collection('orders')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            orders = [];
            if (snapshot.empty) {
                ordersList.innerHTML = '<div class="loading">No orders found</div>';
                return;
            }

            snapshot.forEach(doc => {
                const orderData = doc.data();
                console.log('Order data:', orderData); // Debug log
                
                // Add null checks and default values when creating order object
                orders.push({
                    id: doc.id,
                    orderNumber: orderData.orderNumber || 'N/A',
                    status: orderData.status || 'pending',
                    items: orderData.items || [],
                    totalPrice: orderData.totalPrice || 0,
                    createdAt: orderData.createdAt ? orderData.createdAt.toDate() : new Date(),
                    updatedAt: orderData.updatedAt ? orderData.updatedAt.toDate() : new Date(),
                    customerName: orderData.customerName || 'N/A',
                    customerEmail: orderData.customerEmail || 'N/A',
                    customerPhone: orderData.customerPhone || 'N/A'
                });
            });

            console.log('Loaded orders:', orders); // Debug log
            displayOrders();
        }, (error) => {
            console.error('Error loading orders:', error);
            ordersList.innerHTML = '<div class="error">Failed to load orders. Please try again.</div>';
        });
}

// Function to display orders
function displayOrders() {
    const ordersList = document.getElementById('orders-list');
    const filteredOrders = filterOrdersByStatus(orders, currentFilter);

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<div class="loading">No orders found</div>';
        return;
    }

    ordersList.innerHTML = filteredOrders.map(order => {
        // Add null checks and default values
        const orderNumber = order.orderNumber || 'N/A';
        const orderDate = order.createdAt ? order.createdAt.toLocaleString() : 'N/A';
        const status = order.status || 'pending';
        const statusClass = `status-${status.toLowerCase()}`;
        const items = order.items || [];
        const totalPrice = order.totalPrice || 0;
        const customerName = order.customerName || 'N/A';
        const customerEmail = order.customerEmail || 'N/A';
        const customerPhone = order.customerPhone || 'N/A';

        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <span class="order-number">Order #${orderNumber}</span>
                        <span class="order-date">${orderDate}</span>
                    </div>
                    <span class="order-status ${statusClass}">${status}</span>
                </div>
                <div class="customer-info">
                    <div class="customer-name">Customer: ${customerName}</div>
                    <div class="customer-contact">Email: ${customerEmail}</div>
                    <div class="customer-contact">Phone: ${customerPhone}</div>
                </div>
                <div class="order-items">
                    ${items.map(item => {
                        // Add null checks for item properties
                        const itemName = item.name || 'Unnamed Item';
                        const itemPrice = parseFloat(item.price || 0);
                        const itemQuantity = parseInt(item.quantity || 1);
                        const itemImage = item.image || 'https://via.placeholder.com/80x80?text=No+Image';
                        const itemSubtotal = (itemPrice * itemQuantity).toFixed(2);

                        return `
                            <div class="order-item">
                                <img src="${itemImage}" 
                                     alt="${itemName}" 
                                     onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                                <div class="item-details">
                                    <div class="item-name">${itemName}</div>
                                    <div class="item-price">₹${itemPrice.toFixed(2)}</div>
                                    <div class="item-quantity">Quantity: ${itemQuantity}</div>
                                    <div class="item-subtotal">Subtotal: ₹${itemSubtotal}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="order-footer">
                    <div class="order-total">
                        Total: ₹${parseFloat(totalPrice).toFixed(2)}
                    </div>
                    <div class="order-actions">
                        <button class="action-btn update-status-btn" onclick="updateOrderStatus('${order.id}', '${status}')">
                            Update Status
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Function to filter orders by status
function filterOrdersByStatus(orders, status) {
    if (status === 'all') return orders;
    return orders.filter(order => order.status.toLowerCase() === status.toLowerCase());
}

// Function to handle filter button clicks
function filterOrders(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === status) {
            btn.classList.add('active');
        }
    });
    displayOrders();
}

// Function to update order status
function updateOrderStatus(orderId, currentStatus) {
    if (!orderId || !currentStatus) {
        console.error('Invalid order ID or status');
        showError('Failed to update order status: Invalid data');
        return;
    }

    const statuses = ['pending', 'preparing', 'ready', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus.toLowerCase());
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    db.collection('orders').doc(orderId).update({
        status: nextStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showSuccess(`Order status updated to ${nextStatus}`);
        loadOrders(); // Reload orders after status update
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showError('Failed to update order status');
    });
}

// Function to handle logout
function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Error logging out:', error);
            showError('Failed to logout');
        });
}

// Utility functions for notifications
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'success';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize orders when page loads
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User authenticated:', user.email); // Debug log
            loadOrders();
        } else {
            console.log('No user authenticated, redirecting to login'); // Debug log
            window.location.href = 'index.html';
        }
    });
}); 