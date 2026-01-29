const express = require('express');
const router = express.Router();

// This will be connected to database later
let tickets = [];

// GET all tickets
router.get('/', (req, res) => {
    res.json(tickets);
});

// POST new ticket
router.post('/', (req, res) => {
    const newTicket = {
        id: Date.now(),
        ...req.body,
        created: new Date().toISOString()
    };
    tickets.push(newTicket);
    res.status(201).json(newTicket);
});

module.exports = router;
