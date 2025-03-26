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

// Function to create owner account
async function createOwnerAccount(email, password) {
    try {
        // Create user in Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            role: 'owner',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Owner account created successfully!');
        return userCredential.user;
    } catch (error) {
        console.error('Error creating owner account:', error);
        throw error;
    }
}

// Example usage:
// createOwnerAccount('owner@example.com', 'your-password')
//     .then(user => console.log('Owner created:', user))
//     .catch(error => console.error('Error:', error)); 