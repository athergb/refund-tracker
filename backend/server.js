// backend/server.js - Supabase Version
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Connected to Supabase Database');

// ========== API ENDPOINTS ==========

// 1. GET all tickets
app.get('/api/tickets', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. POST create new ticket
app.post('/api/tickets', async (req, res) => {
    try {
        const {
            pnr, passengerName, travelDate, inboundDate, expiryDate,
            vendor, venAmount, remarks, refundType, sector, ticketNo,
            airline, agentName, refundApplyDate, revToClient, earning
        } = req.body;

        // Get next SR number
        const { data: maxData, error: maxError } = await supabase
            .from('tickets')
            .select('sr_no')
            .order('sr_no', { ascending: false })
            .limit(1);
        
        if (maxError) throw maxError;
        const nextSrNo = maxData.length > 0 ? maxData[0].sr_no + 1 : 1;

        // Insert new ticket
        const { data, error } = await supabase
            .from('tickets')
            .insert([{
                sr_no: nextSrNo,
                pnr: pnr,
                passenger_name: passengerName,
                travel_date: travelDate,
                inbound_date: inboundDate,
                expiry_date: expiryDate,
                vendor: vendor,
                ven_amount: venAmount || 0,
                remarks: remarks || '',
                refund_type: refundType || 'ONLY TAX',
                sector: sector || '',
                ticket_no: ticketNo || '',
                airline: airline || '',
                agent_name: agentName || '',
                refund_apply_date: refundApplyDate || new Date().toISOString().split('T')[0],
                rev_to_client: revToClient || 0,
                earning: earning || 0,
                status: 'pending'
            }])
            .select();
        
        if (error) throw error;
        
        res.status(201).json({
            success: true,
            message: 'Ticket saved to Supabase database',
            ticket: data[0]
        });
        
    } catch (error) {
        console.error('Error saving ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. GET statistics
app.get('/api/statistics', async (req, res) => {
    try {
        // Get total tickets
        const { count, error: countError } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true });
        
        if (countError) throw countError;
        
        // Get total amount
        const { data: amountData, error: amountError } = await supabase
            .from('tickets')
            .select('ven_amount');
        
        if (amountError) throw amountError;
        
        const totalAmount = amountData.reduce((sum, ticket) => sum + (ticket.ven_amount || 0), 0);
        
        // Get expiring tickets
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { count: expiringCount, error: expiringError } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .gte('expiry_date', today)
            .lte('expiry_date', nextWeek)
            .neq('status', 'refunded');
        
        if (expiringError) throw expiringError;
        
        res.json({
            totalTickets: count || 0,
            totalAmount: totalAmount,
            expiringSoon: expiringCount || 0
        });
        
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Health check
app.get('/api/health', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        
        res.json({ 
            status: 'OK',
            database: 'Supabase Connected',
            timestamp: new Date().toISOString(),
            environment: process.env.VERCEL ? 'Vercel Production' : 'Local Development'
        });
        
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR',
            database: 'Supabase Disconnected',
            error: error.message 
        });
    }
});

// 5. Export to CSV
app.get('/api/export/tickets', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Create CSV with QFC header
        const headers = [
            'QFC - Refund Tickets Report',
            `Generated: ${new Date().toLocaleDateString()}`,
            '',
            'SR NO', 'PNR', 'PASSENGER NAME', 'TRAVEL DATE', 'INBOUND DATE',
            'EXPIRY DATE', 'REFUND TYPE', 'SECTOR', 'TICKET NO', 'AIRLINE',
            'AGENT NAME', 'VENDOR', 'REFUND APPLY DATE', 'REMARKS',
            'VEN AMOUNT', 'REV TO CLIENT', 'EARNING', 'STATUS', 'CREATED AT'
        ];

        const csvRows = (data || []).map(ticket => [
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

        const csv = [headers.join(','), ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="QFC_Refund_Tickets_Export.csv"');
        res.send(csv);
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Get expiring tickets
app.get('/api/tickets/expiring/soon', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .gte('expiry_date', today)
            .lte('expiry_date', nextWeek)
            .neq('status', 'refunded')
            .order('expiry_date', { ascending: true });
        
        if (error) throw error;
        
        res.json(data || []);
        
    } catch (error) {
        console.error('Error fetching expiring tickets:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server (local only)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Connected to Supabase`);
        console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    });
}

// Export for Vercel
module.exports = app;
