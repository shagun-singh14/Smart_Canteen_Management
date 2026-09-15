// Automated Database Setup Script for MySQL
const { initDatabase } = require('./db');
require('dotenv').config();

async function run() {
    console.log('--- Initializing Smart Canteen Database in MySQL ---');
    const pwd = process.argv[2] || process.env.DB_PASSWORD || '';
    const user = process.argv[3] || process.env.DB_USER || 'root';

    console.log(`Connecting as '${user}'...`);
    const res = await initDatabase({ password: pwd, user });

    if (res.success) {
        console.log('🎉 SUCCESS: Database schema, seed data, triggers, views, and procedures configured in MySQL!');
        process.exit(0);
    } else {
        console.error(`❌ Setup note: ${res.error}`);
        console.log('You can provide your MySQL password via: node server/setup-db.js <your_password>');
        process.exit(1);
    }
}

run();
