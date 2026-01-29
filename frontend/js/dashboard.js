document.addEventListener('DOMContentLoaded', function() {
    loadTickets();
    checkExpiries();
});

function loadTickets() {
    const tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    
    // Update statistics
    document.getElementById('totalTickets').textContent = tickets.length;
    
    const expiringCount = tickets.filter(ticket => {
        if (!ticket.expiryDate) return false;
        const expiry = new Date(ticket.expiryDate);
        const today = new Date();
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
    }).length;
    
    document.getElementById('expiringCount').textContent = expiringCount;
    
    const totalAmount = tickets.reduce((sum, ticket) => {
        return sum + (parseFloat(ticket.amount) || 0);
    }, 0);
    
    document.getElementById('totalAmount').textContent = totalAmount.toLocaleString();
    
    // Populate table
    const tbody = document.getElementById('ticketsBody');
    tbody.innerHTML = '';
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        
        const expiryDate = ticket.expiryDate ? new Date(ticket.expiryDate) : null;
        const today = new Date();
        let expiryClass = '';
        
        if (expiryDate) {
            const diffTime = expiryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7 && diffDays >= 0) {
                expiryClass = 'expiring';
            }
        }
        
        row.innerHTML = `
            <td>${ticket.pnr}</td>
            <td>${ticket.passengerName}</td>
            <td class="${expiryClass}">${ticket.expiryDate || 'N/A'}</td>
            <td>${ticket.vendor}</td>
            <td>${parseFloat(ticket.amount || 0).toLocaleString()}</td>
            <td>${ticket.remarks || 'Pending'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function checkExpiries() {
    const tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    const today = new Date();
    
    const expiringTickets = tickets.filter(ticket => {
        if (!ticket.expiryDate) return false;
        const expiry = new Date(ticket.expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
    });
    
    if (expiringTickets.length > 0) {
        alert(`⚠️ Warning: ${expiringTickets.length} ticket(s) expiring in next 7 days!`);
    }
}

function exportToExcel() {
    const tickets = JSON.parse(localStorage.getItem('refundTickets') || '[]');
    
    // Create CSV content
    let csv = 'PNR,Passenger,Travel Date,Expiry,Vendor,Amount,Remarks\n';
    
    tickets.forEach(ticket => {
        csv += `"${ticket.pnr}","${ticket.passengerName}","${ticket.travelDate}","${ticket.expiryDate}","${ticket.vendor}","${ticket.amount}","${ticket.remarks}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refund_tickets.csv';
    a.click();
}
