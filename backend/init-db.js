// backend/init-db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, '../database/refund.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create table
db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sr_no INTEGER NOT NULL,
        pnr TEXT NOT NULL,
        passenger_name TEXT NOT NULL,
        travel_date TEXT NOT NULL,
        inbound_date TEXT NOT NULL,
        expiry_date TEXT,
        refund_type TEXT,
        sector TEXT,
        ticket_no TEXT,
        airline TEXT,
        agent_name TEXT,
        vendor TEXT,
        refund_apply_date TEXT,
        remarks TEXT,
        ven_amount REAL,
        rev_to_client REAL,
        earning REAL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Error creating table:', err);
    } else {
        console.log('Table created successfully');
    }
});

// Close connection
db.close();
