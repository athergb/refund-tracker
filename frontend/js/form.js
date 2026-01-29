document.getElementById('refundForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const ticketData = {
        pnr: document.getElementById('pnr').value,
        passengerName: document.getElementById('passengerName').value,
        travelDate: document.getElementById('travelDate').value,
        inboundDate: document.getElementById('inboundDate').value,
        expiryDate: document.getElementById('expiryDate').value,
        vendor: document.getElementById('vendor').value,
        amount: document.getElementById('amount').value,
        remarks: document.getElementById('remarks').value,
        dateAdded: new Date().toISOString()
    };
    
    // Save to localStorage (temporary storage)
    saveTicket(ticketData);
    
    alert('✅ Ticket saved successfully!');
    e.target.reset();
});

function saveTicket(ticket) {
    // Get existing tickets
    let tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    
    // Add new ticket
    tickets.push(ticket);
    
    // Save back to localStorage
    localStorage.setItem('refundTickets', JSON.stringify(tickets));
    
    // Send to server if backend is running
    sendToBackend(ticket);
}

function sendToBackend(ticket) {
    // This will send data to your backend server
    fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticket)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Saved to backend:', data);
    })
    .catch(error => {
        console.log('Backend not running, saved locally only');
    });
}
