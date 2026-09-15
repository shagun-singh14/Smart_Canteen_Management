const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanStaff() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Delete Ramesh, Suresh, Priya - keep only Shagun Singh
    const [result] = await conn.query("DELETE FROM kitchen_staff WHERE email != 'shagun.24bcy10379@vitbhopal.ac.in';");
    console.log(`✓ Deleted ${result.affectedRows} other kitchen staff member(s).`);

    const [remaining] = await conn.query("SELECT * FROM kitchen_staff;");
    console.log("Current Kitchen Staff in MySQL:", remaining);

    await conn.end();
}

cleanStaff().catch(console.error);
