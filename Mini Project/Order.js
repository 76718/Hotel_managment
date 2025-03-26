// Use global Firebase instances
const auth = window.auth;
const db = window.db;

// Menu items data (for reference in addToCart)
const menuItems = [
    { name: "Idli", price: 5.99, image: "https://yummy-valley.com/wp-content/uploads/2024/01/millet-idli.webp" },
    { name: "Dosa", price: 8.99, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXNRkQBAaLqrXbPH1qQncIKl6ZuusEMTndEA&s" },
    { name: "Pasta", price: 7.49, image: "https://assets.epicurious.com/photos/5988e3458e3ab375fe3c0caf/1:1/w_3607,h_3607,c_limit/How-to-Make-Chicken-Alfredo-Pasta-hero-02082017.jpg" }
];

// Initialize cart array
let cart = [];

// Function to add items to cart
function addToCart(name, price) {
    // Check if user is logged in
    if (!auth.currentUser) {
        alert('Please login to add items to cart');
        return;
    }

    const item = {
        name: name,
        price: price,
        quantity: 1,
        timestamp: new Date().getTime()
    };

    // Add to local cart array
    cart.push(item);

    // Update cart UI
    updateCartUI();

    // Save to Firebase
    saveCartToFirebase();
}

// Function to update cart UI
function updateCartUI() {
    const cartIcon = document.querySelector('.fa-cart-shopping');
    if (cartIcon) {
        if (cart.length > 0) {
            // Create or update cart counter
            let counter = cartIcon.parentElement.querySelector('.cart-counter');
            if (!counter) {
                counter = document.createElement('span');
                counter.className = 'cart-counter';
                cartIcon.parentElement.appendChild(counter);
            }
            counter.textContent = cart.length;
        } else {
            // Remove counter if cart is empty
            const counter = cartIcon.parentElement.querySelector('.cart-counter');
            if (counter) {
                counter.remove();
            }
        }
    }
}

// Function to save cart to Firebase
function saveCartToFirebase() {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    db.collection('carts').doc(userId).set({
        items: cart,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log('Cart saved to Firebase');
    })
    .catch((error) => {
        console.error('Error saving cart:', error);
        alert('Failed to save cart. Please try again.');
    });
}

// Function to load cart from Firebase
function loadCartFromFirebase() {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    db.collection('carts').doc(userId).get()
        .then((doc) => {
            if (doc.exists()) {
                cart = doc.data().items || [];
                updateCartUI();
            }
        })
        .catch((error) => {
            console.error('Error loading cart:', error);
        });
}

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, load their cart
        loadCartFromFirebase();
    } else {
        // User is signed out, clear cart
        cart = [];
        updateCartUI();
    }
});

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const menuItems = document.querySelectorAll('.menu-container .item');
            
            menuItems.forEach(item => {
                const itemName = item.querySelector('h3').textContent.toLowerCase();
                if (itemName.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
});

// Cart page functionality
function incrementQty(element) {
    const itemElement = element.closest('.item');
    const itemName = itemElement.querySelector('h3').textContent;
    const input = itemElement.querySelector('.qty-in');
    let qty = parseInt(input.value) || 0;
    qty += 1;
    input.value = qty;

    const item = cart.find(i => i.name === itemName);
    if (item) {
        item.quantity = qty;
        saveCartToFirebase();
        updateTotalItems();
        updateTotalPrice();
    }
}

function decrementQty(element) {
    const itemElement = element.closest('.item');
    const itemName = itemElement.querySelector('h3').textContent;
    const input = itemElement.querySelector('.qty-in');
    let qty = parseInt(input.value) || 0;
    qty -= 1;

    if (qty < 1) {
        // Remove item if quantity drops to 0
        cart = cart.filter(i => i.name !== itemName);
    } else {
        input.value = qty;
        const item = cart.find(i => i.name === itemName);
        if (item) item.quantity = qty;
    }

    saveCartToFirebase();
    displayCart();
}

function displayCart() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty.</p>';
    } else {
        cart.forEach(item => {
            const cartItem = `
                <div class="item">
                    <img src="${menuItems.find(mi => mi.name === item.name)?.image || ''}" alt="${item.name}">
                    <div class="text">
                        <h3>${item.name}</h3>
                        <p>$${item.price.toFixed(2)}</p>
                    </div>
                    <div class="Qty">
                        <h4>Qty:</h4>
                        <div class="minus">
                            <i class="fa-solid fa-minus" onclick="decrementQty(this)"></i>
                        </div>
                        <div class="Qty-in">
                            <input type="text" class="qty-in" value="${item.quantity}" readonly>
                        </div>
                        <div class="plus">
                            <i class="fa-solid fa-plus" onclick="incrementQty(this)"></i>
                        </div>
                    </div>
                </div>
            `;
            cartContainer.innerHTML += cartItem;
        });
    }

    updateTotalItems();
    updateTotalPrice();
}

function updateTotalItems() {
    const totalItemsSpan = document.getElementById('total-items');
    if (!totalItemsSpan) return;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    totalItemsSpan.textContent = totalItems;
}

function updateTotalPrice() {
    const totalPriceSpan = document.getElementById('total-price');
    if (!totalPriceSpan) return;
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPriceSpan.textContent = totalPrice.toFixed(2);
}

// Load cart when page loads (only for cart page)
window.onload = function() {
    if (document.getElementById('cart-items')) {
        displayCart();
    }
};