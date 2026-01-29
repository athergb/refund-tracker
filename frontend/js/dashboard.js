// frontend/js/dashboard.js - SQLite Version
const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to load from database:', error);
        loadFromLocalStorage();
    }
    
    // Check for expiries every 30 seconds
    setInterval(checkExpiries, 30000);
});

async function loadDashboardData() {
    // Load statistics
    const statsResponse = await fetch(`${API_URL}/statistics`);
    const stats = await statsResponse.json();
    
    // Update stats
    document.getElementById('totalTickets').textContent = stats.totalTickets || 0;
    document.getElementById('expiringCount').textContent = stats.expiringSoon || 0;
    document.getElementById('totalAmount').textContent = 
        parseFloat(stats.totalAmount || 0).toLocaleString();
    
    // Load tickets
    const ticketsResponse = await fetch(`${API_URL}/tickets`);
    const tickets = await ticketsResponse.json();
    
    // Populate table
    populateTable(tickets);
}

function loadFromLocalStorage() {
    const tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    
    // Calculate stats
    const totalTickets = tickets.length;
    const expiringCount = tickets.filter(ticket => isExpiringSoon(ticket.expiryDate)).length;
    const totalAmount = tickets.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    // Update UI
    document.getElementById('totalTickets').textContent = totalTickets;
    document.getElementById('expiringCount').textContent = expiringCount;
    document.getElementById('totalAmount').textContent = totalAmount.toLocaleString();
    
    populateTable(tickets);
}

function populateTable(tickets) {
    const tbody = document.getElementById('ticketsBody');
    tbody.innerHTML = '';
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        
        const expiryDate = ticket.expiry_date || ticket.expiryDate;
        const passengerName = ticket.passenger_name || ticket.passengerName;
        const amount = ticket.ven_amount || ticket.amount || 0;
        const status = ticket.status || 'pending';
        
        const daysLeft = getDaysLeft(expiryDate);
        let expiryClass = '';
        
        if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) {
            expiryClass = 'expiring';
        }
        
        row.innerHTML = `
            <td>${ticket.pnr}</td>
            <td>${passengerName}</td>
            <td class="${expiryClass}">${expiryDate || 'N/A'} ${daysLeft !== null && daysLeft <= 7 ? `(${daysLeft}d)` : ''}</td>
            <td>${ticket.vendor || 'N/A'}</td>
            <td>${parseFloat(amount).toLocaleString()}</td>
            <td>
                <span class="status-badge ${status === 'refunded' ? 'status-refunded' : 'status-pending'}">
                    ${status.toUpperCase()}
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function getDaysLeft(expiryDate) {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(expiryDate) {
    const daysLeft = getDaysLeft(expiryDate);
    return daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
}

async function checkExpiries() {
    try {
        const response = await fetch(`${API_URL}/tickets/expiring/soon`);
        if (response.ok) {
            const tickets = await response.json();
            if (tickets.length > 0) {
                showNotification(`${tickets.length} tickets expiring soon!`);
            }
        }
    } catch (error) {
        console.log('Could not check expiries');
    }
}

async function exportToExcel() {
    try {
        const response = await fetch(`${API_URL}/export/tickets`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'refund_tickets.csv';
            a.click();
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.log('Using localStorage export');
        exportFromLocalStorage();
    }
}

function exportFromLocalStorage() {
    const tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    
    let csv = 'PNR,Passenger,Travel Date,Expiry,Vendor,Amount,Remarks\n';
    
    tickets.forEach(ticket => {
        csv += `"${ticket.pnr}","${ticket.passengerName}","${ticket.travelDate}","${ticket.expiryDate}","${ticket.vendor}","${ticket.amount}","${ticket.remarks}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refund_tickets_backup.csv';
    a.click();
}

function showNotification(message) {
    // Same as in form.js
    console.log('Notification:', message);
    // You can implement a better notification system
}

// Add CSS for status badges
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
    }
    .status-refunded {
        background: #d4edda;
        color: #155724;
    }
    .status-pending {
        background: #fff3cd;
        color: #856404;
    }
    .expiring {
        color: #dc3545;
        font-weight: bold;
    }
`;
document.head.appendChild(style);
