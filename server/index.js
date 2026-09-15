const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDbStatus } = require('./db');
const apiRoutes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount API
app.use('/api', apiRoutes);

// Fallback to index.html for single-page routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Startup Server if run directly (local development)
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`====================================================`);
        console.log(`🍔 SMART CANTEEN MANAGEMENT SYSTEM`);
        console.log(`🌐 Server running at: http://localhost:${PORT}`);
        console.log(`====================================================`);

        // Auto-attempt connecting to MySQL
        await initDatabase();
        const status = getDbStatus();
        console.log(`📊 Mode: ${status.mode}`);
        if (status.error) {
            console.log(`ℹ️ MySQL connection note: ${status.error}`);
        }
    });
} else {
    // When imported by Vercel serverless function
    initDatabase().catch(err => console.warn('DB Init notice:', err.message));
}

module.exports = app;
