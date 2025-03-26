# Hotel Management System

A web-based hotel management system with customer and owner interfaces, built using HTML, CSS, JavaScript, and Firebase.

## Features

### Customer Interface
- User authentication (signup/login)
- Menu browsing with search functionality
- Shopping cart management
- Order placement and tracking
- Real-time order status updates

### Owner Interface
- Secure authentication
- Menu management (add/edit/remove items)
- Order management
- Inventory tracking
- Real-time order notifications

## Setup Instructions

1. Clone the repository
2. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
3. Login to Firebase:
   ```bash
   firebase login
   ```
4. Initialize Firebase project:
   ```bash
   firebase init
   ```
5. Create an owner account:
   - Open the browser console
   - Run: `createOwnerAccount('owner@example.com', 'password')`

## Project Structure
```
├── Customer.html      # Customer interface
├── Customer.css       # Customer styles
├── Customer.js        # Customer functionality
├── Order.html         # Shopping cart
├── Order.css          # Cart styles
├── Order.js           # Cart functionality
├── Owner1/            # Owner interface
│   ├── Owner.html
│   ├── Owner.css
│   └── Owner.js
├── init-owner.js      # Owner account initialization
└── firebase/          # Firebase configuration
    ├── firebase.json
    ├── firestore.rules
    └── firestore.indexes.json
```

## Firebase Collections
- `users`: User profiles and roles
- `carts`: Shopping carts for each user
- `orders`: Order records
- `menu`: Menu items
- `inventory`: Inventory management

## Security Rules
- Users can only access their own cart and orders
- Only owners can modify menu items and inventory
- Authentication required for all operations

## Technologies Used
- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase Authentication
- Firebase Firestore
- Font Awesome Icons

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge 