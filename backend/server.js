// backend/server.js - SQLite Version
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to SQLite database
const dbPath = path.join(__dirname, '../database/refund.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// ========== API ENDPOINTS ==========

// 1. GET all tickets
app.get('/api/tickets', (req, res) => {
    const sql = 'SELECT * FROM tickets ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching tickets:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 2. GET single ticket by ID
app.get('/api/tickets/:id', (req, res) => {
    const sql = 'SELECT * FROM tickets WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(row);
    });
});

// 3. POST create new ticket
app.post('/api/tickets', (req, res) => {
    const {
        pnr, passengerName, travelDate, inboundDate, expiryDate,
        vendor, amount, remarks, refundType, sector, ticketNo,
        airline, agentName, refundApplyDate, venAmount, revToClient, earning
    } = req.body;

    // First, get next SR number
    db.get('SELECT COALESCE(MAX(sr_no), 0) + 1 as next_sr FROM tickets', [], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const srNo = result.next_sr;
        const sql = `
            INSERT INTO tickets (
                sr_no, pnr, passenger_name, travel_date, inbound_date, expiry_date,
                vendor, ven_amount, remarks, refund_type, sector, ticket_no,
                airline, agent_name, refund_apply_date, rev_to_client, earning
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            srNo, pnr, passengerName, travelDate, inboundDate, expiryDate,
            vendor, amount || venAmount, remarks, refundType, sector, ticketNo,
            airline, agentName, refundApplyDate, revToClient, earning
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error saving ticket:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Get the inserted ticket
            db.get('SELECT * FROM tickets WHERE id = ?', [this.lastID], (err, ticket) => {
                res.status(201).json({
                    message: 'Ticket saved successfully',
                    ticket: ticket
                });
            });
        });
    });
});

// 4. PUT update ticket
app.put('/api/tickets/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE tickets SET ${setClause} WHERE id = ?`;
    
    db.run(sql, [...values, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Get updated ticket
        db.get('SELECT * FROM tickets WHERE id = ?', [id], (err, ticket) => {
            res.json({
                message: 'Ticket updated',
                ticket: ticket
            });
        });
    });
});

// 5. DELETE ticket
app.delete('/api/tickets/:id', (req, res) => {
    const sql = 'DELETE FROM tickets WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Ticket deleted' });
    });
});

// 6. GET statistics
app.get('/api/statistics', (req, res) => {
    const queries = {
        totalTickets: 'SELECT COUNT(*) as count FROM tickets',
        expiringSoon: `SELECT COUNT(*) as count FROM tickets 
                      WHERE expiry_date BETWEEN date('now') AND date('now', '+7 days') 
                      AND status != 'refunded'`,
        totalAmount: 'SELECT COALESCE(SUM(ven_amount), 0) as total FROM tickets',
        byVendor: 'SELECT vendor, COUNT(*) as count FROM tickets GROUP BY vendor',
        byStatus: 'SELECT status, COUNT(*) as count FROM tickets GROUP BY status'
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, row) => {
            if (err) {
                console.error(`Error in ${key}:`, err);
            } else {
                results[key] = key.includes('Amount') ? parseFloat(row.total || 0) : 
                              key.includes('count') ? parseInt(row.count || 0) : row;
            }
            
            completed++;
            if (completed === total) {
                res.json(results);
            }
        });
    });
});

// 7. GET expiring tickets
app.get('/api/tickets/expiring/soon', (req, res) => {
    const sql = `
        SELECT * FROM tickets 
        WHERE expiry_date BETWEEN date('now') AND date('now', '+7 days')
        AND status != 'refunded'
        ORDER BY expiry_date ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 8. Export to CSV
app.get('/api/export/tickets', (req, res) => {
    db.all('SELECT * FROM tickets', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Convert to CSV
        const headers = [
            'QFC - Refund Tickets Report',
            `Generated: ${new Date().toLocaleDateString()}`,
            '', // Empty line
            'SR NO', 'PNR', 'PASSENGER NAME', 'TRAVEL DATE', 'INBOUND DATE',
            'EXPIRY DATE', 'REFUND TYPE', 'SECTOR', 'TICKET NO', 'AIRLINE',
            'AGENT NAME', 'VENDOR', 'REFUND APPLY DATE', 'REMARKS',
            'VEN AMOUNT', 'REV TO CLIENT', 'EARNING', 'STATUS', 'CREATED AT'
        ];
        
         const csvRows = rows.map(ticket => [
            ticket.sr_no,
            `"${ticket.pnr}"`,
            `"${ticket.passenger_name}"`,
            ticket.travel_date,
            ticket.inbound_date,
            ticket.expiry_date || '',
            ticket.refund_type || '',
            `"${ticket.sector || ''}"`,
            ticket.ticket_no || '',
            ticket.airline || '',
            `"${ticket.agent_name || ''}"`,
            ticket.vendor || '',
            ticket.refund_apply_date || '',
            `"${ticket.remarks || ''}"`,
            ticket.ven_amount || '0',
            ticket.rev_to_client || '0',
            ticket.earning || '0',
            ticket.status || 'pending',
            ticket.created_at || ''
        ]);

        const csv = [headers, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="QFC_Refund_Tickets_Export.csv"');
        res.send(csv);
    });
});

// 9. Health check
app.get('/api/health', (req, res) => {
    db.get('SELECT 1 as status', [], (err) => {
        if (err) {
            return res.status(500).json({ 
                status: 'ERROR', 
                database: 'Disconnected',
                error: err.message 
            });
        }
        res.json({ 
            status: 'OK',
            database: 'Connected',
            timestamp: new Date().toISOString(),
            dataFile: 'database/refund.db'
        });
    });
});

// 10. Search tickets
app.get('/api/tickets/search/:query', (req, res) => {
    const query = `%${req.params.query}%`;
    const sql = `
        SELECT * FROM tickets 
        WHERE pnr LIKE ? OR passenger_name LIKE ? OR vendor LIKE ?
        ORDER BY created_at DESC
    `;
    
    db.all(sql, [query, query, query], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`🗄️ Database: ${dbPath}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});
