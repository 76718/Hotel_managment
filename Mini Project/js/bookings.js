// Bookings management functionality
let currentBookings = [];

// Function to load bookings from Firebase with real-time updates
function loadBookings() {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) {
        console.error('Bookings list element not found');
        return;
    }

    bookingsList.innerHTML = '<div class="loading">Loading bookings...</div>';

    // Set up real-time listener for bookings collection
    db.collection('bookings')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            currentBookings = [];
            
            if (snapshot.empty) {
                bookingsList.innerHTML = '<div class="no-data">No bookings found</div>';
                return;
            }

            snapshot.forEach(doc => {
                const bookingData = doc.data();
                console.log('Booking data:', bookingData); // Debug log
                
                // Add booking with null checks and default values
                currentBookings.push({
                    id: doc.id,
                    customerName: bookingData.customerName || 'N/A',
                    customerEmail: bookingData.customerEmail || 'N/A',
                    customerPhone: bookingData.customerPhone || 'N/A',
                    roomType: bookingData.roomType || 'Standard',
                    checkInDate: bookingData.checkInDate ? new Date(bookingData.checkInDate) : new Date(),
                    checkOutDate: bookingData.checkOutDate ? new Date(bookingData.checkOutDate) : new Date(),
                    guests: bookingData.guests || 1,
                    status: bookingData.status || 'pending',
                    totalPrice: bookingData.totalPrice || 0,
                    createdAt: bookingData.createdAt ? bookingData.createdAt.toDate() : new Date(),
                    specialRequests: bookingData.specialRequests || 'None'
                });
            });

            console.log('Loaded bookings:', currentBookings); // Debug log
            displayBookings();
        }, (error) => {
            console.error('Error loading bookings:', error);
            bookingsList.innerHTML = '<div class="error">Failed to load bookings. Please try again.</div>';
        });
}

// Function to display bookings
function displayBookings() {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    
    if (currentBookings.length === 0) {
        bookingsList.innerHTML = '<div class="no-data">No bookings found</div>';
        return;
    }

    bookingsList.innerHTML = currentBookings.map(booking => {
        // Format dates and add default values
        const checkInDate = booking.checkInDate ? booking.checkInDate.toLocaleDateString() : 'N/A';
        const checkOutDate = booking.checkOutDate ? booking.checkOutDate.toLocaleDateString() : 'N/A';
        const createdDate = booking.createdAt ? booking.createdAt.toLocaleString() : 'N/A';
        const statusClass = `status-${booking.status.toLowerCase()}`;
        
        return `
            <div class="booking-card">
                <div class="booking-header">
                    <div class="booking-info">
                        <span class="booking-id">Booking #${booking.id.substring(0, 8)}</span>
                        <span class="booking-date">Created: ${createdDate}</span>
                    </div>
                    <span class="booking-status ${statusClass}">${booking.status}</span>
                </div>
                <div class="customer-info">
                    <div class="customer-name">Guest: ${booking.customerName}</div>
                    <div class="customer-contact">Email: ${booking.customerEmail}</div>
                    <div class="customer-contact">Phone: ${booking.customerPhone}</div>
                </div>
                <div class="booking-details">
                    <div class="booking-item">
                        <div class="item-details">
                            <div class="item-name">Room Type: ${booking.roomType}</div>
                            <div class="item-dates">Check-in: ${checkInDate}</div>
                            <div class="item-dates">Check-out: ${checkOutDate}</div>
                            <div class="item-guests">Guests: ${booking.guests}</div>
                            <div class="item-price">Total: ₹${parseFloat(booking.totalPrice).toFixed(2)}</div>
                        </div>
                    </div>
                    ${booking.specialRequests !== 'None' ? 
                      `<div class="special-requests">
                          <div class="request-title">Special Requests:</div>
                          <div class="request-text">${booking.specialRequests}</div>
                       </div>` : ''}
                </div>
                <div class="booking-footer">
                    <div class="booking-actions">
                        <button class="action-btn update-status-btn" onclick="updateBookingStatus('${booking.id}', '${booking.status}')">
                            Update Status
                        </button>
                        <button class="action-btn edit-btn" onclick="editBooking('${booking.id}')">
                            Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Function to update booking status
function updateBookingStatus(bookingId, currentStatus) {
    if (!bookingId) {
        showError('Invalid booking ID');
        return;
    }

    const statuses = ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];
    const currentIndex = statuses.indexOf(currentStatus.toLowerCase());
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    db.collection('bookings').doc(bookingId).update({
        status: nextStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showSuccess(`Booking status updated to ${nextStatus}`);
        // No need to call loadBookings() as the real-time listener will update automatically
    })
    .catch(error => {
        console.error('Error updating booking status:', error);
        showError('Failed to update booking status');
    });
}

// Function to edit booking (opens edit modal)
function editBooking(bookingId) {
    // Find the booking in the current bookings array
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) {
        showError('Booking not found');
        return;
    }

    // Populate the edit form with booking data
    const editModal = document.getElementById('editBookingModal');
    if (!editModal) {
        console.error('Edit booking modal not found');
        return;
    }

    document.getElementById('editBookingId').value = booking.id;
    document.getElementById('editCustomerName').value = booking.customerName;
    document.getElementById('editCustomerEmail').value = booking.customerEmail;
    document.getElementById('editCustomerPhone').value = booking.customerPhone;
    document.getElementById('editRoomType').value = booking.roomType;
    
    // Format dates for input fields (YYYY-MM-DD)
    if (booking.checkInDate) {
        const checkInDate = booking.checkInDate.toISOString().split('T')[0];
        document.getElementById('editCheckInDate').value = checkInDate;
    }
    
    if (booking.checkOutDate) {
        const checkOutDate = booking.checkOutDate.toISOString().split('T')[0];
        document.getElementById('editCheckOutDate').value = checkOutDate;
    }
    
    document.getElementById('editGuests').value = booking.guests;
    document.getElementById('editStatus').value = booking.status;
    document.getElementById('editTotalPrice').value = booking.totalPrice;
    document.getElementById('editSpecialRequests').value = booking.specialRequests;

    // Show the modal
    editModal.style.display = 'block';
}

// Function to save edited booking
function saveBooking(event) {
    event.preventDefault();
    
    const bookingId = document.getElementById('editBookingId').value;
    const customerName = document.getElementById('editCustomerName').value;
    const customerEmail = document.getElementById('editCustomerEmail').value;
    const customerPhone = document.getElementById('editCustomerPhone').value;
    const roomType = document.getElementById('editRoomType').value;
    const checkInDate = document.getElementById('editCheckInDate').value;
    const checkOutDate = document.getElementById('editCheckOutDate').value;
    const guests = parseInt(document.getElementById('editGuests').value);
    const status = document.getElementById('editStatus').value;
    const totalPrice = parseFloat(document.getElementById('editTotalPrice').value);
    const specialRequests = document.getElementById('editSpecialRequests').value;

    if (!customerName || !customerEmail || !checkInDate || !checkOutDate) {
        showError('Please fill in all required fields');
        return;
    }

    // Update booking in Firestore
    db.collection('bookings').doc(bookingId).update({
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        roomType: roomType,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        guests: guests,
        status: status,
        totalPrice: totalPrice,
        specialRequests: specialRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showSuccess('Booking updated successfully');
        document.getElementById('editBookingModal').style.display = 'none';
        // No need to call loadBookings() as the real-time listener will update automatically
    })
    .catch(error => {
        console.error('Error updating booking:', error);
        showError('Failed to update booking');
    });
}

// Filter bookings by status
function filterBookingsByStatus(status) {
    document.querySelectorAll('.booking-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${status}`).classList.add('active');
    
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    
    if (status === 'all') {
        document.querySelectorAll('.booking-card').forEach(card => {
            card.style.display = 'block';
        });
    } else {
        document.querySelectorAll('.booking-card').forEach(card => {
            const cardStatus = card.querySelector('.booking-status').textContent.toLowerCase();
            card.style.display = cardStatus === status ? 'block' : 'none';
        });
    }
}

// Search bookings by customer name, email, or booking ID
function searchBookings(query) {
    const searchQuery = query.toLowerCase().trim();
    document.querySelectorAll('.booking-card').forEach(card => {
        const customerName = card.querySelector('.customer-name').textContent.toLowerCase();
        const customerEmail = card.querySelector('.customer-contact').textContent.toLowerCase();
        const bookingId = card.querySelector('.booking-id').textContent.toLowerCase();
        
        if (customerName.includes(searchQuery) || 
            customerEmail.includes(searchQuery) || 
            bookingId.includes(searchQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize bookings when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the bookings page
    if (document.getElementById('bookingsList')) {
        loadBookings();
        
        // Set up search functionality
        const searchInput = document.getElementById('bookingSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                searchBookings(this.value);
            });
        }
        
        // Set up form submission for editing bookings
        const editForm = document.getElementById('editBookingForm');
        if (editForm) {
            editForm.addEventListener('submit', saveBooking);
        }
    }
}); 