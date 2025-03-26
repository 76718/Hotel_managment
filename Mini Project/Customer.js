// Firebase Authentication
const auth = firebase.auth();
const db = firebase.firestore();

// Cart functionality
let cart = [];

// Original menu items for filtering and sorting
const menuItems = [
    { name: "Idli", price: 5.99, image: "https://yummy-valley.com/wp-content/uploads/2024/01/millet-idli.webp", pieces: 1 },
    { name: "Dosa", price: 8.99, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXNRkQBAaLqrXbPH1qQncIKl6ZuusEMTndEA&s", pieces: 1 },
    { name: "Pasta", price: 7.49, image: "https://assets.epicurious.com/photos/5988e3458e3ab375fe3c0caf/1:1/w_3607,h_3607,c_limit/How-to-Make-Chicken-Alfredo-Pasta-hero-02082017.jpg", pieces: 1 }
];

// Current sort direction (true for ascending, false for descending)
let sortAscending = true;

// Increment quantity
function incrementQty(element) {
    const input = element.closest('.Qty').querySelector('.qty-input');
    let qty = parseInt(input.value) || 0;
    qty++;
    input.value = qty;
}

// Decrement quantity
function decrementQty(element) {
    const input = element.closest('.Qty').querySelector('.qty-input');
    let qty = parseInt(input.value) || 0;
    qty--;
    if (qty < 0) qty = 0;
    input.value = qty;
}

// Add item to cart
function addToCart(itemName, price) {
    cart.push({ name: itemName, price: price });
    updateCartUI();
    saveCartToFirebase();
}

function updateCartUI() {
    const cartCount = cart.length;
    // Update cart icon or counter if you have one
}

function saveCartToFirebase() {
    if (auth.currentUser) {
        db.collection('carts').doc(auth.currentUser.uid).set({
            items: cart,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// Search functionality
document.getElementById('search-input').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const menuItems = document.querySelectorAll('.item');
    
    menuItems.forEach(item => {
        const itemName = item.querySelector('h3').textContent.toLowerCase();
        if (itemName.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

// Login functionality
function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Logged in successfully');
            // Redirect or update UI
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        });
}

// Sign up functionality
function signUp(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Signed up successfully');
            // Create user profile in Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                role: 'customer',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .catch((error) => {
            console.error('Sign up error:', error);
            alert('Sign up failed: ' + error.message);
        });
}

// Track order functionality
function trackOrder(orderId) {
    if (auth.currentUser) {
        db.collection('orders').doc(orderId).get()
            .then((doc) => {
                if (doc.exists) {
                    const orderData = doc.data();
                    // Update UI with order status
                    console.log('Order status:', orderData.status);
                } else {
                    console.log('Order not found');
                }
            })
            .catch((error) => {
                console.error('Error tracking order:', error);
            });
    }
}

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.email);
        // Load user's cart from Firebase
        loadUserCart();
    } else {
        // User is signed out
        console.log('User is signed out');
        cart = [];
        updateCartUI();
    }
});

function loadUserCart() {
    if (auth.currentUser) {
        db.collection('carts').doc(auth.currentUser.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    cart = doc.data().items || [];
                    updateCartUI();
                }
            })
            .catch((error) => {
                console.error('Error loading cart:', error);
            });
    }
}

// Filter items based on search input
function filterItems() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const filteredItems = menuItems.filter(item => item.name.toLowerCase().includes(searchInput));
    renderMenu(filteredItems);
}

// Sort items by price
function sortItems() {
    const sortedItems = [...menuItems].sort((a, b) => {
        return sortAscending ? a.price - b.price : b.price - a.price;
    });
    sortAscending = !sortAscending; // Toggle sort direction
    renderMenu(sortedItems);
}

// Render menu items
function renderMenu(items) {
    const menuContainer = document.getElementById('menu-container');
    menuContainer.innerHTML = '';

    items.forEach(item => {
        const menuItem = `
            <div class="item">
                <img src="${item.image}" alt="${item.name}">
                <div class="text">
                    <h3>${item.name}</h3>
                    <p>$${item.price.toFixed(2)}</p>
                    <h5>No.of Pcs: ${item.pieces}</h5>
                    <div class="Qty">
                        <h4>Qty:</h4>
                        <div class="minus">
                            <i class="fa-solid fa-minus" onclick="decrementQty(this)"></i>
                        </div>
                        <div class="Qty-in">
                            <input type="text" class="qty-input" value="0" readonly>
                        </div>
                        <div class="plus">
                            <i class="fa-solid fa-plus" onclick="incrementQty(this)"></i>
                        </div>
                    </div>
                    <button onclick="addToCart('${item.name}', ${item.price})">Add to Cart</button>
                </div>
            </div>
        `;
        menuContainer.innerHTML += menuItem;
    });
}