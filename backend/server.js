const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// In-memory storage (replace with database later)
let tickets = [];

// API Routes
app.get('/api/tickets', (req, res) => {
    res.json(tickets);
});

app.post('/api/tickets', (req, res) => {
    const ticket = {
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    
    tickets.push(ticket);
    res.status(201).json({ message: 'Ticket saved', ticket });
});

app.put('/api/tickets/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = tickets.findIndex(t => t.id === id);
    
    if (index !== -1) {
        tickets[index] = { ...tickets[index], ...req.body };
        res.json({ message: 'Ticket updated', ticket: tickets[index] });
    } else {
        res.status(404).json({ error: 'Ticket not found' });
    }
});

app.delete('/api/tickets/:id', (req, res) => {
    const id = parseInt(req.params.id);
    tickets = tickets.filter(t => t.id !== id);
    res.json({ message: 'Ticket deleted' });
});

// Check expiries endpoint
app.get('/api/expiring', (req, res) => {
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const expiringTickets = tickets.filter(ticket => {
        if (!ticket.expiryDate) return false;
        const expiry = new Date(ticket.expiryDate);
        return expiry <= sevenDaysFromNow && expiry >= today;
    });
    
    res.json({ count: expiringTickets.length, tickets: expiringTickets });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
});
