// DOM Elements
const loginModal = document.getElementById('loginModal');
const dashboard = document.getElementById('dashboard');
const addItemBtn = document.getElementById('addItemBtn');
const addInventoryBtn = document.getElementById('addInventoryBtn');
const addItemModal = document.getElementById('addItemModal');
const addInventoryModal = document.getElementById('addInventoryModal');
const closeButtons = document.querySelectorAll('.close');
const logoutBtn = document.getElementById('logoutBtn');
const menuSearch = document.getElementById('menuSearch');
const orderSearch = document.getElementById('orderSearch');
const inventorySearch = document.getElementById('inventorySearch');
const orderStatus = document.getElementById('orderStatus');

// Show/Hide Dashboard
function showDashboard() {
    loginModal.style.display = 'none';
    dashboard.style.display = 'block';
    loadMenuItems();
    loadOrders();
    loadInventory();
    loadAnalytics();
}

function showLoginModal() {
    loginModal.style.display = 'block';
    dashboard.style.display = 'none';
}

// Authentication
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            return db.collection('users').doc(userCredential.user.uid).get();
        })
        .then(doc => {
            if (doc.exists && doc.data().role === 'owner') {
                showDashboard();
            } else {
                auth.signOut();
                showError('Access denied. Owner privileges required.');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showError('Login failed. Please check your credentials.');
        });
});

// Modal Controls
addItemBtn.addEventListener('click', () => {
    addItemModal.style.display = 'block';
});

addInventoryBtn.addEventListener('click', () => {
    addInventoryModal.style.display = 'block';
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        addItemModal.style.display = 'none';
        addInventoryModal.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target === addItemModal) {
        addItemModal.style.display = 'none';
    }
    if (event.target === addInventoryModal) {
        addInventoryModal.style.display = 'none';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            window.location.href = 'Customer.html';
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
});

// Menu Management
function loadMenuItems() {
    const menuItems = document.getElementById('menuItems');
    menuItems.innerHTML = '<div class="loading">Loading menu items...</div>';

    db.collection('menu').get()
        .then(snapshot => {
            menuItems.innerHTML = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                const card = createMenuItemCard(doc.id, item);
                menuItems.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
            menuItems.innerHTML = '<div class="error">Failed to load menu items</div>';
        });
}

function createMenuItemCard(id, item) {
    const card = document.createElement('div');
    card.className = 'menu-item-card';
    card.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>${item.description}</p>
        <p class="price">₹${item.price}</p>
        <div class="card-actions">
            <button onclick="editMenuItem('${id}')" class="btn-primary">Edit</button>
            <button onclick="deleteMenuItem('${id}')" class="btn-danger">Delete</button>
        </div>
    `;
    return card;
}

// Order Management
function loadOrders() {
    console.log("Loading orders with classic approach");
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '<div class="loading">Loading orders...</div>';

    let query = db.collection('orders');
    const status = orderStatus && orderStatus.value !== 'all' ? orderStatus.value : null;
    if (status) {
        query = query.where('status', '==', status);
    }

    // Use both timestamp and createdAt for compatibility
    query.get()
        .then(snapshot => {
            console.log(`Found ${snapshot.size} orders in Firestore`);
            
            if (snapshot.empty) {
                ordersList.innerHTML = '<div class="no-orders">No orders found</div>';
                return;
            }
            
            ordersList.innerHTML = '';
            const orders = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Create a proper order object with all required fields and fallbacks
                const order = {
                    id: doc.id,
                    orderNumber: data.orderNumber || `ORD-${doc.id.substring(0, 5)}`,
                    status: data.status || 'pending',
                    items: data.items || [],
                    totalPrice: data.totalPrice || data.total || 0,
                    createdAt: data.createdAt ? 
                        (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : 
                        data.timestamp ? 
                            (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : new Date(data.timestamp)) : 
                            new Date(),
                    customerName: data.customerName || data.userEmail || 'Guest Customer',
                    customerEmail: data.customerEmail || data.userEmail || 'No email provided',
                    customerPhone: data.customerPhone || 'N/A'
                };
                
                orders.push(order);
            });
            
            // Sort by date (newest first)
            orders.sort((a, b) => b.createdAt - a.createdAt);
            
            // Create and append order cards
            orders.forEach(order => {
                const card = createOrderCard(order.id, order);
                ordersList.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            ordersList.innerHTML = '<div class="error">Failed to load orders: ' + error.message + '</div>';
        });
}

function createOrderCard(id, order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.dataset.id = id;
    
    // Format date for display
    const orderDate = order.createdAt ? order.createdAt.toLocaleString() : 'Unknown date';
    
    // Prepare items HTML with images
    const itemsHtml = (order.items || []).map(item => `
        <div class="order-item-row">
            <img src="${item.image || 'https://via.placeholder.com/60x60?text=No+Image'}" 
                 alt="${item.name || 'Item'}" 
                 class="item-image"
                 onerror="this.src='https://via.placeholder.com/60x60?text=Error'">
            <div class="item-details">
                <span class="item-name">${item.name || 'Unknown Item'}</span>
                <span class="item-quantity">x${item.quantity || 1}</span>
                <span class="item-price">₹${(item.price * (item.quantity || 1)).toFixed(2)}</span>
            </div>
        </div>
    `).join('');
    
    card.innerHTML = `
        <div class="order-header">
            <h3>Order #${order.orderNumber}</h3>
            <span class="order-date">${orderDate}</span>
            <span class="status ${order.status}">${order.status}</span>
        </div>
        <div class="customer-info">
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Email:</strong> ${order.customerEmail}</p>
            <p><strong>Phone:</strong> ${order.customerPhone}</p>
        </div>
        <div class="order-items">
            ${itemsHtml}
        </div>
        <div class="order-footer">
            <p>Total: ₹${parseFloat(order.totalPrice).toFixed(2)}</p>
            <div class="order-actions">
                <button onclick="updateOrderStatus('${id}', '${order.status}')" class="update-status-btn">
                    Update Status
                </button>
            </div>
        </div>
    `;
    
    // Add some styles for the images
    const style = document.createElement('style');
    if (!document.getElementById('order-card-styles')) {
        style.id = 'order-card-styles';
        style.textContent = `
            .order-card {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                margin-bottom: 20px;
                padding: 15px;
            }
            .order-header {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                margin-bottom: 15px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .order-date {
                color: #666;
                font-size: 0.9em;
            }
            .status {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: bold;
            }
            .pending {
                background: #FFF3CD;
                color: #856404;
            }
            .preparing {
                background: #D1ECF1;
                color: #0C5460;
            }
            .ready {
                background: #D4EDDA;
                color: #155724;
            }
            .delivered {
                background: #C3E6CB;
                color: #1E7E34;
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
            .order-item-row {
                display: flex;
                align-items: center;
                border-bottom: 1px solid #f0f0f0;
                padding: 8px 0;
            }
            .item-image {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: 5px;
                margin-right: 15px;
            }
            .item-details {
                flex: 1;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .item-name {
                font-weight: bold;
            }
            .item-quantity {
                color: #666;
            }
            .item-price {
                font-weight: bold;
            }
            .order-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #eee;
            }
            .update-status-btn {
                background: #4e73df;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
            }
            .update-status-btn:hover {
                background: #2e59d9;
            }
        `;
        document.head.appendChild(style);
    }
    
    return card;
}

// Inventory Management
function loadInventory() {
    const inventoryList = document.getElementById('inventoryList');
    inventoryList.innerHTML = '<div class="loading">Loading inventory...</div>';

    db.collection('inventory').get()
        .then(snapshot => {
            inventoryList.innerHTML = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                const card = createInventoryCard(doc.id, item);
                inventoryList.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading inventory:', error);
            inventoryList.innerHTML = '<div class="error">Failed to load inventory</div>';
        });
}

function createInventoryCard(id, item) {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    card.innerHTML = `
        <h3>${item.name}</h3>
        <p>Quantity: ${item.quantity} ${item.unit}</p>
        <p>Low Stock Threshold: ${item.threshold} ${item.unit}</p>
        <div class="card-actions">
            <button onclick="updateInventory('${id}')" class="btn-primary">Update</button>
            <button onclick="deleteInventoryItem('${id}')" class="btn-danger">Delete</button>
        </div>
    `;
    return card;
}

// Analytics
function loadAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's Revenue
    db.collection('orders')
        .where('timestamp', '>=', today)
        .get()
        .then(snapshot => {
            let total = 0;
            snapshot.forEach(doc => {
                total += doc.data().total;
            });
            document.getElementById('todayRevenue').textContent = `₹${total}`;
        });

    // Today's Orders
    db.collection('orders')
        .where('timestamp', '>=', today)
        .get()
        .then(snapshot => {
            document.getElementById('todayOrders').textContent = snapshot.size;
        });

    // Popular Items
    db.collection('orders')
        .where('timestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .get()
        .then(snapshot => {
            const itemCounts = {};
            snapshot.forEach(doc => {
                doc.data().items.forEach(item => {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
                });
            });
            const popularItems = Object.entries(itemCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
            const popularItemsList = document.getElementById('popularItems');
            popularItemsList.innerHTML = popularItems
                .map(([name, count]) => `<li>${name} (${count})</li>`)
                .join('');
        });

    // Low Stock Items
    db.collection('inventory')
        .where('quantity', '<=', db.FieldValue.increment(0))
        .get()
        .then(snapshot => {
            const lowStockItems = document.getElementById('lowStockItems');
            lowStockItems.innerHTML = snapshot.docs
                .map(doc => {
                    const item = doc.data();
                    return `<li>${item.name} (${item.quantity} ${item.unit})</li>`;
                })
                .join('');
        });
}

// Form Submissions
document.getElementById('addItemForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
        name: document.getElementById('itemName').value,
        description: document.getElementById('itemDescription').value,
        price: parseFloat(document.getElementById('itemPrice').value),
        category: document.getElementById('itemCategory').value,
        image: document.getElementById('itemImage').value
    };

    db.collection('menu').add(formData)
        .then(() => {
            addItemModal.style.display = 'none';
            loadMenuItems();
            showSuccess('Menu item added successfully');
        })
        .catch(error => {
            console.error('Error adding menu item:', error);
            showError('Failed to add menu item');
        });
});

document.getElementById('addInventoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
        name: document.getElementById('inventoryName').value,
        quantity: parseInt(document.getElementById('inventoryQuantity').value),
        unit: document.getElementById('inventoryUnit').value,
        threshold: parseInt(document.getElementById('inventoryThreshold').value)
    };

    db.collection('inventory').add(formData)
        .then(() => {
            addInventoryModal.style.display = 'none';
            loadInventory();
            showSuccess('Inventory item added successfully');
        })
        .catch(error => {
            console.error('Error adding inventory item:', error);
            showError('Failed to add inventory item');
        });
});

// Search Functionality
menuSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const menuItems = document.querySelectorAll('.menu-item-card');
    menuItems.forEach(item => {
        const name = item.querySelector('h3').textContent.toLowerCase();
        const description = item.querySelector('p').textContent.toLowerCase();
        if (name.includes(searchTerm) || description.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

orderStatus.addEventListener('change', loadOrders);

// Utility Functions
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

// Initialize
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists && doc.data().role === 'owner') {
                    showDashboard();
                } else {
                    showLoginModal();
                }
            })
            .catch(error => {
                console.error('Error checking user role:', error);
                showLoginModal();
            });
    } else {
        showLoginModal();
    }
});

// Menu Item Management Functions
function editMenuItem(id) {
    db.collection('menu').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const item = doc.data();
                // Populate the form with existing data
                document.getElementById('itemName').value = item.name;
                document.getElementById('itemDescription').value = item.description;
                document.getElementById('itemPrice').value = item.price;
                document.getElementById('itemCategory').value = item.category;
                document.getElementById('itemImage').value = item.image;
                
                // Change form submission to update instead of add
                const form = document.getElementById('addItemForm');
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const formData = {
                        name: document.getElementById('itemName').value,
                        description: document.getElementById('itemDescription').value,
                        price: parseFloat(document.getElementById('itemPrice').value),
                        category: document.getElementById('itemCategory').value,
                        image: document.getElementById('itemImage').value,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    db.collection('menu').doc(id).update(formData)
                        .then(() => {
                            addItemModal.style.display = 'none';
                            loadMenuItems();
                            showSuccess('Menu item updated successfully');
                            // Reset form submission handler
                            form.onsubmit = null;
                        })
                        .catch(error => {
                            console.error('Error updating menu item:', error);
                            showError('Failed to update menu item');
                        });
                };

                // Show the modal
                addItemModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading menu item:', error);
            showError('Failed to load menu item');
        });
}

function deleteMenuItem(id) {
    if (confirm('Are you sure you want to delete this menu item?')) {
        db.collection('menu').doc(id).delete()
            .then(() => {
                loadMenuItems();
                showSuccess('Menu item deleted successfully');
            })
            .catch(error => {
                console.error('Error deleting menu item:', error);
                showError('Failed to delete menu item');
            });
    }
}

function updateOrderStatus(orderId, newStatus) {
    db.collection('orders').doc(orderId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        loadOrders();
        showSuccess('Order status updated successfully');
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showError('Failed to update order status');
    });
}

function updateInventory(id) {
    db.collection('inventory').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const item = doc.data();
                // Populate the form with existing data
                document.getElementById('inventoryName').value = item.name;
                document.getElementById('inventoryQuantity').value = item.quantity;
                document.getElementById('inventoryUnit').value = item.unit;
                document.getElementById('inventoryThreshold').value = item.threshold;
                
                // Change form submission to update instead of add
                const form = document.getElementById('addInventoryForm');
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const formData = {
                        name: document.getElementById('inventoryName').value,
                        quantity: parseInt(document.getElementById('inventoryQuantity').value),
                        unit: document.getElementById('inventoryUnit').value,
                        threshold: parseInt(document.getElementById('inventoryThreshold').value),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    db.collection('inventory').doc(id).update(formData)
                        .then(() => {
                            addInventoryModal.style.display = 'none';
                            loadInventory();
                            showSuccess('Inventory item updated successfully');
                            // Reset form submission handler
                            form.onsubmit = null;
                        })
                        .catch(error => {
                            console.error('Error updating inventory item:', error);
                            showError('Failed to update inventory item');
                        });
                };

                // Show the modal
                addInventoryModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error loading inventory item:', error);
            showError('Failed to load inventory item');
        });
}

function deleteInventoryItem(id) {
    if (confirm('Are you sure you want to delete this inventory item?')) {
        db.collection('inventory').doc(id).delete()
            .then(() => {
                loadInventory();
                showSuccess('Inventory item deleted successfully');
            })
            .catch(error => {
                console.error('Error deleting inventory item:', error);
                showError('Failed to delete inventory item');
            });
    }
}