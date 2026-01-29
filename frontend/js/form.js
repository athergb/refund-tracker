// frontend/js/form.js - SQLite Version
const API_URL = 'http://localhost:5000/api';

document.getElementById('refundForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const ticketData = {
        pnr: formData.get('pnr'),
        passengerName: formData.get('passengerName'),
        travelDate: formData.get('travelDate'),
        inboundDate: formData.get('inboundDate'),
        expiryDate: formData.get('expiryDate'),
        vendor: formData.get('vendor'),
        amount: parseFloat(formData.get('amount') || 0),
        remarks: formData.get('remarks'),
        refundType: formData.get('refundType') || 'ONLY TAX',
        sector: formData.get('sector') || '',
        ticketNo: formData.get('ticketNo') || '',
        airline: formData.get('airline') || '',
        agentName: formData.get('agentName') || '',
        refundApplyDate: formData.get('refundApplyDate') || new Date().toISOString().split('T')[0]
    };
    
    try {
        // Save to SQLite database
        const response = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ticketData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('✅ Ticket saved to database!');
            console.log('Saved to SQLite:', result.ticket);
            e.target.reset();
            
            // Auto-generate next PNR? (optional)
            // document.getElementById('pnr').value = generatePNR();
        } else {
            throw new Error(result.error || 'Failed to save ticket');
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // Fallback to localStorage
        alert('⚠️ Database error. Saving locally as backup.');
        saveToLocalStorage(ticketData);
        e.target.reset();
    }
});

// Local backup function
function saveToLocalStorage(ticket) {
    let tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    tickets.push({
        ...ticket,
        dateAdded: new Date().toISOString()
    });
    localStorage.setItem('refundTickets', JSON.stringify(tickets));
}

// Generate auto PNR (optional)
function generatePNR() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pnr = '';
    for (let i = 0; i < 6; i++) {
        pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
}

// Load expiring tickets count on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/tickets/expiring/soon`);
        if (response.ok) {
            const tickets = await response.json();
            if (tickets.length > 0) {
                showNotification(`⚠️ ${tickets.length} tickets expiring soon!`);
            }
        }
    } catch (error) {
        console.log('Could not check expiring tickets');
    }
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b6b;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        font-family: Arial, sans-serif;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <strong>⚠️ Alert</strong>
        <p style="margin: 5px 0 0 0;">${message}</p>
        <button onclick="this.parentElement.remove()" style="
            position: absolute;
            top: 5px;
            right: 10px;
            background: transparent;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        ">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}
